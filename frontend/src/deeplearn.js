// ══════════════════════════════════════════════
//  DeepLearn — deeplearn.js
//  3 Expert Agents · Groq multi-model · English discussion
// ══════════════════════════════════════════════

import { loadEnvConfig, getGroqKeys, getOpenRouterKeys, getGroqBase, getOpenRouterBase, getViteEnv } from './env-config.js';

let _config = {};
const _env = getViteEnv();
let _azureKey = '';
let _azureRegion = 'southeastasia';
loadEnvConfig().then(cfg => {
  _config = cfg;
  _azureKey    = cfg.AZURE_SPEECH_KEY    || '';
  _azureRegion = cfg.AZURE_SPEECH_REGION || 'southeastasia';
  console.log('[DeepLearn Azure] config loaded. key present:', !!_azureKey, '| key length:', _azureKey.length, '| region:', _azureRegion);
});

function groqKeys() { return getGroqKeys(_config, _env); }
function openRouterKeys() { return getOpenRouterKeys(_config, _env); }
function groqBase() { return getGroqBase(_config, _env); }
function openRouterBase() { return getOpenRouterBase(_config, _env); }

const OPENROUTER_MODELS = ['openrouter/free'];
const GROQ_MODELS        = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.6-27b'];
const VISION_MODEL       = 'qwen/qwen3.6-27b';

// ── Expert Config ──────────────────────────────
const MODEL_FALLBACK = 'openai/gpt-oss-120b';


// ══════════════════════════════════════════════
//  PDF PIPELINE (pdf.js + TF-IDF VectorStore)
// ══════════════════════════════════════════════
const CHUNK_WORDS   = 150;
const CHUNK_OVERLAP = 30;
const MAX_PAGES     = 60;
const TOP_K         = 6;
const PAGE_SCALE    = 2.0;
const IMG_QUALITY   = 0.85;

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

