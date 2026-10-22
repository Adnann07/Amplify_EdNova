from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import asyncio, subprocess, json, os, uuid, re, ast, sys
import urllib.error, urllib.parse, urllib.request, xml.etree.ElementTree as ET
import html
from openai import OpenAI

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

# ── LangGraph (Deep Learn feature) ──
from langgraph.graph import StateGraph, END, START
from langchain_groq import ChatGroq
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from typing import Annotated, List, Literal, TypedDict
import operator
import shutil


def parse_env_list(name: str, default=None) -> list[str]:
    value = os.getenv(name)
    if not value:
        return default or []
    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return [str(item) for item in parsed if item is not None]
    except Exception:
        return [part.strip() for part in value.split(',') if part.strip()]
    return default or []


OPENROUTER_BASE_URL = os.getenv('OPENROUTER_BASE_URL', 'https://openrouter.ai/api/v1')
API_KEYS = None
GROQ_KEYS = None
_clients = None


def get_api_keys() -> list[str]:
    global API_KEYS
    if API_KEYS is None:
        API_KEYS = parse_env_list('OPENROUTER_API_KEYS')
        if not API_KEYS:
            raise RuntimeError('OPENROUTER_API_KEYS must be configured in backend/.env or Vercel environment variables.')
    return API_KEYS


def get_groq_keys() -> list[str]:
    global GROQ_KEYS
    if GROQ_KEYS is None:
        names = ('GROQ_KEYS', 'GROQ_API_KEY', 'GROQ_KEY', 'VITE_GROQ_KEYS', 'VITE_GROQ_API_KEY')

        def parse_keys(value: str) -> list[str]:
            value = value.strip().strip('"').strip("'")
            if not value:
                return []
            try:
                parsed = json.loads(value)
            except json.JSONDecodeError:
                parsed = None
            if isinstance(parsed, list):
                return [str(item).strip() for item in parsed if str(item).strip()]
            if isinstance(parsed, str):
                value = parsed
            return [item.strip() for item in re.split(r'[\r\n,]+', value) if item.strip()]

        GROQ_KEYS = []
        for name in names:
            GROQ_KEYS = parse_keys(os.getenv(name, ''))
            if GROQ_KEYS:
                break

        if not GROQ_KEYS:
            env_files = (
                os.path.join(BASE_DIR, '.env'),
                os.path.join(BASE_DIR, 'frontend', '.env'),
            )
            for env_file in env_files:
                if not os.path.isfile(env_file):
                    continue
                with open(env_file, encoding='utf-8') as file:
                    for line in file:
                        entry = line.strip()
                        if entry.startswith('export '):
                            entry = entry[7:].lstrip()
                        if not entry or entry.startswith('#') or '=' not in entry:
                            continue
                        name, value = entry.split('=', 1)
                        if name.strip() not in names:
                            continue
                        GROQ_KEYS = parse_keys(value)
                        if GROQ_KEYS:
                            break
                if GROQ_KEYS:
                    break

        if not GROQ_KEYS:
            raise RuntimeError('Configure GROQ_KEYS in the server environment or a local backend/frontend .env file.')
    return GROQ_KEYS


def get_clients() -> list[OpenAI]:
    global _clients
    if _clients is None:
        _clients = [
            OpenAI(
                api_key=key,
                base_url=OPENROUTER_BASE_URL,
                default_headers={
                    'HTTP-Referer': 'http://localhost:5173',
                    'X-Title': 'Amplify'
                }
            )
            for key in get_api_keys()
        ]
    return _clients


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

EXPERT_MODELS = {
  'expert1': 'openai/gpt-oss-120b',
  'expert2': 'llama-3.3-70b-versatile',
  'expert3': 'openai/gpt-oss-20b',
}

# ── State definition ──────────────────────────
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
    def node(state: DiscussionState) -> dict:
        primary_model = EXPERT_MODELS[expert_id]
        fallback_models = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.3-70b-versatile']
        models_to_try = [primary_model] + [m for m in fallback_models if m != primary_model]
        prompt_text = build_expert_prompt(state)
        messages = [
            SystemMessage(content=EXPERT_SYSTEMS[expert_id]),
            HumanMessage(content=prompt_text),
        ]
        last_err = None
        for model in models_to_try:
            for key in get_groq_keys():
                try:
                    llm_kwargs = {"api_key": key, "model": model, "max_tokens": 400, "temperature": 0.8}
                    if model.startswith('openai/gpt-oss') or model.startswith('qwen/'):
                        llm_kwargs['reasoning_effort'] = 'low'
                    llm = ChatGroq(**llm_kwargs)

                    reply = strip_intro(llm.invoke(messages).content.strip(), expert_id)
                    if reply:
                        return {
                            'reply': reply,
                            'dialogue': [{'name': EXPERT_NAMES[expert_id], 'text': reply}],
                        }
                except Exception as e:
                    last_err = e
                    is_rate_limit = '429' in str(e) or 'rate_limit' in str(e).lower()
                    print(f"[{expert_id}] {model} key failed: {e}")
                    if is_rate_limit:
                        break  # rate limit is per-model, skip remaining keys for this model
                    continue
        raise HTTPException(500, f"All Groq models/keys failed for {expert_id}: {last_err}")
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


def call_llm(messages: list, max_tokens: int = 2500) -> str:
    """Try each API key in order, fall back on failure."""
    last_error = None
    for i, c in enumerate(get_clients()):
        try:
            response = c.chat.completions.create(
                model="openrouter/auto",
                messages=messages,
                max_tokens=max_tokens
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"  → API key {i+1} failed: {e}")
            last_error = e
            continue
    raise HTTPException(500, f"All API keys failed. Last error: {last_error}")


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


def fix_code_with_llm(code: str, error_msg: str, original_prompt: str) -> str:
    """Ask the LLM to fix its own broken code given the error."""
    print("  → Asking LLM to fix its own code...")
    messages = [
        {
            "role": "system",
            "content": """You fix broken Manim Community Edition code. Rules:
- Return ONLY raw Python, no markdown, no backticks, no explanation
- Fix every NameError: make sure every variable is defined before it is used
- Class name must be exactly: Scene (inheriting MovingCameraScene)
- First line: from manim import *
- Keep under 65 lines
- End with self.wait(2)"""
        },
        {
            "role": "user",
            "content": (
                f"This Manim code has an error. Fix it.\n\n"
                f"ORIGINAL PROMPT: {original_prompt}\n\n"
                f"BROKEN CODE:\n{code}\n\n"
                f"ERROR:\n{error_msg}"
            )
        }
    ]
    fixed = call_llm(messages, max_tokens=2500)
    fixed = re.sub(r'```python|```', '', fixed).strip()
    fixed = fixed.replace('class Scene(Scene):', 'class Scene(MovingCameraScene):')
    fixed = re.sub(r'(config\.background_color\s*=\s*BLACK)\s*class', r'\1\n\nclass', fixed)
    return fixed


def sanitize_code(code: str, job_id: str, original_prompt: str) -> str:
    # Check for known Manim API misuses first
    antipatterns = check_manim_antipatterns(code)
    if antipatterns:
        error_msg = "Manim API errors:\n" + "\n".join(antipatterns)
        print(f"[{job_id}] Pre-flight caught antipatterns: {antipatterns}")
        code = fix_code_with_llm(code, error_msg, original_prompt)

    # Then check for undefined names
    undefined = extract_undefined_names(code)
    if not undefined:
        return code

    error_msg = f"NameError: the following names are used but never defined: {', '.join(undefined)}"
    print(f"[{job_id}] Pre-flight caught undefined names: {undefined}")
    fixed = fix_code_with_llm(code, error_msg, original_prompt)

    still_undefined = extract_undefined_names(fixed)
    if still_undefined:
        print(f"[{job_id}] Still undefined after fix attempt: {still_undefined} — proceeding anyway")
    else:
        print(f"[{job_id}] Fix successful, undefined names resolved.")

    return fixed


def is_syntax_valid(code: str) -> tuple[bool, str]:
    try:
        ast.parse(code)
        return True, ""
    except SyntaxError as e:
        return False, str(e)


def generate_manim_code(prompt: str, context: str, simple: bool = False) -> str:
    length_note = "Keep under 40 lines total. Very simple animation only." if simple else "Keep under 60 lines total."
    messages = [
        {
            "role": "system",
            "content": f"""Generate ONLY executable Manim Community Edition code. Rules:
- No markdown, no backticks, no explanation, just raw Python
- Class name must be exactly: Scene inheriting MovingCameraScene
- First line must be: from manim import *
- Use config.background_color = BLACK
- {length_note}
- NEVER use MathTex or Tex — use Text() only
- Use only: Circle, Square, Arrow, Text, VGroup, Line, Dot, Create, Write, FadeIn, FadeOut, Transform, self.play(), self.wait()
- No external images, no SVG imports, no custom fonts
- CRITICAL: Every variable referenced must be assigned earlier in the same scope
- CRITICAL: Never leave any parentheses, brackets, or braces unclosed
- End with self.wait(2)"""
        },
        {
            "role": "user",
            "content": f"Create a 3Blue1Brown style Manim animation explaining: {prompt}. Context: {context}"
        }
    ]
    code = call_llm(messages, max_tokens=2500)
    code = re.sub(r'```python|```', '', code).strip()
    code = code.replace('class Scene(Scene):', 'class Scene(MovingCameraScene):')
    code = re.sub(r'(config\.background_color\s*=\s*BLACK)\s*class', r'\1\n\nclass', code)
    return code

# ── Deep Learn endpoint ───────────────────────
class TurnRequest(BaseModel):
    topic:       str
    phase:       str
    expert_id:   str
    pdf_context: str = ''
    dialogue:    List[dict] = []

class BiologyVoiceoverRequest(BaseModel):
    model_name: str = Field(min_length=1, max_length=120)


class PdfTutorMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str = Field(min_length=1, max_length=12000)


class PdfTutorChatRequest(BaseModel):
    groq_model: Literal[
        "openai/gpt-oss-120b",
        "openai/gpt-oss-20b",
        "qwen/qwen3.6-27b",
    ] = Field(alias="model_id")
    messages: List[PdfTutorMessage]
    max_tokens: int = Field(default=700, ge=1, le=1200)
    temperature: float = Field(default=0.35, ge=0, le=1)


class PdfTutorSpeechRequest(BaseModel):
    language: Literal["English", "French", "Moroccan Darija", "Arabic"]
    text: str = Field(min_length=1, max_length=5000)


@app.post("/api/pdf-tutor/chat")
async def pdf_tutor_chat(req: PdfTutorChatRequest):
    if not req.messages or len(req.messages) > 12:
        raise HTTPException(422, "The tutor request must contain between 1 and 12 messages.")
    if sum(len(message.content) for message in req.messages) > 30000:
        raise HTTPException(413, "The tutor context is too large. Please shorten the conversation or PDF question.")

    try:
        groq_keys = get_groq_keys()
    except RuntimeError as exc:
        print(f"[PDF tutor] Groq configuration error: {exc}")
        raise HTTPException(503, "Groq is not configured for the PDF tutor.")

    message_types = {
        "system": SystemMessage,
        "user": HumanMessage,
        "assistant": AIMessage,
    }
    messages = [
        message_types[message.role](content=message.content)
        for message in req.messages
    ]
    last_error = None
    for key_index, key in enumerate(groq_keys, start=1):
        try:
            llm_kwargs = {
                "api_key": key,
                "model": req.groq_model,
                "max_tokens": req.max_tokens,
                "temperature": req.temperature,
            }
            if req.groq_model.startswith("openai/gpt-oss"):
                llm_kwargs["reasoning_effort"] = "low"
            elif req.groq_model.startswith("qwen/"):
                llm_kwargs["reasoning_effort"] = "none"
            llm = ChatGroq(**llm_kwargs)
            result = await asyncio.to_thread(llm.invoke, messages)
            content = str(result.content).strip()
            content = re.sub(r"<think[^>]*>[\s\S]*?</think>", "", content, flags=re.IGNORECASE).strip()
            if content:
                return {"content": content}
            last_error = "Groq returned an empty response."
        except Exception as exc:
            last_error = exc
            print(f"[PDF tutor] {req.groq_model} key {key_index} failed: {type(exc).__name__}")
            if "429" in str(exc) or "rate_limit" in str(exc).lower():
                continue

    print(f"[PDF tutor] All Groq keys failed: {type(last_error).__name__ if last_error else 'no keys'}")
    raise HTTPException(502, "Groq could not generate a tutor response. Please try again.")


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

    system_message = SystemMessage(content=(
        "You are a biology teacher writing a spoken explanation for a student. "
        "Respond in clear, natural English. Return only valid JSON with a "
        '"segments" array of exactly four objects, each containing "label" and "text". '
        "The four sections must cover an overview, structure, key features, and function. "
        "Each text must be one or two concise, scientifically accurate sentences. "
        "Do not include markdown or make up uncertain numerical claims."
    ))
    user_message = HumanMessage(content=f"Create the four-section voiceover for: {model_name}")
    models = ["openai/gpt-oss-20b", "llama-3.3-70b-versatile", "openai/gpt-oss-120b"]
    last_error = None
    try:
        groq_keys = get_groq_keys()
    except RuntimeError as exc:
        print(f"[biology voiceover] Groq configuration error: {exc}")
        raise HTTPException(503, "Groq is not configured for the biology voiceover.")

    for model in models:
        for key_index, key in enumerate(groq_keys, start=1):
            try:
                llm_kwargs = {"api_key": key, "model": model, "max_tokens": 700, "temperature": 0.6}
                if model.startswith("openai/gpt-oss"):
                    llm_kwargs["reasoning_effort"] = "low"
                llm = ChatGroq(**llm_kwargs)
                result = await asyncio.to_thread(llm.invoke, [system_message, user_message])
                raw = str(result.content).strip()
                raw = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw, flags=re.IGNORECASE)
                data = json.loads(raw)
                segments = data.get("segments") if isinstance(data, dict) else None
                if not isinstance(segments, list) or len(segments) != 4:
                    raise ValueError("Groq returned an invalid voiceover structure.")
                if any(
                    not isinstance(segment, dict)
                    or not isinstance(segment.get("label"), str)
                    or not isinstance(segment.get("text"), str)
                    or not segment["label"].strip()
                    or not segment["text"].strip()
                    for segment in segments
                ):
                    raise ValueError("Groq returned an incomplete voiceover segment.")
                return {
                    "segments": [
                        {"label": segment["label"].strip()[:40], "text": segment["text"].strip()[:700]}
                        for segment in segments
                    ]
                }
            except Exception as exc:
                last_error = exc
                print(f"[biology voiceover] {model} key {key_index} failed: {type(exc).__name__}")
                if "429" in str(exc) or "rate_limit" in str(exc).lower():
                    break

    print(f"[biology voiceover] All Groq models failed: {type(last_error).__name__ if last_error else 'no keys'}")
    raise HTTPException(502, "Groq could not generate the biology voiceover. Please try again.")

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
    result = discussion_graph.invoke(state)
    return {"reply": result["reply"], "dialogue": result["dialogue"]}

@app.post("/generate")
async def generate(data: Prompt):
    import traceback
    print(f"Using API keys: {[k[:20] + '...' for k in get_api_keys()]}")
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
        code = generate_manim_code(data.prompt, data.context, simple=False)
        print(f"[{job_id}] Generated code:\n{code}\n")

        valid, syntax_err = is_syntax_valid(code)
        if not valid:
            print(f"[{job_id}] Syntax error in initial generation: {syntax_err}")
            print(f"[{job_id}] Regenerating with simpler prompt...")
            code = generate_manim_code(data.prompt, data.context, simple=True)
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
    code = sanitize_code(code, job_id, data.prompt)

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
                    code = generate_manim_code(data.prompt, data.context, simple=True)
                    valid, syntax_err = is_syntax_valid(code)
                    if not valid:
                        print(f"[{job_id}] Regenerated code also has syntax error: {syntax_err}")
                else:
                    print(f"[{job_id}] Attempting LLM fix for attempt {attempt}...")
                    code = fix_code_with_llm(code, last_error[-600:], data.prompt)
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


@app.get("/api/config")
async def get_config():
    """Provide API configuration to frontend"""
    groq_keys = parse_env_list('GROQ_KEYS')
    if not groq_keys:
        for env_name in ('GROQ_API_KEY', 'GROQ_KEY'):
            single = os.getenv(env_name, '').strip()
            if single:
                groq_keys = [single]
                break

    openrouter_keys = parse_env_list('OPENROUTER_API_KEYS')
    print(f"[/api/config] GROQ_KEYS count: {len(groq_keys)}, OPENROUTER_KEYS count: {len(openrouter_keys)}")

    return {
        "GROQ_API_KEY": groq_keys[0] if groq_keys else '',
        "GROQ_KEYS": groq_keys,
        "GROQ_API_BASE_URL": os.getenv('GROQ_BASE', 'https://api.groq.com/openai/v1'),
        "CEREBRAS_API_KEY": os.getenv('CEREBRAS_KEY', ''),
        "CEREBRAS_API_BASE": os.getenv('CEREBRAS_BASE', 'https://api.cerebras.ai/v1'),
        "OPENROUTER_API_KEYS": openrouter_keys,
        "OPENROUTER_KEYS": openrouter_keys,
        "OPENROUTER_BASE": OPENROUTER_BASE_URL,
        "GEMINI_KEY": os.getenv('GEMINI_KEY', ''),
        "GEMINI_MODEL": os.getenv('GEMINI_MODEL', 'gemini-2.0-flash-lite'),
        "GEMINI_BASE": os.getenv('GEMINI_BASE', 'https://generativelanguage.googleapis.com/v1beta/models'),
        "AZURE_SPEECH_KEY": os.getenv('AZURE_SPEECH_KEY', ''),
        "AZURE_SPEECH_REGION": os.getenv('AZURE_SPEECH_REGION', 'southeastasia'),
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
