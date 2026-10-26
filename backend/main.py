from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import asyncio, subprocess, json, os, uuid, re, ast, sys
import urllib.error, urllib.parse, urllib.request, xml.etree.ElementTree as ET
import html
from openai import APIConnectionError, APIStatusError, AsyncOpenAI

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(BASE_DIR)
VIDEOS_DIR = os.path.join(BASE_DIR, "videos")
SCENES_DIR = os.path.join(BASE_DIR, "scenes")


def resolve_frontend_dir() -> str | None:
    candidates = [
        os.getenv("FRONTEND_DIR"),
        os.path.join(BASE_DIR, "frontend"),
        os.path.join(os.getcwd(), "frontend"),
        os.path.join(PROJECT_ROOT, "frontend"),
        os.path.join(BASE_DIR, "..", "frontend"),
    ]
    seen = set()
    for candidate in candidates:
        if not candidate:
            continue
        path = os.path.abspath(candidate)
        if path in seen:
            continue
        seen.add(path)
        if os.path.isdir(path):
            print(f"Using frontend directory: {path}")
            return path

    checked = ", ".join(sorted(seen))
    try:
        base_contents = os.listdir(BASE_DIR)
    except OSError:
        base_contents = []
    print(
        "Warning: frontend directory not found; static files disabled. "
        f"Checked: {checked}. BASE_DIR={BASE_DIR} contents={base_contents}"
    )
    return None


FRONTEND_DIR = resolve_frontend_dir()


FELCLOUD_ENV_NAMES = {
    "FELCLOUD_API_KEY",
    "FELCLOUD_BASE_URL",
    "FELCLOUD_COMPACT_MODEL",
    "FELCLOUD_MIDSIZE_MODEL",
    "FELCLOUD_VISION_MODEL",
}


def load_felcloud_env() -> None:
    for env_file in (
        os.path.join(BASE_DIR, ".env"),
        os.path.join(BASE_DIR, "frontend", ".env"),
        os.path.join(PROJECT_ROOT, ".env"),
    ):
        if not os.path.isfile(env_file):
            continue
        with open(env_file, encoding="utf-8") as file:
            for line in file:
                entry = line.strip()
                if entry.startswith("export "):
                    entry = entry[7:].lstrip()
                if not entry or entry.startswith("#") or "=" not in entry:
                    continue
                name, value = entry.split("=", 1)
                name = name.strip()
                if name in FELCLOUD_ENV_NAMES and not os.getenv(name, "").strip():
                    os.environ[name] = value.strip().strip("\"'")


load_felcloud_env()

# ── LangGraph (Deep Learn feature) ──
from langgraph.graph import StateGraph, END, START
from typing import Annotated, List, Literal, TypedDict
import operator
import shutil


_felcloud_client = None
_felcloud_client_settings = None
_felcloud_request_semaphore = asyncio.Semaphore(2)


async def felcloud_chat_text(messages: list[dict], *, tier: str = "midsize", max_tokens: int = 1024, temperature: float = 0.7, response_format: dict | None = None) -> str:
    settings = get_felcloud_settings()
    model = settings["compact_model" if tier == "compact" else "midsize_model"]
    if not model:
        raise HTTPException(503, f"Felcloud {tier} model is not configured.")
    try:
        request_options = {
            "model": model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        if response_format is not None:
            request_options["response_format"] = response_format
        async with _felcloud_request_semaphore:
            response = await get_felcloud_client().chat.completions.create(**request_options)
    except APIStatusError as exc:
        print(f"[Felcloud generation] Upstream HTTP {exc.status_code}.")
        raise HTTPException(exc.status_code, "Felcloud rejected the generation request.") from exc
    except APIConnectionError as exc:
        cause = type(exc.__cause__).__name__ if exc.__cause__ else "unknown"
        print(f"[Felcloud generation] Connection failed ({cause}).")
        if cause == "ReadTimeout" and tier == "midsize" and settings["compact_model"] != model:
            print("[Felcloud generation] Falling back to the compact model after a mid-size timeout.")
            return await felcloud_chat_text(
                messages,
                tier="compact",
                max_tokens=max_tokens,
                temperature=temperature,
                response_format=response_format,
            )
        status = 504 if cause == "ReadTimeout" else 502
        message = "Felcloud timed out waiting for the model response." if status == 504 else "Could not connect to the configured Felcloud API."
        raise HTTPException(status, message) from exc
    content = response.choices[0].message.content
    if not isinstance(content, str) or not content.strip():
        raise HTTPException(502, "Felcloud returned an empty response.")
    return re.sub(r"<think[^>]*>[\s\S]*?</think>", "", content, flags=re.IGNORECASE).strip()


def get_felcloud_settings() -> dict[str, str]:
    load_felcloud_env()
    settings = {
        "api_key": os.getenv("FELCLOUD_API_KEY", "").strip(),
        "base_url": os.getenv("FELCLOUD_BASE_URL", "").strip().rstrip("/"),
        "compact_model": os.getenv("FELCLOUD_COMPACT_MODEL", "").strip(),
        "midsize_model": os.getenv("FELCLOUD_MIDSIZE_MODEL", "").strip(),
        "vision_model": os.getenv("FELCLOUD_VISION_MODEL", "").strip(),
    }
    if not settings["api_key"]:
        raise HTTPException(503, "FELCLOUD_API_KEY is not configured on the backend.")
    if not settings["base_url"]:
        raise HTTPException(503, "FELCLOUD_BASE_URL is not configured on the backend.")
    if not settings["base_url"].startswith(("https://", "http://")):
        raise HTTPException(500, "FELCLOUD_BASE_URL must be an absolute HTTP(S) URL.")
    settings["vision_model"] = settings["vision_model"] or settings["compact_model"]
    return settings


def get_felcloud_client() -> AsyncOpenAI:
    global _felcloud_client, _felcloud_client_settings
    settings = get_felcloud_settings()
    client_settings = (settings["api_key"], settings["base_url"])
    if _felcloud_client is None or _felcloud_client_settings != client_settings:
        _felcloud_client = AsyncOpenAI(
            api_key=settings["api_key"],
            base_url=settings["base_url"],
            max_retries=0,
            timeout=60,
        )
        _felcloud_client_settings = client_settings
    return _felcloud_client


def manim_available() -> bool:
    """Return True if Manim module is runnable in current Python env."""
    try:
        result = subprocess.run(
            [sys.executable, "-m", "manim", "--version"],
            capture_output=True,
            text=True,
            timeout=20,
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired, OSError):
        return False


app = FastAPI()
application = app
handler = app

app.add_middleware(CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True)

@app.middleware("http")
async def no_cache_static_assets(request, call_next):
    response = await call_next(request)
    path = request.url.path.lower()
    if (
        path.endswith((".js", ".css", ".html", ".svg", ".json"))
        or path.startswith("/src/")
        or path.startswith("/assets/")
        or path.startswith("/api/config")
        or path.startswith("/llm/")
    ):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
    return response

@app.get("/health")
async def root_health():
    return {"status": "ok"}


# ══════════════════════════════════════════
#  LANGGRAPH — Expert Discussion (deeplearn)
# ══════════════════════════════════════════

EXPERT_SYSTEMS = {
  'expert1': """You are Dr. Arifa, a subject-matter expert.
- Start directly with the topic; do not introduce yourself.
- State the central idea in the opening sentence.
- Give 2–3 complete sentences and respond to the discussion.
- Never narrate yourself or another expert in the third person.""",

  'expert2': """You are Dr. Nafisa, an analytical researcher.
- Start directly with your analysis; do not introduce yourself.
- State the central idea in the opening sentence.
- Give 2–3 complete sentences and respond to the discussion.
- Never narrate yourself or another expert in the third person.""",

  'expert3': """You are Dr. Rakib, a critical questioner.
- Start with a direct challenge or question; do not introduce yourself.
- State the central idea in the opening sentence.
- Give 2–3 complete sentences and respond to the discussion.
- Never narrate yourself or another expert in the third person.""",
}

EXPERT_NAMES = {
  'expert1': 'Dr. Arifa',
  'expert2': 'Dr. Nafisa',
  'expert3': 'Dr. Rakib',
}

EXPERT_MODEL_TIERS = {
  'expert1': 'midsize',
  'expert2': 'midsize',
  'expert3': 'midsize',
}

class DiscussionState(TypedDict):
    topic:       str
    phase:       str
    pdf_context: str
    dialogue:    Annotated[List[dict], operator.add]
    expert_id:   str
    reply:       str



EXPERT_INSTRUCTIONS = {
    'expert1': 'Explain the core concepts, theory, and scientific reasoning, then synthesize them.',
    'expert2': 'Compare perspectives, add a new angle, and build on Dr. Arifa’s analysis.',
    'expert3': 'Challenge existing claims, identify weaknesses, and ask difficult questions.',
}

def build_expert_prompt(state: DiscussionState) -> str:
    transcript = "\n\n".join(f"[{d['name']}]: {d['text']}" for d in state['dialogue'][-12:])
    doc = f"\nSource material:\n{state['pdf_context']}\n" if state.get('pdf_context') else ''
    instruction = EXPERT_INSTRUCTIONS.get(state['expert_id'], '')
    return (
        f"Topic: {state['topic']}\n"
        f"Phase: {state['phase']}\n"
        f"Your role: {instruction}\n"
        f"{doc}"
        f"\nDiscussion:\n{transcript}\n\n"
        f"Respond directly to the topic in 2–3 complete English sentences. Do not introduce yourself."
    )

# ── Nodes ─────────────────────────────────────
def make_expert_node(expert_id: str):
    async def node(state: DiscussionState) -> dict:
        prompt_text = build_expert_prompt(state)
        messages = [
            {"role": "system", "content": EXPERT_SYSTEMS[expert_id]},
            {"role": "user", "content": prompt_text},
        ]
        reply = strip_intro(
            await felcloud_chat_text(messages, tier=EXPERT_MODEL_TIERS[expert_id], max_tokens=400, temperature=0.8),
            expert_id,
        )
        if not reply:
            raise HTTPException(502, f"Felcloud returned an empty response for {expert_id}.")
        return {'reply': reply, 'dialogue': [{'name': EXPERT_NAMES[expert_id], 'text': reply}]}
    return node
# ── Routing ───────────────────────────────────
def route_to_expert(state: DiscussionState) -> str:
    return state['expert_id']

# ── Build & compile graph ─────────────────────
_builder = StateGraph(DiscussionState)
_builder.add_node('expert1', make_expert_node('expert1'))
_builder.add_node('expert2', make_expert_node('expert2'))
_builder.add_node('expert3', make_expert_node('expert3'))
_builder.add_conditional_edges(START, route_to_expert, {
    'expert1': 'expert1',
    'expert2': 'expert2',
    'expert3': 'expert3',
})
_builder.add_edge('expert1', END)
_builder.add_edge('expert2', END)
_builder.add_edge('expert3', END)

discussion_graph = _builder.compile()


os.makedirs(VIDEOS_DIR, exist_ok=True)
os.makedirs(SCENES_DIR, exist_ok=True)
app.mount("/videos", StaticFiles(directory=VIDEOS_DIR), name="videos")

class Prompt(BaseModel):
    prompt: str
    context: str = ""


async def call_llm(messages: list, max_tokens: int = 2500) -> str:
    return await felcloud_chat_text(messages, tier="midsize", max_tokens=min(max_tokens, 4096))


def extract_undefined_names(code: str) -> list[str]:
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return []

    assigned = set()
    used = []

    for node in ast.walk(tree):
        if isinstance(node, ast.Name):
            if isinstance(node.ctx, ast.Store):
                assigned.add(node.id)
            elif isinstance(node.ctx, ast.Load):
                used.append(node.id)
        elif isinstance(node, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
            assigned.add(node.name)
        elif isinstance(node, ast.arguments):
            for arg in node.args + node.posonlyargs + node.kwonlyargs:
                assigned.add(arg.arg)
            if node.vararg:
                assigned.add(node.vararg.arg)
            if node.kwarg:
                assigned.add(node.kwarg.arg)
        elif isinstance(node, ast.For):
            if isinstance(node.target, ast.Name):
                assigned.add(node.target.id)

    safe_globals = {
        'print', 'range', 'len', 'int', 'str', 'float', 'list', 'dict',
        'set', 'tuple', 'bool', 'None', 'True', 'False', 'enumerate',
        'zip', 'map', 'filter', 'isinstance', 'type', 'super',
        'WHITE', 'BLACK', 'RED', 'BLUE', 'GREEN', 'YELLOW',
        'ORANGE', 'PURPLE', 'PINK', 'GRAY', 'GREY', 'TEAL', 'GOLD',
        'UP', 'DOWN', 'LEFT', 'RIGHT', 'IN', 'OUT', 'ORIGIN',
        'PI', 'TAU', 'DEGREES', 'DR', 'DL', 'UR', 'UL',
        'Circle', 'Square', 'Rectangle', 'Triangle', 'Arrow', 'Line',
        'Dot', 'Arc', 'Ellipse', 'Polygon', 'RegularPolygon',
        'Text', 'MathTex', 'Tex', 'MarkupText',
        'VGroup', 'Group', 'AnimationGroup',
        'Create', 'Write', 'FadeIn', 'FadeOut', 'Transform',
        'ReplacementTransform', 'MoveToTarget', 'Indicate',
        'DrawBorderThenFill', 'GrowFromCenter', 'ShrinkToCenter',
        'self', 'MovingCameraScene', 'Scene', 'ThreeDScene',
        'NumberPlane', 'Axes', 'BarChart', 'PolarPlane',
        'Flash', 'Circumscribe', 'ApplyWave', 'config',
        'LinearTransformationScene', 'ZoomedScene',
    }

    undefined = [
        name for name in used
        if name not in assigned and name not in safe_globals
    ]
    return list(set(undefined))


def check_manim_antipatterns(code: str) -> list[str]:
    """Catch known Manim API misuses before render."""
    warnings = []
    if 'self.camera.animate' in code:
        warnings.append("self.camera.animate is invalid — use self.camera.frame.animate instead")
    if '.next_to(self.camera' in code:
        warnings.append("Cannot use self.camera as a positional reference — use a Mobject or ORIGIN")
    if 'self.camera.move_to' in code:
        warnings.append("Use self.camera.frame.move_to() not self.camera.move_to()")
    if re.search(r'\.animate\.next_to\(self\.camera', code):
        warnings.append("Invalid camera reference in animate chain")
    return warnings


async def fix_code_with_llm(code: str, error_msg: str, original_prompt: str) -> str:
    messages = [
        {"role": "system", "content": "Fix broken Manim Community Edition code. Return only raw Python, no markdown. Keep the Scene class inheriting MovingCameraScene and under 65 lines."},
        {"role": "user", "content": f"Fix this code. PROMPT: {original_prompt}\nCODE:\n{code}\nERROR:\n{error_msg}"},
    ]
    fixed = await call_llm(messages, max_tokens=2500)
    fixed = re.sub(r'```python|```', '', fixed).strip()
    fixed = fixed.replace('class Scene(Scene):', 'class Scene(MovingCameraScene):')
    return re.sub(r'(config\.background_color\s*=\s*BLACK)\s*class', r'\1\n\nclass', fixed)


async def sanitize_code(code: str, job_id: str, original_prompt: str) -> str:
    antipatterns = check_manim_antipatterns(code)
    undefined = extract_undefined_names(code)
    if not antipatterns and not undefined:
        return code
    error_msg = "\n".join(antipatterns + ([f"Undefined names: {', '.join(undefined)}"] if undefined else []))
    print(f"[{job_id}] Pre-flight requesting code repair: {error_msg}")
    fixed = await fix_code_with_llm(code, error_msg, original_prompt)
    still_undefined = extract_undefined_names(fixed)
    if still_undefined:
        raise HTTPException(502, f"Felcloud could not repair undefined Manim names: {', '.join(still_undefined)}")
    return fixed


def is_syntax_valid(code: str) -> tuple[bool, str]:
    try:
        ast.parse(code)
        return True, ""
    except SyntaxError as e:
        return False, str(e)


async def generate_manim_code(prompt: str, context: str, simple: bool = False) -> str:
    length_note = "Keep under 40 lines total. Very simple animation only." if simple else "Keep under 60 lines total."
    messages = [
        {"role": "system", "content": f"Generate only executable Manim Community Edition Python, no markdown. Define Scene inheriting MovingCameraScene. Begin with from manim import *. Use config.background_color = BLACK. {length_note} Use Text rather than MathTex or Tex; define all variables before use and end with self.wait(2)."},
        {"role": "user", "content": f"Create a 3Blue1Brown style Manim animation explaining: {prompt}. Context: {context}"},
    ]
    code = await call_llm(messages, max_tokens=2500)
    code = re.sub(r'```python|```', '', code).strip()
    code = code.replace('class Scene(Scene):', 'class Scene(MovingCameraScene):')
    return re.sub(r'(config\.background_color\s*=\s*BLACK)\s*class', r'\1\n\nclass', code)


class TurnRequest(BaseModel):
    topic:       str
    phase:       str
    expert_id:   str
    pdf_context: str = ''
    dialogue:    List[dict] = []

class BiologyVoiceoverRequest(BaseModel):
    model_config = {"protected_namespaces": ()}
    model_name: str = Field(min_length=1, max_length=120)


class PdfTutorMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str = Field(min_length=1, max_length=12000)


class PdfTutorChatRequest(BaseModel):
    model_config = {"protected_namespaces": ()}
    model_tier: str = Field(default="midsize", alias="model_id")
    messages: List[PdfTutorMessage]
    max_tokens: int = Field(default=700, ge=1, le=1200)
    temperature: float = Field(default=0.35, ge=0, le=1)


@app.post("/api/pdf-tutor/chat")
async def pdf_tutor_chat(req: PdfTutorChatRequest):
    if not req.messages or len(req.messages) > 12:
        raise HTTPException(422, "The tutor request must contain between 1 and 12 messages.")
    if sum(len(message.content) for message in req.messages) > 30000:
        raise HTTPException(413, "The tutor context is too large. Please shorten the conversation or PDF question.")
    tier = "compact" if req.model_tier == "compact" else "midsize"
    content = await felcloud_chat_text(
        [{"role": message.role, "content": message.content} for message in req.messages],
        tier=tier, max_tokens=req.max_tokens, temperature=req.temperature,
    )
    return {"content": content}


class PdfTutorSpeechRequest(BaseModel):
    language: Literal["English", "French", "Moroccan Darija", "Arabic"]
    text: str = Field(min_length=1, max_length=5000)


@app.post("/api/pdf-tutor/speech")
async def pdf_tutor_speech(req: PdfTutorSpeechRequest):
    speech_key = os.getenv("AZURE_SPEECH_KEY", "").strip()
    if not speech_key:
        raise HTTPException(503, "Azure speech is not configured.")

    voices = {
        "English": ("en-US", "en-US-JennyNeural"),
        "French": ("fr-FR", "fr-FR-DeniseNeural"),
        "Moroccan Darija": ("ar-MA", "ar-MA-MounaNeural"),
        "Arabic": ("ar-SA", "ar-SA-ZariyahNeural"),
    }
    locale, voice = voices[req.language]
    region = os.getenv("AZURE_SPEECH_REGION", "southeastasia").strip()
    if not re.fullmatch(r"[a-z0-9-]+", region, re.IGNORECASE):
        raise HTTPException(500, "Azure speech region is invalid.")

    ssml = (
        f'<speak version="1.0" xml:lang="{locale}">'
        f'<voice name="{voice}">{html.escape(req.text, quote=False)}</voice>'
        "</speak>"
    )
    speech_request = urllib.request.Request(
        f"https://{region}.tts.speech.microsoft.com/cognitiveservices/v1",
        data=ssml.encode("utf-8"),
        headers={
            "Ocp-Apim-Subscription-Key": speech_key,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        },
        method="POST",
    )

    def request_audio():
        with urllib.request.urlopen(speech_request, timeout=30) as response:
            return response.read()

    try:
        audio = await asyncio.to_thread(request_audio)
    except urllib.error.HTTPError as exc:
        print(f"[PDF tutor speech] Azure returned HTTP {exc.code}.")
        raise HTTPException(502, "Azure could not generate speech audio.") from exc
    except (urllib.error.URLError, TimeoutError, OSError) as exc:
        print(f"[PDF tutor speech] Azure request failed: {type(exc).__name__}.")
        raise HTTPException(502, "Azure speech is temporarily unavailable.") from exc

    if not audio:
        raise HTTPException(502, "Azure returned empty speech audio.")
    return Response(
        content=audio,
        media_type="audio/mpeg",
        headers={"Cache-Control": "no-store"},
    )


@app.post("/biology/voiceover")
@app.post("/api/biology/voiceover")
async def biology_voiceover(req: BiologyVoiceoverRequest):
    model_name = req.model_name.strip()
    if not model_name:
        raise HTTPException(422, "A model name is required.")

    messages = [
        {
            "role": "system",
            "content": (
                "You are a biology teacher writing a spoken explanation for a student. "
                "Return only valid JSON with a segments array of exactly four objects, each containing label and text. "
                "Cover overview, structure, key features, and function. Each text must be one or two concise, "
                "scientifically accurate sentences. Do not include markdown or uncertain numerical claims."
            ),
        },
        {"role": "user", "content": f"Create the four-section voiceover for: {model_name}"},
    ]
    raw = await felcloud_chat_text(
        messages, tier="midsize", max_tokens=700, temperature=0.6,
        response_format={"type": "json_object"},
    )
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(502, "Felcloud returned invalid biology voiceover JSON.") from exc
    segments = data.get("segments") if isinstance(data, dict) else None
    if not isinstance(segments, list) or len(segments) != 4:
        raise HTTPException(502, "Felcloud returned an invalid biology voiceover structure.")
    if any(
        not isinstance(segment, dict)
        or not isinstance(segment.get("label"), str)
        or not isinstance(segment.get("text"), str)
        or not segment["label"].strip()
        or not segment["text"].strip()
        for segment in segments
    ):
        raise HTTPException(502, "Felcloud returned an incomplete biology voiceover segment.")
    return {
        "segments": [
            {"label": segment["label"].strip()[:40], "text": segment["text"].strip()[:700]}
            for segment in segments
        ]
    }

import re as _re

def strip_intro(text: str, expert_id: str) -> str:
    name_map = {
        'expert1': ['Arifa'],
        'expert2': ['Nafisa'],
        'expert3': ['Rakib'],
    }
    names = name_map.get(expert_id, [])
    lines = text.strip().split('\n')
    # Drop any leading line that contains the expert's own name + intro pattern
    while lines:
        l = lines[0]
        is_intro = any(n.lower() in l.lower() for n in names) and any(
            phrase in l.lower()
            for phrase in ('i am', "i'm", "i'll", 'i think', 'as an expert')
        )
        if is_intro:
            lines.pop(0)
        else:
            break
    return '\n'.join(lines).strip()


@app.post("/turn")
async def run_turn(req: TurnRequest):
    print(f"[TURN] topic={req.topic} pdf_context_len={len(req.pdf_context)} dialogue_len={len(req.dialogue)}")
    state = {**req.model_dump(), "reply": ""}
    result = await discussion_graph.ainvoke(state)
    return {"reply": result["reply"], "dialogue": result["dialogue"]}

@app.post("/generate")
async def generate(data: Prompt):
    import traceback
    print("Using configured Felcloud model for video generation.")
    job_id = str(uuid.uuid4())[:8]
    scene_file = os.path.join(SCENES_DIR, f"scene_{job_id}.py")
    output_video = os.path.join(VIDEOS_DIR, f"{job_id}.mp4")

    # Quick runtime check: ensure `manim` binary is available
    if not manim_available():
        msg = (
            "Manim executable not found on the server PATH.\n"
            "Install Manim Community Edition and system dependencies (ffmpeg, cairo, pango)."
        )
        print(f"[{job_id}] ERROR: {msg}")
        raise HTTPException(500, msg)

    # Step 1: Generate code, with fallback to simpler version if syntax broken
    try:
        code = await generate_manim_code(data.prompt, data.context, simple=False)
        print(f"[{job_id}] Generated code:\n{code}\n")

        valid, syntax_err = is_syntax_valid(code)
        if not valid:
            print(f"[{job_id}] Syntax error in initial generation: {syntax_err}")
            print(f"[{job_id}] Regenerating with simpler prompt...")
            code = await generate_manim_code(data.prompt, data.context, simple=True)
            valid, syntax_err = is_syntax_valid(code)
            if not valid:
                raise HTTPException(500, f"Generated code has syntax error after retry: {syntax_err}")

        print(f"[{job_id}] Syntax check passed.")

    except HTTPException:
        raise
    except Exception as e:
        print(f"[{job_id}] AI FAILED: {traceback.format_exc()}")
        raise HTTPException(500, f"AI generation failed: {str(e)}")

    # Step 1.5: Pre-flight sanitization
    code = await sanitize_code(code, job_id, data.prompt)

    # Step 2: Save scene file
    os.makedirs(SCENES_DIR, exist_ok=True)
    with open(scene_file, "w", encoding="utf-8") as f:
        f.write(code)

    media_dir = os.path.join(BASE_DIR, f"media_{job_id}")

    # Step 3: Render with retry loop
    MAX_RETRIES = 3
    last_error = ""

    for attempt in range(1, MAX_RETRIES + 1):
        print(f"[{job_id}] Render attempt {attempt}/{MAX_RETRIES}")
        try:
            result = subprocess.run(
                [
                    sys.executable,
                    "-m",
                    "manim",
                    "-ql",
                    scene_file,
                    "Scene",
                    "--media_dir",
                    media_dir,
                ],
                capture_output=True,
                text=True,
                timeout=120,
            )
            print(f"[{job_id}] Manim stdout: {result.stdout[-300:]}")
            print(f"[{job_id}] Manim stderr: {result.stderr[-300:]}")

            if result.returncode == 0:
                break

            last_error = result.stderr
            print(f"[{job_id}] Render attempt {attempt} failed")

            if attempt < MAX_RETRIES:
                if "SyntaxError" in last_error or "IndentationError" in last_error:
                    print(f"[{job_id}] Syntax error detected — regenerating simpler version...")
                    code = await generate_manim_code(data.prompt, data.context, simple=True)
                    valid, syntax_err = is_syntax_valid(code)
                    if not valid:
                        print(f"[{job_id}] Regenerated code also has syntax error: {syntax_err}")
                else:
                    print(f"[{job_id}] Attempting LLM fix for attempt {attempt}...")
                    code = await fix_code_with_llm(code, last_error[-600:], data.prompt)
                    print(f"[{job_id}] Code fixed, retrying...")

                with open(scene_file, "w", encoding="utf-8") as f:
                    f.write(code)

        except subprocess.TimeoutExpired:
            raise HTTPException(504, "Render timed out")

    else:
        print(f"[{job_id}] RENDER FAILED after {MAX_RETRIES} attempts")
        raise HTTPException(500, f"Render failed after {MAX_RETRIES} attempts: {last_error[-300:]}")

    # Step 4: Find output
    expected = os.path.join(media_dir, "videos", f"scene_{job_id}", "480p15", "Scene.mp4")
    print(f"[{job_id}] Looking for video at: {expected}")
    if not os.path.exists(expected):
        for root, dirs, files in os.walk(media_dir):
            for file in files:
                print(f"[{job_id}] Found file: {os.path.join(root, file)}")
        raise HTTPException(500, "Video file not found after render")

    os.makedirs(VIDEOS_DIR, exist_ok=True)
    os.rename(expected, output_video)

    return {"video_url": f"/videos/{job_id}.mp4"}


@app.get("/api/health")
async def health():
    return {
        "status": "ok",
        "frontend_dir": FRONTEND_DIR,
        "frontend_exists": bool(FRONTEND_DIR and os.path.isdir(FRONTEND_DIR)),
        "base_dir": BASE_DIR,
        "project_root": PROJECT_ROOT,
    }


class FelcloudChatRequest(BaseModel):
    model: str = Field(min_length=1, max_length=200)
    messages: List[dict] = Field(min_length=1, max_length=50)
    max_tokens: int = Field(default=512, ge=1, le=4096)
    temperature: float = Field(default=0.7, ge=0, le=2)
    response_format: dict | None = None
    tools: List[dict] | None = None
    tool_choice: str | dict | None = None


def quota_response_headers(headers) -> dict[str, str]:
    return {
        name: value
        for name, value in headers.items()
        if name.lower() == "retry-after" or name.lower().startswith("x-ratelimit-")
    }


@app.get("/llm/config")
async def felcloud_config():
    settings = get_felcloud_settings()
    if not settings["compact_model"] or not settings["midsize_model"]:
        raise HTTPException(
            503,
            "Set FELCLOUD_COMPACT_MODEL and FELCLOUD_MIDSIZE_MODEL to model IDs from /llm/models.",
        )
    return {
        "compact_model": settings["compact_model"],
        "midsize_model": settings["midsize_model"],
        "vision_model": settings["vision_model"],
    }


@app.get("/llm/models")
async def felcloud_models():
    client = get_felcloud_client()
    try:
        response = await client.models.list()
    except APIStatusError as exc:
        print(f"[Felcloud models] Upstream HTTP {exc.status_code}.")
        headers = quota_response_headers(exc.response.headers)
        try:
            content = exc.response.json()
        except ValueError:
            content = {"error": {"message": "Felcloud rejected the models request."}}
        return JSONResponse(status_code=exc.status_code, content=content, headers=headers)
    except APIConnectionError as exc:
        cause = type(exc.__cause__).__name__ if exc.__cause__ else "unknown"
        print(f"[Felcloud models] Connection failed ({cause}).")
        status = 504 if cause == "ReadTimeout" else 502
        message = "Felcloud timed out listing models." if status == 504 else "Could not connect to the configured Felcloud API."
        raise HTTPException(status, message) from exc
    return {"data": [model.model_dump() for model in response.data], "object": response.object}


@app.post("/llm/chat/completions")
async def felcloud_chat_completions(req: FelcloudChatRequest):
    settings = get_felcloud_settings()
    allowed_models = {
        model for model in (
            settings["compact_model"],
            settings["midsize_model"],
            settings["vision_model"],
        ) if model
    }
    if not allowed_models:
        raise HTTPException(503, "Configure Felcloud models before sending chat requests.")
    if req.model not in allowed_models:
        raise HTTPException(400, "The requested model is not configured for this application.")

    client = get_felcloud_client()
    request_options = {
        "model": req.model,
        "messages": req.messages,
        "max_tokens": req.max_tokens,
        "temperature": req.temperature,
    }
    if req.response_format is not None:
        request_options["response_format"] = req.response_format
    if req.tools is not None:
        request_options["tools"] = req.tools
    if req.tool_choice is not None:
        request_options["tool_choice"] = req.tool_choice
    try:
        async with _felcloud_request_semaphore:
            raw_response = await client.chat.completions.with_raw_response.create(
                **request_options,
            )
        response = raw_response.parse()
    except APIStatusError as exc:
        print(f"[Felcloud chat] Upstream HTTP {exc.status_code}.")
        headers = quota_response_headers(exc.response.headers)
        try:
            content = exc.response.json()
        except ValueError:
            content = {"error": {"message": "Felcloud rejected the chat completion request."}}
        return JSONResponse(status_code=exc.status_code, content=content, headers=headers)
    except APIConnectionError as exc:
        cause = type(exc.__cause__).__name__ if exc.__cause__ else "unknown"
        print(f"[Felcloud chat] Connection failed ({cause}).")
        status = 504 if cause == "ReadTimeout" else 502
        message = "Felcloud timed out waiting for the model response." if status == 504 else "Could not connect to the configured Felcloud API."
        raise HTTPException(status, message) from exc

    return JSONResponse(
        content=response.model_dump(),
        headers=quota_response_headers(raw_response.headers),
    )


@app.get("/api/config")
async def get_config():
    settings = get_felcloud_settings()
    return {
        "FELCLOUD_COMPACT_MODEL": settings["compact_model"],
        "FELCLOUD_MIDSIZE_MODEL": settings["midsize_model"],
        "FELCLOUD_VISION_MODEL": settings["vision_model"],
    }


def _fetch_research_url(url: str) -> bytes:
    request = urllib.request.Request(
        url,
        headers={"User-Agent": "AmplifyWebsite/1.0 (educational research references)"},
    )
    with urllib.request.urlopen(request, timeout=12) as response:
        return response.read()


def _search_arxiv(query: str) -> list[dict]:
    search_text = f'"{query}"' if " " in query else query
    params = urllib.parse.urlencode({
        "search_query": f"all:{search_text}",
        "start": 0,
        "max_results": 5,
        "sortBy": "relevance",
        "sortOrder": "descending",
    }, quote_via=urllib.parse.quote)
    xml_data = _fetch_research_url(f"https://export.arxiv.org/api/query?{params}")
    root = ET.fromstring(xml_data)
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    papers = []
    for entry in root.findall("atom:entry", ns):
        arxiv_id = (entry.findtext("atom:id", default="", namespaces=ns)).strip()
        if arxiv_id.startswith("http://arxiv.org/"):
            arxiv_id = "https://arxiv.org/" + arxiv_id.removeprefix("http://arxiv.org/")
        papers.append({
            "title": " ".join(entry.findtext("atom:title", default="", namespaces=ns).split()),
            "authors": [
                author.findtext("atom:name", default="", namespaces=ns).strip()
                for author in entry.findall("atom:author", ns)
            ],
            "year": (entry.findtext("atom:published", default="", namespaces=ns) or "")[:4],
            "abstract": " ".join(entry.findtext("atom:summary", default="", namespaces=ns).split()),
            "url": arxiv_id,
            "source": "arXiv",
        })
    return papers


def _search_crossref(query: str) -> list[dict]:
    params = urllib.parse.urlencode({
        "query": query,
        "rows": 5,
        "select": "title,author,published,created,abstract,URL,DOI,type",
    })
    payload = json.loads(_fetch_research_url(f"https://api.crossref.org/works?{params}"))
    papers = []
    for item in payload.get("message", {}).get("items", []):
        titles = item.get("title") or []
        title = titles[0].strip() if titles else ""
        if not title:
            continue
        authors = [
            " ".join(part for part in (author.get("given"), author.get("family")) if part)
            for author in item.get("author", [])
        ]
        date_parts = (
            item.get("published", {}).get("date-parts")
            or item.get("created", {}).get("date-parts")
            or [[]]
        )
        abstract = re.sub(r"<[^>]*>", " ", item.get("abstract", ""))
        abstract = " ".join(urllib.parse.unquote(abstract).split())
        papers.append({
            "title": title,
            "authors": authors,
            "year": str(date_parts[0][0]) if date_parts and date_parts[0] else "",
            "abstract": abstract,
            "url": item.get("URL") or (f"https://doi.org/{item['DOI']}" if item.get("DOI") else ""),
            "source": "Crossref",
        })
    return papers


@app.get("/research/references")
async def research_references(q: str = ""):
    query = " ".join(q.split())
    if not query:
        raise HTTPException(400, "A search query is required.")
    if len(query) > 200:
        raise HTTPException(400, "Search query must be 200 characters or fewer.")

    providers = await asyncio.gather(
        asyncio.to_thread(_search_arxiv, query),
        asyncio.to_thread(_search_crossref, query),
        return_exceptions=True,
    )
    results = []
    errors = []
    for source, response in zip(("arXiv", "Crossref"), providers):
        if isinstance(response, Exception):
            print(f"[research/references] {source} search failed: {response}")
            errors.append(source)
        else:
            results.extend(response)

    if not results and len(errors) == 2:
        raise HTTPException(502, "Research providers could not be reached. Please try again.")

    seen_titles = set()
    unique_results = []
    for paper in results:
        key = re.sub(r"[^a-z0-9]+", "", paper["title"].lower())
        if key and key not in seen_titles:
            seen_titles.add(key)
            unique_results.append(paper)

    return {"query": query, "results": unique_results, "unavailable_sources": errors}


def _search_wikimedia_gifs(query: str) -> list[dict]:
    params = urllib.parse.urlencode({
        "action": "query",
        "generator": "search",
        "gsrsearch": f"filemime:image/gif {query} animation",
        "gsrnamespace": 6,
        "gsrlimit": 6,
        "prop": "imageinfo",
        "iiprop": "url|extmetadata",
        "iiurlwidth": 640,
        "format": "json",
    })
    payload = json.loads(_fetch_research_url(f"https://commons.wikimedia.org/w/api.php?{params}"))
    pages = payload.get("query", {}).get("pages", {})
    if isinstance(pages, list):
        items = pages
    else:
        items = pages.values()

    results = []
    for page in items:
        title = page.get("title", "")
        image_info = (page.get("imageinfo") or [{}])[0]
        image_url = image_info.get("thumburl") or image_info.get("url", "")
        file_url = image_info.get("descriptionurl", "")
        if not title.lower().endswith(".gif"):
            continue
        if not image_url.startswith(("https://upload.wikimedia.org/", "https://thumb.wikimedia.org/")):
            continue
        if not file_url.startswith("https://commons.wikimedia.org/"):
            continue

        metadata = image_info.get("extmetadata", {})
        artist_html = metadata.get("Artist", {}).get("value", "")
        license_html = metadata.get("LicenseShortName", {}).get("value", "")
        artist = html.unescape(re.sub(r"<[^>]*>", " ", artist_html))
        license_name = html.unescape(re.sub(r"<[^>]*>", " ", license_html))
        results.append({
            "title": title.removeprefix("File:"),
            "image_url": image_url,
            "file_url": file_url,
            "artist": " ".join(artist.split()),
            "license": " ".join(license_name.split()),
        })
        if len(results) >= 5:
            break
    return results


@app.get("/research/gifs")
async def research_gifs(q: str = ""):
    query = " ".join(q.split())
    if not query:
        raise HTTPException(400, "A search query is required.")
    if len(query) > 200:
        raise HTTPException(400, "Search query must be 200 characters or fewer.")

    try:
        results = await asyncio.to_thread(_search_wikimedia_gifs, query)
    except Exception as error:
        print(f"[research/gifs] Wikimedia Commons search failed: {error}")
        raise HTTPException(502, "GIF search is temporarily unavailable. Please try again.")
    return {"query": query, "results": results}



# ── NEO4J PROXY ──────────────────────────────────────
from neo4j import AsyncGraphDatabase

_neo4j_driver = None

def get_neo4j_driver():
    global _neo4j_driver
    if _neo4j_driver is None:
        uri  = os.getenv("NEO4J_URI")
        user = os.getenv("NEO4J_USER", "neo4j")
        pwd  = os.getenv("NEO4J_PASS")
        if not uri or not pwd:
            raise HTTPException(500, "NEO4J_URI / NEO4J_PASS not set")
        _neo4j_driver = AsyncGraphDatabase.driver(uri, auth=(user, pwd))
    return _neo4j_driver

class Neo4jRequest(BaseModel):
    statement: str
    parameters: dict = {}

@app.post("/neo4j")
async def neo4j_proxy(req: Neo4jRequest):
    driver = get_neo4j_driver()
    async with driver.session() as session:
        result = await session.run(req.statement, req.parameters)
        records = await result.data()
        return {"results": [{"data": [{"row": list(r.values())} for r in records]}]}



@app.get("/neo4j/keepalive")
async def neo4j_keepalive():
    try:
        driver = get_neo4j_driver()
        async with driver.session() as session:
            await session.run("RETURN 1")
        return {"status": "ok"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}


if FRONTEND_DIR:
    public_dir = os.path.join(FRONTEND_DIR, "public")
    models_dir = os.path.join(public_dir, "models")

    if os.path.isdir(models_dir):
        app.mount("/models", StaticFiles(directory=models_dir), name="models")

    @app.get("/amplify-env-bootstrap.js")
    async def amplify_env_bootstrap():
        path = os.path.join(public_dir, "amplify-env-bootstrap.js")
        if not os.path.isfile(path):
            raise HTTPException(404, "amplify-env-bootstrap.js not found")
        return FileResponse(path, media_type="application/javascript")

    @app.get("/icons.svg")
    async def icons_svg():
        path = os.path.join(public_dir, "icons.svg")
        if not os.path.isfile(path):
            raise HTTPException(404, "icons.svg not found")
        return FileResponse(path, media_type="image/svg+xml")

    @app.get("/favicon.svg")
    async def favicon_svg():
        path = os.path.join(public_dir, "favicon.svg")
        if not os.path.isfile(path):
            raise HTTPException(404, "favicon.svg not found")
        return FileResponse(path, media_type="image/svg+xml")

    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="static")
else:
    print("Static HTML frontend will not be served.")