class VectorStore {
  constructor() { this.reset(); }
  reset() { this.chunks = []; this.tfidf = []; this.idf = {}; this.vocab = new Set(); this.ready = false; }
  tokenize(text) {
    return text.toLowerCase()    .replace(/[.,!?;:()\[\]{}"'\/\\]/g, ' ').split(/\s+/).filter(t => t.length > 1);
  }
  build() {
    const tfRaw = this.chunks.map(c => {
      const tokens = this.tokenize(c.text), freq = {};
      for (const t of tokens) { freq[t] = (freq[t] || 0) + 1; this.vocab.add(t); }
      const maxF = Math.max(1, ...Object.values(freq)), tf = {};
      for (const [t, f] of Object.entries(freq)) tf[t] = f / maxF;
      return tf;
    });
    const N = this.chunks.length, df = {};
    for (const tf of tfRaw) for (const t of Object.keys(tf)) df[t] = (df[t] || 0) + 1;
    this.idf = {};
    for (const [t, d] of Object.entries(df)) this.idf[t] = Math.log((N + 1) / (d + 1)) + 1;
    this.tfidf = tfRaw.map(tf => {
      const v = {};
      for (const [t, s] of Object.entries(tf)) v[t] = s * (this.idf[t] || 1);
      return v;
    });
    this.ready = true;
  }
  addChunk(chunk) { this.chunks.push(chunk); }
  qvec(text) {
    const tokens = this.tokenize(text), freq = {};
    for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
    const maxF = Math.max(1, ...Object.values(freq)), v = {};
    for (const [t, f] of Object.entries(freq)) v[t] = (f / maxF) * (this.idf[t] || 0.3);
    return v;
  }
  cosine(a, b) {
    let dot = 0, na = 0, nb = 0;
    for (const [t, v] of Object.entries(a)) { dot += v * (b[t] || 0); na += v * v; }
    for (const v of Object.values(b)) nb += v * v;
    return (na && nb) ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
  }
  retrieve(query, k = TOP_K) {
    if (!this.tfidf.length) return [];
    const qv = this.qvec(query);
    const scores = this.tfidf.map((v, i) => ({ i, rel: this.cosine(qv, v) }));
    scores.sort((a, b) => b.rel - a.rel);
    const lambda = 0.6, selected = [], remaining = [...scores];
    while (selected.length < k && remaining.length) {
      let best = -Infinity, bi = 0;
      for (let j = 0; j < remaining.length; j++) {
        const r = remaining[j];
        const maxSim = selected.length ? Math.max(...selected.map(s => this.cosine(this.tfidf[r.i], this.tfidf[s.i]))) : 0;
        const sc = lambda * r.rel - (1 - lambda) * maxSim;
        if (sc > best) { best = sc; bi = j; }
      }
      selected.push(remaining[bi]); remaining.splice(bi, 1);
    }
    return selected.filter(s => s.rel > 0).map(s => ({ ...this.chunks[s.i], chunkIdx: s.i, score: s.rel }));
  }
}

const store = new VectorStore();
let pdfPages = [];

function chunkText(text, pageNum) {
  const sentences = text.replace(/([।.!?])\s+/g, '$1\n').split('\n').map(s => s.trim()).filter(s => s.length > 4);
  const chunks = []; let buf = [], wc = 0;
  for (const sent of sentences) {
    const sw = sent.split(/\s+/).length;
    if (wc + sw > CHUNK_WORDS && buf.length) {
      const ct = buf.join(' ');
      if (ct.trim().length > 20) chunks.push({ text: ct, pageNum, wordCount: wc });
      const overlap = buf.join(' ').split(/\s+/).slice(-CHUNK_OVERLAP).join(' ');
      buf = overlap ? [overlap] : []; wc = buf[0] ? buf[0].split(/\s+/).length : 0;
    }
    buf.push(sent); wc += sw;
  }
  if (buf.length) { const ct = buf.join(' ').trim(); if (ct.length > 20) chunks.push({ text: ct, pageNum, wordCount: wc }); }
  return chunks;
}

function getRelevantContext(query, maxChars = 5000) {
  if (!store.ready || !store.chunks.length)
    return pdfPages.map(p => `[Page ${p.page}]\n${p.text}`).join('\n\n').slice(0, maxChars);
  const results = store.retrieve(query, TOP_K);
  if (!results.length) return '';
  let out = '', chars = 0;
  for (const r of results) {
    const block = `[Page ${r.pageNum}]\n${r.text}`;
    if (chars + block.length > maxChars) break;
    out += block + '\n\n'; chars += block.length;
  }
  return out.trim();
}

async function extractPageText(page) {
  const tc = await page.getTextContent();
  return tc.items.map(i => i.str).join(' ').trim();
}

async function pageToBase64(page) {
  const vp = page.getViewport({ scale: PAGE_SCALE });
  const canvas = document.createElement('canvas');
  canvas.width = vp.width; canvas.height = vp.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
  return canvas.toDataURL('image/jpeg', IMG_QUALITY).split(',')[1];
}

async function detectPDFMode(doc) {
  const n = Math.min(5, doc.numPages); let total = 0;
  for (let i = 1; i <= n; i++) {
    const pg = await doc.getPage(i);
    total += (await extractPageText(pg)).length;
  }
  return (total / n) < 50 ? 'image' : 'text';
}

async function groqVisionOCR(base64Img, pageNum) {
  for (let ki = 0; ki < groqKeys().length; ki++) {
    try {
      const res = await fetch(`${groqBase()}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKeys()[ki]}` },
        body: JSON.stringify({
          model: VISION_MODEL, max_tokens: 2048,
          messages: [{ role: 'user', content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Img}` } },
            { type: 'text', text: 'Transcribe ALL text visible on this page exactly. Output only raw text, no commentary.' }
          ]}],
        }),
      });
      if (res.status === 429) { await sleep(4000); continue; }
      if (!res.ok) continue;
      const d = await res.json();
      return d.choices?.[0]?.message?.content || '';
    } catch (e) { console.warn(`[OCR] key ${ki+1}: ${e.message}`); }
  }
  return '';
}

async function loadAndIndexPDF(file, onProgress) {
  store.reset(); pdfPages = [];
  onProgress?.('Opening PDF…');
  const buf    = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  const pages  = Math.min(pdfDoc.numPages, MAX_PAGES);
  const mode   = await detectPDFMode(pdfDoc);
  for (let i = 1; i <= pages; i++) {
    onProgress?.(`Reading page ${i}/${pages}…`);
    const pg = await pdfDoc.getPage(i);
    let pageText = await extractPageText(pg);
    if (pageText.trim().length < 30 && mode === 'image') {
      try {
        const b64 = await pageToBase64(pg);
        const ocr = await groqVisionOCR(b64, i);
        if (ocr && ocr.trim().length > pageText.length) pageText = ocr;
      } catch (e) { console.warn(`[PDF OCR p${i}]:`, e.message); }
    }
    if (pageText.trim().length > 10) {
      pdfPages.push({ page: i, text: pageText });
      for (const c of chunkText(pageText, i)) store.addChunk(c);
    }
  }
  if (store.chunks.length === 0) { onProgress?.('⚠️ No text was found.'); return; }
  store.build();
  onProgress?.(`Ready! (${store.chunks.length} chunks)`);
}


const EXPERTS = {
  expert1: {
    id:    'expert1',
    name:  'Dr. Arifa',
    nameShort: 'A',
    role:  'Subject expert and synthesizer',
    model: 'openai/gpt-oss-120b',
    color: '#5b21b6',
    avatarClass: 'expert1-avatar',
    bubbleClass: 'bubble-expert1',
    system: `You are Dr. Arifa, an experienced subject expert and synthesizer. Speak directly in English.
Rules:
- Speak in the first person; never narrate yourself in the third person.
- Explain deep concepts with scientific reasoning and practical context.
- Use evidence without inventing institutional or personal citations.
- Keep each response to 2 concise sentences and no more than 45 words.
- Respond directly to points raised by the other experts.`,
  },
  expert2: {
    id:    'expert2',
    name:  'Dr. Nafisa',
    nameShort: 'N',
    role:  'Analyst and researcher',
    model: 'qwen/qwen3.6-27b',
    color: '#0369a1',
    avatarClass: 'expert2-avatar',
    bubbleClass: 'bubble-expert2',
    system: `You are Dr. Nafisa, a sharp analyst and researcher. Speak directly in English.
Rules:
- Speak in the first person; never narrate yourself in the third person.
- Compare perspectives and support arguments with evidence.
- Build on Dr. Arifa's ideas or add a new angle.
- Avoid unsupported institutional or personal citations.
- Keep each response to 2 concise sentences and no more than 45 words.`,
  },
  expert3: {
    id:    'expert3',
    name:  'Dr. Rakib',
    nameShort: 'R',
    role:  'Critic and questioner',
    model: 'openai/gpt-oss-20b',
    color: '#b45309',
    avatarClass: 'expert3-avatar',
    bubbleClass: 'bubble-expert3',
    system: `You are Dr. Rakib, a rigorous critic and questioner. Speak directly in English.
Rules:
- Speak in the first person; never narrate yourself in the third person.
- Challenge existing claims, offer alternative perspectives, and ask important questions.
- Keep the debate evidence-based.
- Avoid unsupported institutional or personal citations.
- Keep each response to 2 concise sentences and no more than 45 words.`,
  },
};

// ── Discussion phases ─────────────────────────
const DISCUSSION_PHASES = [
  { id: 'intro',     label: 'Introduction and foundations', rounds: 2, stance: 'discuss' },
  { id: 'analysis',  label: 'In-depth analysis', rounds: 3, stance: 'discuss' },
  { id: 'debate',    label: 'Debate and rebuttal', rounds: 3, stance: 'debate' },
  { id: 'synthesis', label: 'Synthesis', rounds: 2, stance: 'synthesis' },
  { id: 'conclude',  label: 'Conclusion', rounds: 1, stance: 'synthesis' },
];

const STANCE_LABELS = {
  discuss:   { label: '💬 Discussion', class: 'stance-discuss' },
  debate:    { label: '⚔️ Debate', class: 'stance-debate' },
  critique:  { label: '🔍 Critique', class: 'stance-critique' },
  synthesis: { label: '🔗 Synthesis', class: 'stance-synthesis'},
};

const TURN_ORDER = ['expert1', 'expert2', 'expert3'];

const ALL_EXPERT_PREFIXES = [
  'Dr. Arifa','Dr. Nafisa','Dr. Rakib',
];

// ── State ─────────────────────────────────────
let sessionTopic       = '';
let isRunning          = false;
let isPaused           = false;
let ttsEnabled         = true;
let sessionSeconds     = 0;
let timerInterval      = null;
let currentTurnIndex   = 0;
let dialogueLog        = [];
let initialContent     = null;
let uploadedFiles      = [];
let currentPhaseIdx    = 0;
let currentPhaseRound  = 0;
let userPendingMsg     = null;
let userInterrupted    = false;
let agentVoiceMap      = { expert1: null, expert2: null, expert3: null };

const AGENT_TTS = {
  expert1: { rate: 0.97, pitch: 1.00 },
  expert2: { rate: 0.98, pitch: 1.02 },
  expert3: { rate: 0.96, pitch: 0.98 },
};

const EXPERT_AZURE_VOICES = {
  expert1: { voice: 'en-US-GuyNeural',   rate: '-5%', pitch: '-5%'  },
  expert2: { voice: 'en-US-JennyNeural', rate: '0%',  pitch: '+8%'  },
  expert3: { voice: 'en-US-DavisNeural', rate: '+5%', pitch: '-12%' },
};

// ── DOM ───────────────────────────────────────
const uploadScreen    = document.getElementById('upload-screen');
const deeplearnScreen = document.getElementById('deeplearn-screen');
const backToPreviousPage = document.getElementById('backToPreviousPage');
const uploadZone      = document.getElementById('uploadZone');
const fileInput       = document.getElementById('fileInput');
const uploadPreviews  = document.getElementById('uploadPreviews');
const topicInput      = document.getElementById('topicInput');
const startBtn        = document.getElementById('startBtn');
const stageTopic      = document.getElementById('stageTopic');
const stageIdle       = document.getElementById('stageIdle');
const debateStage     = document.getElementById('debateStage');
const ttsWave         = document.getElementById('ttsWave');
const ttsLabel        = document.getElementById('ttsLabel');
const ttsToggle       = document.getElementById('ttsToggle');
const chatMessages    = document.getElementById('chatMessages');
const userInput       = document.getElementById('userInput');
const sendBtn         = document.getElementById('sendBtn');
const pauseInputBtn   = document.getElementById('pauseInputBtn');
const pauseBtn        = document.getElementById('pauseBtn');
const exportBtn       = document.getElementById('exportBtn');
const resetBtn        = document.getElementById('resetBtn');
const sessionTimer    = document.getElementById('sessionTimer');
const phaseLabel      = document.getElementById('phaseLabel');
const refsBody        = document.getElementById('refsBody');
const topicGifFrame   = document.getElementById('topicGifFrame');
const topicGifCredit  = document.getElementById('topicGifCredit');
let topicGifs = [];
let topicGifIndex = 0;
let referenceSearchController = null;

backToPreviousPage.addEventListener('click', event => {
  event.preventDefault();
  if (window.history.length > 1 && document.referrer) window.history.back();
  else window.location.assign('/index.html');
});

// ── Auto-fill topic from URL param (passed by classroom page) ──
(function () {
  try {
    const params = new URLSearchParams(location.search);
    const t = params.get('topic');
    if (t) topicInput.value = decodeURIComponent(t);
  } catch (e) {}
})();

// ── Upload Zone ─────────────────────────────
uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  handleFiles(Array.from(e.dataTransfer.files));
});
fileInput.addEventListener('change', () => handleFiles(Array.from(fileInput.files)));

function handleFiles(files) {
  uploadedFiles = files.slice(0, 3);
  uploadPreviews.innerHTML = '';
  if (uploadedFiles.length > 0) {
    uploadPreviews.classList.remove('hidden');
    uploadedFiles.forEach(file => {
      const box = document.createElement('div');
      box.className = 'preview-file';
      box.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span>${file.name.slice(0, 14)}...</span>`;
      uploadPreviews.appendChild(box);
    });
  } else {
    uploadPreviews.classList.add('hidden');
  }
}

async function toBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result.split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ── Start ─────────────────────────────────────
startBtn.addEventListener('click', async () => {
  const topic = topicInput.value.trim();
  if (!topic && uploadedFiles.length === 0) {
    alert('Please enter a topic or upload a file.');
    return;
  }
  
  sessionTopic = topic || uploadedFiles.map(f => f.name).join(', ');
  await switchToDeepLearn();
});

async function switchToDeepLearn() {
  uploadScreen.classList.remove('active');
  deeplearnScreen.classList.add('active');
  stageTopic.textContent = sessionTopic;
  startTimer();
  loadVoices();
  searchReferences(sessionTopic);
  searchTopicGif(sessionTopic);
  await startDiscussion();
}

async function searchReferences(query) {
  referenceSearchController?.abort();
  const controller = new AbortController();
  referenceSearchController = controller;
  refsBody.replaceChildren();
  const loading = document.createElement('div');
  loading.className = 'refs-loading';
  loading.setAttribute('role', 'status');
  loading.textContent = 'Searching arXiv and research papers…';
  refsBody.appendChild(loading);

  try {
    const response = await fetch(`/research/references?q=${encodeURIComponent(query)}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || `Reference search failed (${response.status}).`);
    if (controller.signal.aborted) return;

    refsBody.replaceChildren();
    if (data.results.length === 0) {
      refsBody.appendChild(createReferenceMessage(`No papers found for “${query}”. Try a broader topic.`));
      return;
    }

    for (const paper of data.results) {
      refsBody.appendChild(createReferenceCard(paper));
    }
    if (data.unavailable_sources?.length) {
      refsBody.appendChild(createReferenceMessage(
        `Some sources could not be reached: ${data.unavailable_sources.join(', ')}.`
      ));
    }
  } catch (error) {
    if (error.name === 'AbortError') return;
    console.error('[DeepLearn references]', error);
    refsBody.replaceChildren(createReferenceMessage(error.message || 'Could not search for research papers.'));
    const retry = document.createElement('button');
    retry.className = 'refs-retry';
    retry.type = 'button';
    retry.textContent = 'Retry search';
    retry.addEventListener('click', () => searchReferences(query));
    refsBody.appendChild(retry);
  }
}

function createReferenceMessage(message) {
  const el = document.createElement('div');
  el.className = 'refs-empty';
  el.textContent = message;
  return el;
}

function createReferenceCard(paper) {
  const card = document.createElement('article');
  card.className = 'ref-card';

  const source = document.createElement('div');
  source.className = 'ref-card-source';
  source.textContent = [paper.source, paper.year].filter(Boolean).join(' · ');
  card.appendChild(source);

  const title = document.createElement('div');
  title.className = 'ref-card-title';
  title.textContent = paper.title;
  card.appendChild(title);

  if (paper.authors?.length) {
    const authors = document.createElement('div');
    authors.className = 'ref-card-snippet';
    authors.textContent = paper.authors.slice(0, 3).join(', ')
      + (paper.authors.length > 3 ? ', et al.' : '');
    card.appendChild(authors);
  }

  if (paper.abstract) {
    const abstract = document.createElement('div');
    abstract.className = 'ref-card-snippet';
    abstract.textContent = paper.abstract;
    card.appendChild(abstract);
  }

  if (paper.url && /^https?:\/\//i.test(paper.url)) {
    const link = document.createElement('a');
    link.className = 'ref-card-link';
    link.href = paper.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'View paper ↗';
    card.appendChild(link);
  }
  return card;
}

async function searchTopicGif(query) {
  topicGifs = [];
  topicGifIndex = 0;
  document.getElementById('topicGifNext')?.classList.add('hidden');
  topicGifFrame.replaceChildren();
  topicGifCredit.classList.add('hidden');
  const status = document.createElement('div');
  status.className = 'topic-gif-status';
  status.setAttribute('role', 'status');
  status.textContent = 'Finding a GIF related to your topic…';
  topicGifFrame.appendChild(status);

  try {
    const response = await fetch(`/research/gifs?q=${encodeURIComponent(query)}`, {
      headers: { Accept: 'application/json' },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail || `GIF search failed (${response.status}).`);
    topicGifs = data.results;
    topicGifIndex = 0;
    if (!topicGifs.length) {
      status.textContent = 'No relevant GIFs were found for this topic.';
      return;
    }
    renderTopicGif();
  } catch (error) {
    console.error('[DeepLearn GIFs]', error);
    status.textContent = error.message || 'Could not search for related GIFs.';
    const retry = document.createElement('button');
    retry.className = 'topic-gif-retry';
    retry.type = 'button';
    retry.textContent = 'Retry';
    retry.addEventListener('click', () => searchTopicGif(query));
    topicGifFrame.appendChild(retry);
  }
}

function renderTopicGif() {
  const gif = topicGifs[topicGifIndex];
  if (!gif) return;

  const image = document.createElement('img');
  image.className = 'topic-gif-image';
  image.src = gif.image_url;
  image.alt = gif.title;
  image.loading = 'lazy';
  image.decoding = 'async';
  image.addEventListener('error', () => {
    if (topicGifIndex + 1 < topicGifs.length) {
      topicGifIndex++;
      renderTopicGif();
    } else {
      const status = document.createElement('div');
      status.className = 'topic-gif-status';
      status.textContent = 'The related GIF could not be loaded.';
      topicGifFrame.replaceChildren(status);
      topicGifCredit.classList.add('hidden');
    }
  }, { once: true });
  topicGifFrame.replaceChildren(image);

  topicGifCredit.replaceChildren();
  const attribution = document.createElement('span');
  attribution.textContent = [gif.artist, gif.license].filter(Boolean).join(' · ') || 'Wikimedia Commons';
  topicGifCredit.appendChild(attribution);

  const fileLink = document.createElement('a');
  fileLink.href = gif.file_url;
  fileLink.target = '_blank';
  fileLink.rel = 'noopener noreferrer';
  fileLink.textContent = 'Source';
  fileLink.setAttribute('aria-label', `GIF source and license: ${gif.title}`);
  topicGifCredit.appendChild(fileLink);
  topicGifCredit.classList.remove('hidden');

  let nextButton = document.getElementById('topicGifNext');
  if (!nextButton && topicGifs.length > 1) {
    nextButton = document.createElement('button');
    nextButton.id = 'topicGifNext';
    nextButton.className = 'topic-gif-retry';
    nextButton.type = 'button';
    nextButton.addEventListener('click', () => {
      topicGifIndex = (topicGifIndex + 1) % topicGifs.length;
      renderTopicGif();
    });
    topicGifCredit.after(nextButton);
  }
  if (nextButton) {
    nextButton.textContent = `Next GIF (${topicGifIndex + 1}/${topicGifs.length})`;
    nextButton.classList.toggle('hidden', topicGifs.length <= 1);
  }
}

// ── Timer ─────────────────────────────────────
function startTimer() {
  sessionSeconds = 0;
  timerInterval = setInterval(() => {
    if (!isPaused) sessionSeconds++;
    const m = String(Math.floor(sessionSeconds / 60)).padStart(2, '0');
    const s = String(sessionSeconds % 60).padStart(2, '0');
    sessionTimer.textContent = toEnglishNumerals(`${m}:${s}`);
  }, 1000);
}

function toEnglishNumerals(str) { return str; }

// ── Voices ────────────────────────────────────
function loadVoices() {
  const assign = () => {
    const all = speechSynthesis.getVoices();
    const enAll = all.filter(v => /^en(?:-|$)/i.test(v.lang));
    if (!enAll.length) {
      Object.keys(EXPERTS).forEach(id => { agentVoiceMap[id] = all[0] || null; });
      return;
    }
    const naturalVoiceScore = voice => {
      let score = voice.localService === false ? 100 : 0;
      if (/natural|neural|online|enhanced/i.test(voice.name)) score += 1000;
      if (/google|aria|ava|jenny|guy|davis|sonia|ryan/i.test(voice.name)) score += 100;
      return score;
    };
    const ranked = [...enAll].sort((a, b) => naturalVoiceScore(b) - naturalVoiceScore(a));
    const used = new Set();
    const pick = pattern => {
      const voice = ranked.find(candidate => !used.has(candidate) && pattern.test(candidate.name))
        || ranked.find(candidate => !used.has(candidate))
        || ranked[0];
      if (voice) used.add(voice);
      return voice || null;
    };
    agentVoiceMap.expert1 = pick(/guy|david|mark|ryan|andrew|eric|male/i);
    agentVoiceMap.expert2 = pick(/aria|ava|jenny|zira|sara|susan|michelle|female/i);
    agentVoiceMap.expert3 = pick(/davis|guy|david|mark|ryan|andrew|eric|male/i);
  };
  assign();
  speechSynthesis.onvoiceschanged = assign;
}

// ── TTS ───────────────────────────────────────
async function speakAzure(text, expertId) {
  if (!_azureKey) {
    console.warn('[DeepLearn Azure] No key loaded — skipping Azure, going to browser fallback.');
    return false;
  }
  const cfg = EXPERT_AZURE_VOICES[expertId];
  const ssml = `<speak version='1.0' xml:lang='en-US'><voice name='${cfg.voice}'><prosody rate='${cfg.rate}' pitch='${cfg.pitch}'>${text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</prosody></voice></speak>`;

  try {
    ttsWave.classList.add('speaking');
    ttsLabel.textContent = EXPERTS[expertId].name + ' speaking…';

    const res = await fetch(`https://${_azureRegion}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': _azureKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      },
      body: ssml,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error(`[DeepLearn Azure] HTTP ${res.status} | region:${_azureRegion} | key prefix:${_azureKey.slice(0,6)} | body:`, errBody.slice(0, 300));
      ttsWave.classList.remove('speaking');
      return false;
    }

    const blob  = await res.blob();
    const url   = URL.createObjectURL(blob);
    const audio = new Audio(url);
    await new Promise(resolve => {
      audio.onended = () => { URL.revokeObjectURL(url); resolve(); };
      audio.onerror = (e) => { console.error('[DeepLearn Azure] audio playback error:', e); URL.revokeObjectURL(url); resolve(); };
      audio.play().catch(e => { console.error('[DeepLearn Azure] audio.play() rejected:', e.message); resolve(); });
    });

    ttsWave.classList.remove('speaking');
    ttsLabel.textContent = 'Muted';
    return true;
  } catch (e) {
    console.error('[DeepLearn Azure] fetch threw:', e.message);
    ttsWave.classList.remove('speaking');
    return false;
  }
}

function speakBrowser(text, expertId) {
  return new Promise(resolve => {
    const voice = agentVoiceMap[expertId];
    if (!voice) {
      console.warn('[DeepLearn Browser TTS] No browser voice available either — silent.');
      resolve();
      return;
    }
    const tts = AGENT_TTS[expertId];
    const utt   = new SpeechSynthesisUtterance(text);
    utt.voice   = voice;
    utt.lang    = voice.lang;
    utt.rate    = tts.rate;
    utt.pitch   = tts.pitch;
    ttsWave.classList.add('speaking');
    ttsLabel.textContent = EXPERTS[expertId].name + ' speaking…';
    utt.onend   = () => { ttsWave.classList.remove('speaking'); ttsLabel.textContent = 'Muted'; resolve(); };
    utt.onerror = (e) => { console.warn('[DeepLearn Browser TTS] error:', e.error); ttsWave.classList.remove('speaking'); ttsLabel.textContent = 'Muted'; resolve(); };
    speechSynthesis.speak(utt);
  });
}

async function speak(text, expertId) {
  if (!ttsEnabled || !text?.trim()) return;
  const azureOk = await speakAzure(text, expertId);
  if (!azureOk) {
    console.warn('[DeepLearn TTS] Azure failed or unavailable, falling back to browser voice.');
    await speakBrowser(text, expertId);
  }
}

ttsToggle.addEventListener('click', () => {
  ttsEnabled = !ttsEnabled;
  ttsToggle.classList.toggle('muted', !ttsEnabled);
  if (!ttsEnabled) {
    speechSynthesis.cancel();
    ttsWave.classList.remove('speaking');
    ttsLabel.textContent = 'Text-to-speech off';
  } else {
    ttsLabel.textContent = 'Muted';
  }
});

// ── Text Cleaning ─────────────────────────────
function cleanReply(text) {
  const escaped = ALL_EXPERT_PREFIXES.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const prefixPat = new RegExp(
    `^[\\s]*(?:\\*{0,2})(?:\\[)?(?:${escaped})(?:\\])?(?:\\*{0,2})[\\s]*:[\\s]*`, 'i'
  );
  let s = text.trim(), prev;
  do { prev = s; s = s.replace(prefixPat, '').trim(); } while (s !== prev);
  const midPat = new RegExp(
    `(?:\\n|\\r)+(?:\\*{0,2})(?:\\[)?(?:${escaped})(?:\\])?(?:\\*{0,2})[\\s]*:`, 'i'
  );
  const cut = s.search(midPat);
  if (cut > 0) s = s.slice(0, cut).trim();
  return s;
}

// ── Phase management ──────────────────────────
function getCurrentPhase() {
  return DISCUSSION_PHASES[currentPhaseIdx] || DISCUSSION_PHASES[DISCUSSION_PHASES.length - 1];
}

function advancePhase() {
  currentPhaseRound++;
  const phase = getCurrentPhase();
  if (currentPhaseRound >= phase.rounds * 3) { // *3 because 3 experts per round
    currentPhaseIdx   = Math.min(currentPhaseIdx + 1, DISCUSSION_PHASES.length - 1);
    currentPhaseRound = 0;
    insertPhaseDivider();
    updatePhaseUI();
  }
}

function updatePhaseUI() {
  const phase = getCurrentPhase();
  phaseLabel.textContent = phase.label;
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById(`phase${i}`);
    if (!el) continue;
    el.classList.remove('done', 'active');
    if (i - 1 < currentPhaseIdx)      el.classList.add('done');
    else if (i - 1 === currentPhaseIdx) el.classList.add('active');
  }
  for (let i = 1; i <= 5; i++) {
    const el = document.getElementById(`dd${i}`);
    if (!el) continue;
    el.classList.toggle('active', i - 1 <= currentPhaseIdx);
  }
}

// ── Expert speaking indicators ────────────────
function setExpertSpeaking(expertId) {
  document.querySelectorAll('.expert-card').forEach(c => c.classList.remove('speaking'));
  document.getElementById(`card-${expertId}`)?.classList.add('speaking');
}
function clearExpertSpeaking() {
  document.querySelectorAll('.expert-card').forEach(c => c.classList.remove('speaking'));
}

// ── Chat bubbles ──────────────────────────────
let typingBubbleEl = null;

function showTyping(expertId) {
  const expert = EXPERTS[expertId];
  typingBubbleEl = document.createElement('div');
  typingBubbleEl.className = `chat-bubble typing-bubble ${expert.bubbleClass}`;
  typingBubbleEl.innerHTML = `
    <div class="bubble-meta">
      <span class="bubble-dot" style="background:${expert.color}"></span>
      ${expert.name}
    </div>
    <div class="bubble-text">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
    </div>`;
  chatMessages.appendChild(typingBubbleEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addSystemBubble(text) {
  const div = document.createElement('div');
  div.className = 'chat-bubble bubble-system';
  const meta = document.createElement('div');
  meta.className = 'bubble-meta';
  meta.textContent = 'Discussion notice';
  const body = document.createElement('div');
  body.className = 'bubble-text';
  body.textContent = text;
  div.append(meta, body);
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTyping() {
  if (typingBubbleEl) { typingBubbleEl.remove(); typingBubbleEl = null; }
}

function addChatBubble(expertId, text) {
  const expert = EXPERTS[expertId];
  const div = document.createElement('div');
  div.className = `chat-bubble ${expert.bubbleClass}`;
  div.innerHTML = `
    <div class="bubble-meta">
      <span class="bubble-dot" style="background:${expert.color}"></span>
      ${expert.name}
    </div>
    <div class="bubble-text">${text}</div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function addUserBubble(text) {
  const div = document.createElement('div');
  div.className = 'chat-bubble bubble-user';
  div.innerHTML = `
    <div class="bubble-meta" style="justify-content:flex-end">You</div>
    <div class="bubble-text">${text}</div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function insertPhaseDivider() {
  const phase = DISCUSSION_PHASES[currentPhaseIdx] || {};
  const div = document.createElement('div');
  div.className = 'chat-phase-divider';
  div.innerHTML = `<div class="chat-phase-label">📍 ${phase.label || ''}</div>`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ── Stage display ─────────────────────────────
function showOnStage(expertId, text, stanceKey) {
  const expert = EXPERTS[expertId];
  const stance = STANCE_LABELS[stanceKey] || STANCE_LABELS.discuss;
  stageIdle.classList.add('hidden');
  debateStage.classList.remove('hidden');

  const card = document.createElement('div');
  card.className = `speaker-card ${expertId}`;
  card.innerHTML = `
    <div class="speaker-card-header">
      <div class="speaker-avatar-lg ${expert.avatarClass}">${expert.nameShort}</div>
      <div>
        <div class="speaker-name-lg" style="color:${expert.color}">${expert.name}</div>
        <div class="speaker-role-lg">${expert.role}</div>
      </div>
      <div class="speaker-stance ${stance.class}">${stance.label}</div>
    </div>
    <div class="speaker-text-lg">${text}</div>`;

  while (debateStage.children.length >= 2) {
    debateStage.removeChild(debateStage.firstChild);
  }
  debateStage.appendChild(card);
  debateStage.scrollTop = debateStage.scrollHeight;
}

// ── Build prompt ──────────────────────────────
async function buildInitialContent() {
  _config = await loadEnvConfig();
  // Index any uploaded PDFs first
  for (const file of uploadedFiles) {
    if (file.type === 'application/pdf') {
      await loadAndIndexPDF(file, msg => console.log('[PDF]', msg));
      if (!sessionTopic) sessionTopic = file.name.replace(/\.pdf$/i, '');
    }
  }

  const docCtx = getRelevantContext(sessionTopic || 'Main topic', 4000);
  const docBlock = docCtx ? `\n\nRelevant source material:\n${docCtx}` : '';
  const topicLine = sessionTopic ? `Topic: ${sessionTopic}` : 'Uploaded file content:';
  return `${topicLine}${docBlock}\n\nWhat are the most important and challenging aspects of this topic? Identify 3–5 key points for an expert-level discussion.`;
}

function buildMessagesForExpert(expertId) {
  const expert = EXPERTS[expertId];
  const phase  = getCurrentPhase();
  const previousTurn = dialogueLog.at(-1);

  if (dialogueLog.length === 0) {
    return [{
      role: 'user',
      content:
        `${typeof initialContent === 'string' ? initialContent : JSON.stringify(initialContent)}\n\n` +
        `You are ${expert.name}, the ${expert.role}. Make the opening contribution from your own perspective. ` +
        `Explain one core idea in 2 concise sentences, no more than 40 words.`,
    }];
  }

  const transcript = dialogueLog.slice(-12)
    .map(e => `[${e.name}]: ${e.text}`)
    .join('\n\n');

  const phaseInstruction = {
    intro:     'Explain the foundations, history, and core concepts of the topic.',
    analysis:  'Analyze the topic in depth, including causes, effects, processes, and evidence.',
    debate:    'Challenge existing claims, present opposing views, and debate the evidence.',
    synthesis: 'Combine the different perspectives into a coherent understanding.',
    conclude:  'Summarize the discussion and identify possible future directions.',
  }[phase.id] || '';

  const docCtx = getRelevantContext(
    `${sessionTopic} ${phaseInstruction} ${transcript.slice(-300)}`, 3000
  );
  const docBlock = docCtx ? `\nRelevant source material:\n${docCtx}\n` : '';

  return [{
    role: 'user',
    content:
      `Topic: ${sessionTopic}\n` +
      `Current phase: ${phase.label}\n` +
      `Instructions: ${phaseInstruction}\n` +
      `Your role: ${expert.role}\n` +
      `Previous contribution: ${previousTurn?.name || 'None'} said: ${previousTurn?.text || 'No contribution yet.'}\n` +
      `In 2 concise sentences (no more than 45 words), respond specifically to that contribution, then add a distinct insight from your role. ` +
      `Do not repeat or paraphrase earlier contributions; if you agree, extend the argument with new reasoning or evidence. ` +
      docBlock +
      `\nDiscussion so far:\n${transcript}\n\n` +
      `Respond as ${expert.name} with a concise, thoughtful contribution. ` +
      `Use the source material above where relevant, address another expert by name, and start directly without an introduction.`,
  }];
}

// ── Groq API call ─────────────────────────────

async function openRouterChat(messages, system, maxTokens = 200, temp = 0.8) {
  for (const model of OPENROUTER_MODELS) {
    for (let i = 0; i < openRouterKeys().length; i++) {
      try {
        const res = await fetch(`${openRouterBase()}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openRouterKeys()[i]}`,
            'HTTP-Referer': 'http://localhost',
            'X-Title': 'DeepLearn',
          },
          body: JSON.stringify({ model, max_tokens: maxTokens, temperature: temp,
            messages: [{ role: 'system', content: system }, ...messages] }),
        });
        if (!res.ok) { if (res.status === 429) await sleep(1000); throw new Error(`${res.status}`); }
        const d = await res.json();
        const text = d?.choices?.[0]?.message?.content || '';
        if (!text.trim()) throw new Error('Empty');
        return cleanReply(text.trim());
      } catch (e) { console.warn(`[OpenRouter] ${model} key${i+1}: ${e.message}`); }
    }
  }
  throw new Error('All OpenRouter keys failed');
}

async function callGroq(expertId, modelOverride) {
  const expert   = EXPERTS[expertId];
  const messages = buildMessagesForExpert(expertId);

  // Try OpenRouter first
  try { return await openRouterChat(messages, expert.system); } catch (e) {
    console.warn('[callGroq] OpenRouter failed, falling back to Groq:', e.message);
  }

  // Groq fallback — rotate models × keys
  const models = modelOverride ? [modelOverride] : [expert.model, ...GROQ_MODELS.filter(model => model !== expert.model)];
  for (const model of models) {
    for (let ki = 0; ki < groqKeys().length; ki++) {
      try {
        const payload = {
          model,
          max_tokens: 200,
          temperature: 0.8,
          messages: [{ role: 'system', content: expert.system }, ...messages],
        };
        if (model.includes('gpt-oss')) {
          payload.reasoning_effort = 'low';
        } else if (model.includes('qwen/')) {
          payload.reasoning_effort = 'none';
        }

        const res = await fetch(`${groqBase()}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKeys()[ki]}` },
          body: JSON.stringify(payload),
        });
        if (res.status === 429) { await sleep(400); continue; }
        if (!res.ok) continue;
        const d = await res.json();
        const text = d?.choices?.[0]?.message?.content || '';
        if (!text.trim()) continue;
        return cleanReply(text.trim());
      } catch (e) { console.warn(`[Groq] ${model} key${ki+1}: ${e.message}`); }
    }
  }
  throw new Error('All configured OpenRouter and Groq API keys failed.');
}

// ── Knowledge fetch (enrichment panel) ────────
async function fetchKnowledgeInsert(topic, phaseId) {
  if (phaseId !== 'analysis' && phaseId !== 'debate') return null;

  const prompt = `Topic: "${topic}"

Provide 2–3 useful English insights based on recent research and factual information about this topic.
- Include relevant educational platforms, scientific journals, or online courses.
- Do not invent institution or author names.
- Return only JSON: {"insight":"2–3 sentences in English","sources":["source type 1","source type 2"]}`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${groqKeys()[0] || ''}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        max_tokens: 300,
        temperature: 0.5,
        reasoning_effort: 'low',
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await res.json();
    if (!res.ok) return null;
    return JSON.parse(data.choices?.[0]?.message?.content || '{}');
  } catch (e) {
    return null;
  }
}

function showKnowledgeInsert(insight, sources) {
  if (!insight) return;
  const div = document.createElement('div');
  div.className = 'knowledge-insert';
  const chips = (sources || []).map(s => `<span class="ks-chip">${s}</span>`).join('');
  div.innerHTML = `
    <div class="knowledge-header">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      Research insights
    </div>
    <div class="knowledge-body">${insight}</div>
    ${chips ? `<div class="knowledge-sources">${chips}</div>` : ''}`;

  while (debateStage.children.length >= 2) {
    debateStage.removeChild(debateStage.firstChild);
  }
  debateStage.appendChild(div);
  debateStage.scrollTop = debateStage.scrollHeight;
}

// ── Main loop ─────────────────────────────────
async function startDiscussion() {
  isRunning         = true;
  currentTurnIndex  = 0;
  currentPhaseIdx   = 0;
  currentPhaseRound = 0;
  dialogueLog       = [];
  chatMessages.innerHTML = '';
  initialContent    = await buildInitialContent();

  userInput.disabled     = false;
  sendBtn.disabled       = false;
  pauseInputBtn.disabled = false;

  insertPhaseDivider();
  updatePhaseUI();
  runLoop();
}

async function runLoop() {
  while (isRunning) {
    if (isPaused) { await sleep(400); continue; }

    if (userInterrupted && userPendingMsg) {
      await handleUserTurn();
      continue;
    }

    const expertId = TURN_ORDER[currentTurnIndex % TURN_ORDER.length];
    await runExpertTurn(expertId);
    currentTurnIndex++;
    advancePhase();
    updatePhaseUI();

    if (isRunning && !isPaused) await sleep(1000);
  }
}

async function runExpertTurn(expertId) {
  const expert = EXPERTS[expertId];
  const phase  = getCurrentPhase();

  setExpertSpeaking(expertId);
  showTyping(expertId);

  let reply = '';
  try {
    const shouldInsert = (currentTurnIndex % 9 === 4) && (phase.id === 'analysis' || phase.id === 'debate');
    if (shouldInsert && expertId === 'expert2') {
      const knowledge = await fetchKnowledgeInsert(sessionTopic, phase.id);
      if (knowledge?.insight) {
        showKnowledgeInsert(knowledge.insight, knowledge.sources);
        await sleep(2000);
      }
    }
    reply = await callGroq(expertId);
    const recentExpertTurns = dialogueLog.filter(entry => entry.name !== 'You').slice(-3);
    const repeatsRecentTurn = text => recentExpertTurns.some(entry => normalizedReply(text) === normalizedReply(entry.text));
    if (repeatsRecentTurn(reply)) {
      console.warn(`[DeepLearn] ${expert.name} repeated a recent response; requesting a new contribution.`);
      reply = await callGroq(expertId, EXPERTS[expertId].model);
      if (repeatsRecentTurn(reply)) {
        throw new Error(`${expert.name} returned a recent response twice. Please retry the discussion.`);
      }
    }
  } catch (err) {
    console.error(err);
    hideTyping();
    clearExpertSpeaking();
    if (err instanceof Error && err.message.includes('returned a recent response twice')) {
      addSystemBubble(`${expert.name} repeated an earlier point and could not provide a distinct contribution. The discussion will continue with the next expert.`);
    }
    await sleep(1200);
    return;
  }

  hideTyping();
  dialogueLog.push({ name: expert.name, text: reply });
  if (dialogueLog.length > 24) dialogueLog = dialogueLog.slice(-24);

  const stanceKey = expertId === 'expert3' && phase.id === 'debate' ? 'critique'
                  : phase.id === 'debate' ? 'debate'
                  : phase.id === 'synthesis' || phase.id === 'conclude' ? 'synthesis'
                  : 'discuss';

  showOnStage(expertId, reply, stanceKey);
  addChatBubble(expertId, reply);
  await speak(reply, expertId);
  clearExpertSpeaking();
}

function normalizedReply(text) {
  return cleanReply(text).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

async function handleUserTurn() {
  const msg       = userPendingMsg;
  userPendingMsg  = null;
  userInterrupted = false;
  dialogueLog.push({ name: 'You', text: msg });
  for (const id of TURN_ORDER) {
    if (!isRunning) break;
    await runExpertTurn(id);
    advancePhase();
    if (isRunning) await sleep(600);
  }
  currentTurnIndex = 0;
}

// ── User input ────────────────────────────────
sendBtn.addEventListener('click', submitUserMsg);
userInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitUserMsg(); });

function submitUserMsg() {
  const msg = userInput.value.trim();
  if (!msg || !isRunning) return;
  userInput.value = '';
  addUserBubble(msg);
  userPendingMsg  = msg;
  userInterrupted = true;
  isPaused        = false;
  pauseBtn.textContent = 'Pause';
  pauseInputBtn.classList.remove('active');
}

// ── Pause ─────────────────────────────────────
pauseBtn.addEventListener('click', togglePause);
pauseInputBtn.addEventListener('click', togglePause);

function togglePause() {
  isPaused = !isPaused;
  pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
  pauseInputBtn.classList.toggle('active', isPaused);
  if (isPaused) {
    speechSynthesis.cancel();
    ttsWave.classList.remove('speaking');
    ttsLabel.textContent = 'Paused';
  } else {
    ttsLabel.textContent = 'Muted';
  }
}

// ── Export ────────────────────────────────────
exportBtn.addEventListener('click', () => {
  const lines = dialogueLog.map(e => `[${e.name}]: ${e.text}`).join('\n\n');
  const blob = new Blob(
    [`DeepLearn Discussion\nTopic: ${sessionTopic}\n\n${lines}`],
    { type: 'text/plain;charset=utf-8' }
  );
  const a = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `deeplearn_${sessionTopic.slice(0, 20)}_${Date.now()}.txt`;
  a.click();
});

// ── Reset ─────────────────────────────────────
resetBtn.addEventListener('click', () => {
  if (!confirm('End this discussion?')) return;
  isRunning = false;
  isPaused  = false;
  speechSynthesis.cancel();
  clearInterval(timerInterval);
  deeplearnScreen.classList.remove('active');
  uploadScreen.classList.add('active');
  dialogueLog    = [];
  chatMessages.innerHTML = '<div class="chat-welcome">The full discussion will appear here when it begins.</div>';
  debateStage.innerHTML  = '';
  debateStage.classList.add('hidden');
  stageIdle.classList.remove('hidden');
  currentPhaseIdx   = 0;
  currentPhaseRound = 0;
  updatePhaseUI();
});

// ── Helpers ───────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }