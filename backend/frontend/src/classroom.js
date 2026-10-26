// ══════════════════════════════════════════════
//  AI Classroom — classroom.js
//  4 AI agents · Felcloud model proxy
//  PDF pipeline: pdf.js + TF-IDF VectorStore
//  Generative UI slides · laser pointer
// ══════════════════════════════════════════════

import { loadEnvConfig } from './env-config.js';
import { felcloudChatCompletion, getFelcloudConfig } from './felcloud-client.js';

// ── Load config from server (keys never hardcoded in bundle) ──────
let _config = {};
loadEnvConfig().then(cfg => { _config = cfg; });


// ── PDF Pipeline Config ───────────────────────
const CHUNK_WORDS   = 150;  // was 300 — smaller chunks = better retrieval
const CHUNK_OVERLAP = 30;   // was 60
const MAX_PAGES     = 60;   // was 40
const TOP_K         = 6;    // was 4 — retrieve more chunks
const PAGE_SCALE    = 2.0;
const IMG_QUALITY   = 0.85;

// ── Agent Config ──────────────────────────────
const AGENTS = {
  teacher: {
    id:    'teacher',
    name:  'Teacher',
    role:  'Lesson guide',
    color: '#1e2a2b',
    system: `You are a warm, experienced school teacher. Teach clearly in the first person, as if speaking to a student in class.

Rules:
✗ Never refer to yourself in the third person or narrate another character.
✗ Do not ask yourself rhetorical questions.
✗ Avoid greetings, flattery, and filler praise.
✓ Explain difficult ideas with simple examples.
✓ Respond only in English.`,
  },
  curious: {
    id:    'curious',
    name:  'Alex',
    role:  'Curious student',
    color: '#2563eb',
    system: `You are Alex, an enthusiastic ninth-grade student.

Rules:
✗ Do not use third person, thanks, or praise.
✗ Do not repeat information already covered.
✗ Do not refer to a document; respond naturally.
✓ Respond in exactly one sentence in English.`,
  },
  skeptic: {
    id:    'skeptic',
    name:  'Jordan',
    role:  'Thoughtful student',
    color: '#dc2626',
    system: `You are Jordan, a thoughtful ninth-grade student.

Rules:
✗ Do not use third person, thanks, or praise.
✗ Do not repeat information already covered.
✗ Do not refer to a document; respond naturally.
✓ Respond in exactly one English sentence that begins with a thoughtful question or challenge.`,
  },
  achiever: {
    id:    'achiever',
    name:  'Sam',
    role:  'Advanced student',
    color: '#16a34a',
    system: `You are Sam, an advanced ninth-grade student.

Rules:
✗ Do not use third person, thanks, or praise.
✗ Do not repeat information already covered.
✗ Do not refer to a document; respond naturally.
✓ Respond in exactly one English sentence and add a new insight to the discussion.`,
  },
};

const TURN_ORDER = ['teacher', 'curious', 'skeptic', 'achiever'];

const ALL_NAME_PREFIXES = [
  'Teacher', 'teacher',
  'Alex', 'alex',
  'Jordan', 'jordan',
  'Sam', 'sam',
];

const AGENT_TTS = {
  teacher: { rate: 0.87, pitch: 1.00 },
  curious: { rate: 1.05, pitch: 1.20 },
  skeptic: { rate: 0.88, pitch: 0.82 },
  achiever:{ rate: 1.02, pitch: 1.25 },
};

// ── State ─────────────────────────────────────
let sessionTopic       = '';
let isRunning          = false;
let isPaused           = false;
const pauseReasons     = new Set();
let ttsEnabled         = true;
let userInterrupted    = false;
let pendingUserMessage = null;
let sessionSeconds     = 0;
let timerInterval      = null;
let currentUtterance   = null;
let currentSpeaker     = null;
let ttsWatchdogControl = null;
let currentTtsFinish   = null;
let currentTurnIndex   = 0;
let dialogueLog        = [];
let agentVoiceMap      = { teacher: null, curious: null, skeptic: null, achiever: null };
let turnLoopRunning    = false;
let lessonStarting     = false;
let _turnInProgress = false;



// ══════════════════════════════════════════════
//  DUCKDB DATA WAREHOUSE
// ══════════════════════════════════════════════
let db = null, dbConn = null;
const SESSION_ID = `sess_${Date.now()}`;
const DUCKDB_CDN = 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.29.0/dist/';

async function loadDuckDbModule() {
  if (globalThis.duckdb) return globalThis.duckdb;
  const moduleUrls = [
    `${DUCKDB_CDN}duckdb-browser.mjs`,
  ];
  for (const url of moduleUrls) {
    try {
      const mod = await import(url);
      globalThis.duckdb = mod;
      console.log('[DuckDB] module loaded from', url);
      return mod;
    } catch (e) {
      console.warn('[DuckDB] failed to import', url, e?.message || e);
    }
  }
  throw new Error('Could not load DuckDB module from CDN');
}

async function initDuckDB() {
  try {
    const duckdb = await loadDuckDbModule();
    const bundle = await duckdb.selectBundle({
      mvp: { mainModule: DUCKDB_CDN + 'duckdb-mvp.wasm', mainWorker: DUCKDB_CDN + 'duckdb-browser-mvp.worker.js' },
      eh:  { mainModule: DUCKDB_CDN + 'duckdb-eh.wasm',  mainWorker: DUCKDB_CDN + 'duckdb-browser-eh.worker.js'  },
    });
    const worker = new Worker(bundle.mainWorker);
    const logger = new duckdb.ConsoleLogger();
    db = new duckdb.AsyncDuckDB(logger, worker);
    await db.instantiate(bundle.mainModule);
    dbConn = await db.connect();
    await dbConn.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        session_id VARCHAR, topic VARCHAR, started_at TIMESTAMP, difficulty VARCHAR
      );
      CREATE TABLE IF NOT EXISTS dialogue_turns (
        session_id VARCHAR, agent VARCHAR, text VARCHAR, turn_index INTEGER, ts TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS quiz_results (
        session_id VARCHAR, bloom VARCHAR, topic VARCHAR, correct BOOLEAN,
        hint_used BOOLEAN, response_ms INTEGER, ts TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS checkins (
        session_id VARCHAR, choice VARCHAR, ts TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS assessor_log (
        session_id VARCHAR, level VARCHAR, reason VARCHAR, ts TIMESTAMP
      );
    `);
    await dbConn.query(`
      INSERT INTO sessions VALUES ('${SESSION_ID}', '${sessionTopic}', NOW(), 'medium')
    `);
    console.log('[DuckDB] ✓ warehouse ready');
  } catch(e) {
    console.warn('[DuckDB] failed to init:', e.message);
  }
}

async function dbLog(table, values) {
  if (!dbConn) return;
  try {
    const cols = Object.keys(values).join(', ');
    const vals = Object.values(values).map(v =>
      v === null ? 'NULL' :
      typeof v === 'boolean' ? v :
      typeof v === 'number' ? v :
      `'${String(v).replace(/'/g, "''")}'`
    ).join(', ');
    await dbConn.query(`INSERT INTO ${table} (${cols}) VALUES (${vals})`);
  } catch(e) {
    console.warn(`[DuckDB] insert ${table} failed:`, e.message);
  }
}

async function exportWarehouse() {
  if (!dbConn) return;
  const tables = ['sessions','dialogue_turns','quiz_results','checkins','assessor_log'];
  let out = '';
  for (const t of tables) {
    const res = await dbConn.query(`SELECT * FROM ${t}`);
    out += `\n=== ${t} ===\n` + JSON.stringify(res.toArray(), null, 2) + '\n';
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([out], { type: 'application/json' }));
  a.download = `warehouse_${SESSION_ID}.json`;
  a.click();
}


// ── Adaptive depth ────────────────────────────
let difficultyLevel   = 'medium';
let turnsSinceCheckin = 0;
const CHECKIN_EVERY_N = 6;

// ── Human performance log ─────────────────────
const humanLog = { checkins: [], mcqResults: [], typedMessages: [] };



// ══════════════════════════════════════════════
//  TF-IDF VECTOR STORE
// ══════════════════════════════════════════════

class VectorStore {
  constructor() { this.reset(); }
  reset() { this.chunks = []; this.tfidf = []; this.idf = {}; this.vocab = new Set(); this.ready = false; }

  tokenize(text) {
    return text.toLowerCase()
      .replace(/[.,!?;:()\[\]{}"'\/\\]/g, ' ')
      .split(/\s+/).filter(t => t.length > 1);
  }

  build() {
    const tfRaw = this.chunks.map(c => {
      const tokens = this.tokenize(c.text);
      const freq = {};
      for (const t of tokens) { freq[t] = (freq[t] || 0) + 1; this.vocab.add(t); }
      const maxF = Math.max(1, ...Object.values(freq));
      const tf = {};
      for (const [t, f] of Object.entries(freq)) tf[t] = f / maxF;
      return tf;
    });
    const N = this.chunks.length;
    const df = {};
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
    const tokens = this.tokenize(text);
    const freq = {};
    for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
    const maxF = Math.max(1, ...Object.values(freq));
    const v = {};
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
        const maxSim = selected.length
          ? Math.max(...selected.map(s => this.cosine(this.tfidf[r.i], this.tfidf[s.i])))
          : 0;
        const sc = lambda * r.rel - (1 - lambda) * maxSim;
        if (sc > best) { best = sc; bi = j; }
      }
      selected.push(remaining[bi]);
      remaining.splice(bi, 1);
    }
    return selected.filter(s => s.rel > 0).map(s => ({ ...this.chunks[s.i], chunkIdx: s.i, score: s.rel }));
  }
}

const store = new VectorStore();
let pdfPages = [];

function chunkText(text, pageNum) {
  const sentences = text.replace(/([..!?])\s+/g, '$1\n').split('\n').map(s => s.trim()).filter(s => s.length > 4);
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
  if (!store.ready || !store.chunks.length) {
    return pdfPages.map(p => `[Page ${p.page}]\n${p.text}`).join('\n\n').slice(0, maxChars);
  }
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

// ══════════════════════════════════════════════
//  GROQ API — single source of truth for all AI
// ══════════════════════════════════════════════

/**
 * Core Groq call — rotates keys AND models on 429/error.
 * Returns the assistant message text.
 */

async function openRouterChat(messages, system, maxTokens = 1000, temp = 0.7) {
  return felcloudChatCompletion([
    { role: 'system', content: system }, ...messages,
  ], { tier: 'midsize', maxTokens, temperature: temp });
}

async function groqOnlyChat(messages, system, maxTokens = 500, temp = 0.78) {
  return openRouterChat(messages, system, maxTokens, temp);
}

async function groqChat(messages, system, maxTokens = 500, temp = 0.78) {
  return groqOnlyChat(messages, system, maxTokens, temp);
}

async function groqJsonChat(messages, system, maxTokens = 600, temp = 0.3) {
  const raw = await groqChat(messages, system, maxTokens, temp);
  const clean = raw.replace(/```json|```/g, '').trim();
  const match = clean.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (!match) throw new Error('Felcloud did not return valid JSON.');
  return JSON.parse(match[0]);
}

// OCR via Felcloud vision model ───────────────────────
const _ocrQueue = [];
let _ocrRunning = false;

async function queuedOCR(base64Img, pageNum) {
  return new Promise((resolve, reject) => {
    _ocrQueue.push({ base64Img, pageNum, resolve, reject });
    if (!_ocrRunning) drainOCRQueue();
  });
}

async function drainOCRQueue() {
  _ocrRunning = true;
  while (_ocrQueue.length > 0) {
    const { base64Img, pageNum, resolve, reject } = _ocrQueue.shift();
    try { resolve(await groqVisionOCR(base64Img, pageNum)); }
    catch (e) { reject(e); }
    if (_ocrQueue.length > 0) await sleep(4000);
  }
  _ocrRunning = false;
}

async function groqVisionOCR(base64Img, pageNum) {
  const config = await getFelcloudConfig();
  const text = await felcloudChatCompletion([{
    role: 'user',
    content: [
      { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Img}` } },
      { type: 'text', text: 'Transcribe all text visible on this page exactly. Output only the raw text.' },
    ],
  }], { model: config.vision_model, maxTokens: 2048, temperature: 0 });
  if (!text.trim()) throw new Error(`Felcloud returned empty OCR for page ${pageNum}.`);
  return text;
}

//  TEXT CLEANING
// ══════════════════════════════════════════════

function _stripThinking(text) {
  if (!text) return text;
  return text
    .replace(/<think[^>]*>[\s\S]*?<\/think>/gi, '')
    .replace(/<thinking[^>]*>[\s\S]*?<\/thinking>/gi, '')
    .trim();
}

function cleanReply(text) {
  text = _stripThinking(text);
  const escaped   = ALL_NAME_PREFIXES.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const prefixPat = new RegExp(`^[\\s]*(?:\\*{0,2})(?:\\[)?(?:${escaped})(?:\\])?(?:\\*{0,2})[\\s]*:[\\s]*`, 'i');
  let s = text.trim(), prev;
  do { prev = s; s = s.replace(prefixPat, '').trim(); } while (s !== prev);
  const midPat = new RegExp(`(?:\\n|\\r)+(?:\\*{0,2})(?:\\[)?(?:${escaped})(?:\\])?(?:\\*{0,2})[\\s]*:`, 'i');
  const cut = s.search(midPat);
  if (cut > 0) s = s.slice(0, cut).trim();


  // Strip if model hallucinated a second speaker mid-response
  const speakerMidPattern = /[\n\r.!?]+[\s]*(?:Teacher|Alex|Jordan|Sam)[\s]*:/i;
  const midCut = s.search(speakerMidPattern);
  if (midCut > 10) s = s.slice(0, midCut).trim();

  // Strip incomplete sentences ending mid-word (no punctuation at end)
  if (!/[.?!]$/.test(s)) {
    const lastPunct = Math.max(s.lastIndexOf('.'), s.lastIndexOf('?'), s.lastIndexOf('!'));
    if (lastPunct > 30) s = s.slice(0, lastPunct + 1).trim();
  }


  return s;
}

// ══════════════════════════════════════════════
//  PDF EXTRACTION
// ══════════════════════════════════════════════

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

async function extractPageText(page) {
  const tc = await page.getTextContent();
  return tc.items.map(i => i.str).join(' ').trim();
}

async function pageToBase64(page) {
  const vp     = page.getViewport({ scale: PAGE_SCALE });
  const canvas = document.createElement('canvas');
  canvas.width = vp.width; canvas.height = vp.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
  return canvas.toDataURL('image/jpeg', IMG_QUALITY).split(',')[1];
}

async function detectPDFMode(doc) {
  const n = Math.min(5, doc.numPages);  // sample more pages
  let total = 0, pagesTested = 0;
  for (let i = 1; i <= n; i++) {
    const pg  = await doc.getPage(i);
    const len = (await extractPageText(pg)).length;
    total += len;
    pagesTested++;
  }
  const avg = total / pagesTested;
  console.log(`[PDF] avg chars/page: ${avg.toFixed(0)} → mode: ${avg < 50 ? 'image' : 'text'}`);
  return avg < 50 ? 'image' : 'text';  // was < 80, too aggressive
}

async function loadAndIndexPDF(file, onProgress) {
  store.reset();
  pdfPages = [];
  onProgress?.(0, 'Opening PDF…');

  const buf    = await file.arrayBuffer();
  const pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
  const pages  = Math.min(pdfDoc.numPages, MAX_PAGES);

  onProgress?.(5, 'Detecting PDF type…');
  const mode = await detectPDFMode(pdfDoc);
  console.log(`[PDF] mode: ${mode}, pages: ${pages}`);

  for (let i = 1; i <= pages; i++) {
    onProgress?.(
      Math.round((i / pages) * 80) + 5,
      `Page ${i}/${pages}${mode === 'image' ? ' (OCR)' : ''} reading…`
    );

    const pg = await pdfDoc.getPage(i);
    let pageText = '';

    // Always try native text extraction first regardless of mode
    pageText = await extractPageText(pg);
    console.log(`[PDF] page ${i} native text length: ${pageText.length}`);

    // Only use OCR if native text is truly empty
    if (pageText.trim().length < 30 && mode === 'image') {
      console.log(`[PDF] page ${i} falling back to OCR`);
      try {
        const b64 = await pageToBase64(pg);
        const ocrText = await queuedOCR(b64, i);
        if (ocrText && ocrText.trim().length > pageText.length) {
          pageText = ocrText;
        }
      } catch (e) {
        console.warn(`[PDF page ${i}] OCR failed: ${e.message}`);
      }
    }

    if (pageText.trim().length > 10) {
      pdfPages.push({ page: i, text: pageText });
      const chunks = chunkText(pageText, i);
      console.log(`[PDF] page ${i}: ${pageText.length} chars → ${chunks.length} chunks`);
      for (const c of chunks) store.addChunk(c);
    } else {
      console.warn(`[PDF] page ${i}: no usable text found`);
    }
  }

  onProgress?.(90, `Building index (${store.chunks.length} chunks)…`);
  await new Promise(r => setTimeout(r, 0));

  if (store.chunks.length === 0) {
    console.error('[PDF] No chunks indexed! PDF may be image-only and OCR failed.');
    onProgress?.(100, '⚠️ No text was found.');
    return;
  }

  store.build();
  onProgress?.(100, `Ready! (${store.chunks.length} chunks)`);
}

// ══════════════════════════════════════════════
//  TTS — per-agent voices with laser sync
// ══════════════════════════════════════════════

function loadAgentVoices() {
  const assign = () => {
    const all   = speechSynthesis.getVoices();
    const enAll = all.filter(v => /^en(?:-|$)/i.test(v.lang));
    if (!enAll.length) return;

    agentVoiceMap.teacher  = enAll[0];
    agentVoiceMap.curious  = enAll[1] || enAll[0];
    agentVoiceMap.skeptic  = enAll[2] || enAll[0];
    agentVoiceMap.achiever = enAll[3] || enAll[1] || enAll[0];

    console.log('[TTS] voices:', Object.entries(agentVoiceMap)
      .map(([k, v]) => `${k}:${v?.name}`).join(' | '));
  };
  assign();
  speechSynthesis.onvoiceschanged = assign;
}

// ── Global TTS lock — only ONE utterance may run at a time ──
// Every speak() call queues itself and waits for the lock before starting.
let _ttsLockResolve = null;
let _ttsLocked      = false;
let speechGeneration = 0;

function _acquireTtsLock() {
  if (!_ttsLocked) { _ttsLocked = true; return Promise.resolve(); }
  return new Promise(res => {
    const prev = _ttsLockResolve;
    _ttsLockResolve = () => { _ttsLocked = true; if (prev) prev(); res(); };
  });
}

function _releaseTtsLock() {
  _ttsLocked = false;
  if (_ttsLockResolve) { const cb = _ttsLockResolve; _ttsLockResolve = null; cb(); }
}

function setPauseReason(reason, paused) {
  const wasPaused = isPaused;
  if (paused) pauseReasons.add(reason);
  else pauseReasons.delete(reason);
  isPaused = pauseReasons.size > 0;
  if (pauseBtn) pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
  if (isPaused) {
    if (ttsLabel) {
      ttsLabel.textContent = pauseReasons.has('quiz') ? 'Quiz in progress…'
        : pauseReasons.has('raise-hand') ? 'Paused — your turn'
          : 'Paused';
    }
  }
  if (isPaused === wasPaused) return;

  if (isPaused) {
    speechSynthesis.pause();
    ttsWatchdogControl?.pause();
    clearInterval(timerInterval);
    timerInterval = null;
    if (ttsWave) ttsWave.classList.remove('speaking');
    if (ttsLabel) ttsLabel.textContent = 'Paused';
    hideLaser();
  } else {
    speechSynthesis.resume();
    ttsWatchdogControl?.resume();
    if (isRunning) runSessionTimer();
    if (currentSpeaker && currentUtterance) {
      if (ttsWave) ttsWave.classList.add('speaking');
      if (ttsLabel) ttsLabel.textContent = `${AGENTS[currentSpeaker].name} speaking…`;
    } else if (ttsLabel) {
      ttsLabel.textContent = 'Muted';
    }
  }
}

function cancelCurrentSpeech() {
  speechGeneration++;
  speechSynthesis.cancel();
  currentTtsFinish?.();
}

async function waitWhilePaused() {
  while (isPaused && isRunning) await sleep(100);
}

async function waitForActiveTime(ms, generation) {
  let remaining = ms;
  while (remaining > 0 && isRunning && generation === speechGeneration) {
    if (isPaused) {
      await sleep(100);
      continue;
    }
    const slice = Math.min(100, remaining);
    await sleep(slice);
    remaining -= slice;
  }
}

/**
 * speak() — fully blocking. The Promise does NOT resolve until the browser
 * confirms the utterance has actually finished playing (onend).
 * Uses a global lock so no second speak() can start while one is running.
 * If TTS is disabled or no voice, waits a character-count-based silent delay
 * so the rest of the turn still paces correctly.
 */
async function speak(text, agentId, useLaser = false) {
  await _acquireTtsLock();
  const generation = speechGeneration;
  const wasCanceled = () => generation !== speechGeneration || !isRunning;

  if (!ttsEnabled || !text?.trim()) {
    const wc = text ? text.trim().split(/\s+/).length : 0;
    const silentMs = Math.max(800, wc * 220);
    await waitForActiveTime(silentMs, generation);
    _releaseTtsLock();
    return;
  }

  let voice = agentVoiceMap[agentId];
  if (!voice) {
    const deadline = Date.now() + 3000;
    while (!voice && Date.now() < deadline && !wasCanceled()) {
      await sleep(150);
      voice = agentVoiceMap[agentId];
    }
  }

  if (!voice) {
    await waitWhilePaused();
    if (wasCanceled()) { _releaseTtsLock(); return; }
    const wc = text.trim().split(/\s+/).length;
    await waitForActiveTime(Math.max(800, wc * 220), generation);
    _releaseTtsLock();
    return;
  }

  await waitWhilePaused();
  if (wasCanceled()) { _releaseTtsLock(); return; }

  speechSynthesis.cancel();
  await sleep(100);
  await waitWhilePaused();
  if (wasCanceled()) { _releaseTtsLock(); return; }

  return new Promise(resolve => {
    const tts = AGENT_TTS[agentId];
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate   = tts.rate;
    utt.pitch  = tts.pitch;
    utt.volume = 1;
    utt.lang   = voice.lang || 'en-US';
    utt.voice  = voice;
    currentUtterance = utt;
    currentSpeaker = agentId;

    if (ttsWave)  ttsWave.classList.add('speaking');
    if (ttsLabel) ttsLabel.textContent = AGENTS[agentId].name + ' speaking…';

    if (useLaser && laserWordSpans.length > 0) {
      laserActive = true;
      moveLaserToWord(0);
      utt.onboundary = (event) => {
        if (!laserActive || isPaused || event.name !== 'word') return;
        let acc = 0;
        for (let i = 0; i < laserWordSpans.length; i++) {
          if (event.charIndex <= acc + laserWordSpans[i].textContent.length) { moveLaserToWord(i); break; }
          acc += laserWordSpans[i].textContent.length + 1;
        }
      };
    }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearInterval(pollInterval);
      clearTimeout(watchdog);
      if (ttsWave)  ttsWave.classList.remove('speaking');
      if (ttsLabel) ttsLabel.textContent = isPaused ? 'Paused' : 'Muted';
      if (useLaser) hideLaser();
      currentUtterance = null;
      currentSpeaker = null;
      ttsWatchdogControl = null;
      if (currentTtsFinish === finish) currentTtsFinish = null;
      _releaseTtsLock();
      resolve();
    };
    currentTtsFinish = finish;

    const wc      = text.trim().split(/\s+/).length;
    const watchMs = Math.max(6000, Math.ceil((wc / tts.rate) * 700) + 3000);

    let watchdog = null;
    let watchdogRemaining = watchMs;
    let watchdogStartedAt = 0;
    const startWatchdog = () => {
      watchdogStartedAt = Date.now();
      watchdog = setTimeout(() => {
        watchdog = null;
        console.warn(`[TTS] watchdog fired for ${agentId} after ${watchMs}ms`);
        finish();
      }, watchdogRemaining);
    };
    ttsWatchdogControl = {
      pause() {
        if (watchdog === null) return;
        clearTimeout(watchdog);
        watchdog = null;
        watchdogRemaining = Math.max(0, watchdogRemaining - (Date.now() - watchdogStartedAt));
      },
      resume() {
        if (!finished && watchdog === null) startWatchdog();
      },
    };
    startWatchdog();

    // Poll every 200ms as backup — Chrome onend is unreliable
    const pollInterval = setInterval(() => {
      if (finished) { clearInterval(pollInterval); return; }
      if (!isPaused && !speechSynthesis.speaking && !speechSynthesis.pending) {
        console.log(`[TTS] poll detected end for ${agentId}`);
        finish();
      }
    }, 200);

    utt.onend = () => {
      console.log(`[TTS] onend fired for ${agentId}`);
      finish();
    };

    utt.onerror = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('[TTS] error:', e.error, 'agent:', agentId);
      }
      finish();
    };

    console.log(`[TTS] ▶ ${agentId} | ${voice.name} | ${wc}w | watchdog:${watchMs}ms`);
    speechSynthesis.speak(utt);

    // Chrome sometimes needs a kick if speaking hasn't started after 600ms
    setTimeout(() => {
      if (!finished && !isPaused && !speechSynthesis.speaking) {
        console.warn('[TTS] not speaking after 600ms, retrying');
        speechSynthesis.cancel();
        setTimeout(() => {
          if (!finished) speechSynthesis.speak(utt);
        }, 100);
      }
    }, 600);
  });
}

// ══════════════════════════════════════════════
//  RED LASER POINTER
// ══════════════════════════════════════════════

let laserEl = null, laserWordSpans = [], laserActive = false;

function injectLaserStyles() {
  if (document.getElementById('laser-style')) return;
  const s = document.createElement('style');
  s.id = 'laser-style';
  s.textContent = `
    @keyframes laserPulse{0%,100%{transform:translate(-50%,-50%) scale(1);opacity:0.92;}50%{transform:translate(-50%,-50%) scale(1.25);opacity:1;}}
    #laserPointer{position:absolute;width:14px;height:14px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ff6b6b,#dc2626 60%,#7f1d1d);box-shadow:0 0 0 3px rgba(220,38,38,0.25),0 0 12px 4px rgba(220,38,38,0.5);pointer-events:none;z-index:100;animation:laserPulse 0.8s ease-in-out infinite;transition:left 0.12s ease,top 0.12s ease;}
    #laserPointer.hidden{display:none;}
    .laser-word{display:inline;border-radius:3px;transition:background 0.1s;}
    .laser-word.lit{background:rgba(220,38,38,0.12);}`;
  document.head.appendChild(s);
}

function ensureLaser() {
  injectLaserStyles();
  if (laserEl) return;
  laserEl = document.createElement('div');
  laserEl.id = 'laserPointer';
  laserEl.classList.add('hidden');
  if (stageMessage) { stageMessage.style.position = 'relative'; stageMessage.appendChild(laserEl); }
}

function wrapWordsInSpans(text) {
  stageText.innerHTML = ''; laserWordSpans = [];
  text.split(/(\s+)/).forEach(token => {
    if (/^\s+$/.test(token)) { stageText.appendChild(document.createTextNode(token)); }
    else { const sp = document.createElement('span'); sp.className = 'laser-word'; sp.textContent = token; stageText.appendChild(sp); laserWordSpans.push(sp); }
  });
}

function moveLaserToWord(idx) {
  if (!laserEl || idx < 0 || idx >= laserWordSpans.length) return;
  const sr = laserWordSpans[idx].getBoundingClientRect();
  const pr = stageMessage.getBoundingClientRect();
  laserEl.style.left = (sr.left - pr.left + sr.width / 2) + 'px';
  laserEl.style.top  = (sr.top  - pr.top  + sr.height + 8) + 'px';
  laserEl.classList.remove('hidden');
  laserWordSpans.forEach((s, i) => s.classList.toggle('lit', i === idx));
}

function hideLaser() {
  if (laserEl) laserEl.classList.add('hidden');
  laserWordSpans.forEach(s => s.classList.remove('lit'));
  laserActive = false;
}

// ══════════════════════════════════════════════
//  SLIDE ENGINE
// ══════════════════════════════════════════════

let mermaidReady = false;

function ensureMermaid() {
  if (mermaidReady) return Promise.resolve();
  return new Promise(resolve => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
    s.onload = () => {
      window.mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: {
        primaryColor: '#dbeafe', primaryTextColor: '#1e293b', primaryBorderColor: '#2563eb',
        lineColor: '#64748b', fontFamily: "'DM Sans', sans-serif", fontSize: '14px' }});
      mermaidReady = true; resolve();
    };
    document.head.appendChild(s);
  });
}

(function injectSlideStyles() {
  const s = document.createElement('style');
  s.textContent = `
    @keyframes slideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes slideOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(6px)}}
    @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
    #teacherSlide{margin-top:16px;border-radius:12px;overflow:hidden;border:1.5px solid #e2e8f0;background:#fff;animation:slideIn .35s ease forwards;}
    #teacherSlide.hiding{animation:slideOut .25s ease forwards;}
    .slide-caption{font-family:'DM Sans',sans-serif;font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.5px;padding:8px 14px 0;}
    .slide-loading{display:flex;align-items:center;gap:10px;padding:14px 16px;background:linear-gradient(90deg,#f8fafc 25%,#f0f5ff 50%,#f8fafc 75%);background-size:400px 100%;animation:shimmer 1.4s ease infinite;font-family:'DM Sans',sans-serif;font-size:13px;color:#94a3b8;}
    .slide-table-wrap{overflow-x:auto;padding:12px 14px 14px;}
    .slide-table{width:100%;border-collapse:collapse;font-family:'DM Sans',sans-serif;font-size:13.5px;}
    .slide-table th{background:#1e40af;color:#fff;padding:9px 13px;text-align:left;font-weight:600;white-space:nowrap;}
    .slide-table th:first-child{border-radius:6px 0 0 0}.slide-table th:last-child{border-radius:0 6px 0 0}
    .slide-table td{padding:8px 13px;color:#1e293b;border-bottom:1px solid #e8edf3;line-height:1.45;}
    .slide-table tr:nth-child(even) td{background:#f0f6ff}.slide-table tr:last-child td{border-bottom:none}
    .slide-diagram-wrap{padding:12px 14px 14px;display:flex;justify-content:center;}
    .slide-diagram-wrap svg{max-width:100%;height:auto;}
    .slide-cards-wrap{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;padding:12px 14px 14px;}
    .slide-card{background:#f0f6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px 12px;}
    .slide-card-term{font-family:'DM Sans',sans-serif;font-size:12px;font-weight:700;color:#1e40af;margin-bottom:4px;}
    .slide-card-def{font-family:'DM Sans',sans-serif;font-size:12.5px;color:#334155;line-height:1.4;}`;
  document.head.appendChild(s);
})();

let slideEl = null;

function getSlideEl() {
  if (slideEl) return slideEl;
  slideEl = document.createElement('div'); slideEl.id = 'teacherSlide';
  document.getElementById('stageMessage')?.appendChild(slideEl);
  return slideEl;
}

function hideSlide() {
  if (!slideEl || !slideEl.innerHTML) return;
  slideEl.classList.add('hiding');
  setTimeout(() => { if (slideEl) { slideEl.innerHTML = ''; slideEl.classList.remove('hiding'); } }, 260);
}

function showSlideLoading() {
  const el = getSlideEl(); el.classList.remove('hiding');
  el.innerHTML = `<div class="slide-loading"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>Creating slide...</div>`;
}

function renderTable(data, caption) {
  if (!data || data.length < 2) return false;
  const [headers, ...rows] = data;
  getSlideEl().innerHTML = `${caption ? `<div class="slide-caption">📊 ${caption}</div>` : ''}
    <div class="slide-table-wrap"><table class="slide-table">
      <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
      <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
    </table></div>`;
  return true;
}

async function renderMermaid(code, caption) {
  await ensureMermaid();
  const safeCode = code
    .replace(/\[([^\]]*)\]/g, (_, i) => '[' + i.replace(/\(/g, '﹙').replace(/\)/g, '﹚') + ']');
  const id = 'merm-' + Date.now();
  getSlideEl().innerHTML = `${caption ? `<div class="slide-caption">🔀 ${caption}</div>` : ''}<div class="slide-diagram-wrap" id="${id}"></div>`;
  try { const { svg } = await window.mermaid.render('ms-' + Date.now(), safeCode); document.getElementById(id).innerHTML = svg; return true; }
  catch (e) { console.warn('Mermaid render failed:', e); return false; }
}

function renderCards(items, caption) {
  if (!items || !items.length) return false;
  getSlideEl().innerHTML = `${caption ? `<div class="slide-caption">📌 ${caption}</div>` : ''}
    <div class="slide-cards-wrap">${items.map(({ term, definition }) =>
      `<div class="slide-card"><div class="slide-card-term">${term}</div><div class="slide-card-def">${definition}</div></div>`).join('')}</div>`;
  return true;
}

async function renderSlideSpec(spec) {
  let ok = false;
  try {
    if (spec.type === 'table')   ok = renderTable(spec.data, spec.caption);
    if (spec.type === 'mermaid') ok = await renderMermaid(spec.code, spec.caption);
    if (spec.type === 'cards')   ok = renderCards(spec.items, spec.caption);
  } catch (e) { console.warn('Slide render error:', e); }
  if (!ok) hideSlide();
  return ok;
}

async function fetchTeacherSlide(teacherText, topic) {
  const prompt = `A classroom teacher just said: "${teacherText}". Topic: ${topic}.
Choose one visual: "table" for comparisons or lists, "mermaid" for a process or flow, "cards" for 2–5 terms, or "none" for conversation.
Return only valid JSON with the selected type. All visible text must be in English. Mermaid diagrams must use graph TD or LR and contain no more than 8 nodes.`;

  try { return await groqJsonChat([{ role: 'user', content: prompt }], 'Return only valid JSON. No markdown.', 500, 0.3); }
  catch (e) { console.warn('Slide fetch error:', e); return { type: 'none' }; }
}

async function fetchTeacherQuestion(context, topic) {
  const docCtx = getRelevantContext(context + ' ' + topic, 1500);
  const doc    = docCtx ? `\nMaterial:\n${docCtx}` : '';
  const prompt = `Topic: ${topic}${doc}
The teacher just said: "${context}"
Write exactly one concise English question addressed to one of the students, Alex, Jordan, or Sam. Never have the teacher ask a question about themself. Do not repeat prior discussion.`;

  try {
    const raw = await groqChat(
      [{ role: 'user', content: prompt }],
      'You are a classroom teacher. Ask questions only to students, never to yourself. Respond only in English.',
      120, 0.7,
      'teacher'   // ← add this
    );
    const cleaned = cleanReply(raw);
    // Hard reject if teacher is asking herself
    if (/^(?:Do I|Am I)\b/i.test(cleaned)) {
      const names = ['Alex', 'Jordan', 'Sam'];
      const name  = names[Math.floor(Math.random() * names.length)];
      return `${name}, did you understand this idea?`;
    }
    return cleaned;
  } catch (e) {
    console.warn('Teacher question error:', e);
    return 'Alex, did you understand this idea?';
  }
}

// ══════════════════════════════════════════════
//  DOM REFERENCES
// ══════════════════════════════════════════════

const uploadScreen     = document.getElementById('upload-screen');
const classroomScreen  = document.getElementById('classroom-screen');
const uploadZone       = document.getElementById('uploadZone');
const fileInput        = document.getElementById('fileInput');
const uploadPreviews   = document.getElementById('uploadPreviews');
const topicInput       = document.getElementById('topicInput');
const startBtn         = document.getElementById('startBtn');
const stageTopic       = document.getElementById('stageTopic');
const stageIdle        = document.getElementById('stageIdle');
const stageMessage     = document.getElementById('stageMessage');
const stageSpeakerName = document.getElementById('stageSpeakerName');
const stageSpeakerRole = document.getElementById('stageSpeakerRole');
const stageText        = document.getElementById('stageText');
const ttsWave          = document.getElementById('ttsWave');
const ttsLabel         = document.getElementById('ttsLabel');
const ttsToggle        = document.getElementById('ttsToggle');
const chatMessages     = document.getElementById('chatMessages');
const raiseHandBtn     = document.getElementById('raiseHandBtn');
const userInput        = document.getElementById('userInput');
const sendBtn          = document.getElementById('sendBtn');
const micBtn           = document.getElementById('micBtn');
const pauseBtn         = document.getElementById('pauseBtn');
const exportBtn        = document.getElementById('exportBtn');
const resetBtn         = document.getElementById('resetBtn');
const sessionTimer     = document.getElementById('sessionTimer');




let uploadedFiles = [];

// ══════════════════════════════════════════════
//  UPLOAD ZONE
// ══════════════════════════════════════════════

let _handlingFiles = false;

uploadZone.addEventListener('click', () => fileInput.click());
uploadZone.addEventListener('dragover', e => { e.preventDefault(); uploadZone.classList.add('dragover'); });
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  _handlingFiles = true;
  handleFiles(Array.from(e.dataTransfer.files));
  setTimeout(() => { _handlingFiles = false; }, 500);
});
fileInput.addEventListener('change', () => {
  if (_handlingFiles) return;
  handleFiles(Array.from(fileInput.files));
});

function handleFiles(files) {
  uploadedFiles = files.slice(0, 3);
  uploadPreviews.innerHTML = '';
  if (uploadedFiles.length > 0) {
    uploadPreviews.classList.remove('hidden');
    uploadedFiles.forEach(file => {
      if (file.type.startsWith('image/')) {
        const img = document.createElement('img'); img.className = 'preview-thumb'; img.src = URL.createObjectURL(file); uploadPreviews.appendChild(img);
      } else {
        const box = document.createElement('div'); box.className = 'preview-file';
        box.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg><span>${file.name.slice(0, 12)}...</span>`;
        uploadPreviews.appendChild(box);
      }
    });
  } else { uploadPreviews.classList.add('hidden'); }
}

async function toBase64(file) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = rej; r.readAsDataURL(file); });
}

// ══════════════════════════════════════════════
//  START
// ══════════════════════════════════════════════
let _lessonStarted = false;
startBtn?.addEventListener('click', async () => {
  if (_lessonStarted) return;
  const topic = topicInput?.value.trim();
  if (!topic && uploadedFiles.length === 0) {
    alert('Please enter a topic or upload a file.');
    return;
  }
  _lessonStarted = true;
  sessionTopic = topic || uploadedFiles.map(f => f.name).join(', ');
  uploadScreen?.classList.remove('active');
  classroomScreen?.classList.add('active');
  if (stageTopic) stageTopic.textContent = sessionTopic;
  startTimer();
  loadAgentVoices();
  await initDuckDB();
  ensureLaser();
  await startLesson();
});

// ══════════════════════════════════════════════
//  AGENT PROMPT BUILDING
// ══════════════════════════════════════════════

function getInitialDocContext(maxChars = 3000) {
  // Used only for the very first turn, when there's no dialogue yet to build
  // a meaningful retrieval query from. Just take the start of the document
  // directly instead of doing a similarity search that has nothing to match.
  if (!pdfPages.length) return '';
  let out = '', chars = 0;
  for (const p of pdfPages) {
    const block = `[Page ${p.page}]\n${p.text}`;
    if (chars + block.length > maxChars) break;
    out += block + '\n\n';
    chars += block.length;
  }
  return out.trim();
}

function buildMessages(agentId) {
  const agent = AGENTS[agentId];

  const recentLog  = dialogueLog.slice(-4);
  const recentText = recentLog.map(e => e.text).join(' ');
  const ctx = dialogueLog.length === 0
    ? (getInitialDocContext(3000) || getRelevantContext(sessionTopic, 3000))
    : getRelevantContext(recentText + ' ' + sessionTopic, 3000);

  // If no PDF context available at all, warn
  if (!ctx && store.chunks.length === 0) {
    console.warn('[buildMessages] No PDF context available!');
  }

  const docBlock = ctx
    ? `--- Source material (use only this information, but do not refer to it as a document; teach it naturally) ---\n${ctx}\n---\n\n`
    : '';

  if (dialogueLog.length === 0) {
    return [{
      role: 'user',
      content: docBlock +
        `Topic: ${sessionTopic}\n\n` +
        `Start teaching directly from the provided source material.`
    }];
  }

  const transcript = recentLog.map(e => `[${e.name}]: ${e.text}`).join('\n');

  const depthNote = agentId === 'teacher' ? '\nDepth: ' + ({
    shallow: 'Use simple language.',
    medium:  'Use a moderate level of detail.',
    deep:    'Analyze the topic in depth.',
  }[difficultyLevel]) : '';

  return [{
    role: 'user',
    content: docBlock +
      `Topic: ${sessionTopic}\n\n` +
      `Recent discussion:\n${transcript}\n\n` +
      `Use only the provided source material. Never refer to it as a document; explain it naturally as a teacher would.` +
      depthNote,
  }];
}


// increase max tokens for teacher so responses don't get cut mid-sentence
// find this line in groqChat call inside callAgent:
async function callAgent(agentId) {
  const agent     = AGENTS[agentId];
  const isTeacher = agentId === 'teacher';
  const maxTok    = isTeacher ? 220 : 180;

  const pdfRule = store.chunks.length > 0
    ? '\n\nUse only the provided source material. Do not refer to a document or source; teach the information naturally and directly.'
    : '';

  const system = agent.system + pdfRule +
  '\n\nCRITICAL: Respond only in English. Do not include reasoning or meta-commentary. Start teaching immediately. The source material is included above; use it and never claim it is unavailable.' +
  (isTeacher
    ? '\n\nHARD LIMIT: Use at most two short sentences. Keep it brief so students can join the discussion.'
    : '\n\nHARD LIMIT: Use exactly one sentence.');

  const raw  = await groqChat(buildMessages(agentId), system, maxTok, 0.78, agentId);
  let reply  = cleanReply(raw);

  if (!isTeacher) {
    const match = reply.match(/^[^.?!]+[.?!]/);
    reply = match ? match[0].trim() : reply.split(/[.?!]/)[0].trim() + '.';
  }

  return reply;
}

function trimDialogueLog() {
  const MAX = 10;
  if (dialogueLog.length <= MAX) return;
  // Always keep the most recent teacher explanation for student context
  let ltIdx = -1;
  for (let i = dialogueLog.length - 1; i >= 0; i--) {
    if (dialogueLog[i].name === AGENTS.teacher.name) { ltIdx = i; break; }
  }
  const sliced = dialogueLog.slice(-MAX);
  if (ltIdx !== -1 && ltIdx < dialogueLog.length - MAX) {
    sliced.unshift(dialogueLog[ltIdx]);
  }
  dialogueLog = sliced;
}
// ══════════════════════════════════════════════
//  LESSON LOOP
// ══════════════════════════════════════════════

async function startLesson() {
  if (lessonStarting) return;
  lessonStarting = true;
  _config = await loadEnvConfig();
  try {
    await getFelcloudConfig();
  } catch (error) {
    console.error('[AI Classroom] Felcloud configuration failed:', error);
    alert(error.message || 'Felcloud is not configured on the AI backend.');
    lessonStarting = false;
    _lessonStarted = false;
    return;
  }
  isRunning = false; turnLoopRunning = false;
  _turnInProgress = false;   // ← ADD THIS
  await sleep(200);

  isRunning = true; currentTurnIndex = 0;
  dialogueLog = []; pdfPages = []; store.reset();
  chatMessages.innerHTML = '';
  humanLog.checkins = []; humanLog.mcqResults = []; humanLog.typedMessages = [];

  const idleP = stageIdle?.querySelector('p');

  // Process PDF files FIRST
  for (const file of uploadedFiles) {
    if (file.type === 'application/pdf') {
      if (idleP) idleP.textContent = `"${file.name}" reading…`;
      try {
        await loadAndIndexPDF(file, (pct, label) => { if (idleP) idleP.textContent = label; });
        console.log(`[PDF] indexed ${store.chunks.length} chunks from ${file.name}`);
      } catch (e) { console.error('[PDF] failed:', e); }
    }
  }
  console.log(`[PDF] store.ready:${store.ready} chunks:${store.chunks.length} pages:${pdfPages.length}`);
  if (store.chunks.length === 0) {
    if (idleP) idleP.textContent = '⚠️ PDF could not be read. The topic-based lesson will continue.';
    await sleep(2000);
  }

  // THEN wait for store to be ready (handles async OCR queue finishing)
  if (uploadedFiles.some(f => f.type === 'application/pdf')) {
    const deadline = Date.now() + 30000;
    while (!store.ready && Date.now() < deadline) { await sleep(300); }
  }

  if (idleP) idleP.textContent = store.chunks.length > 0
    ? `${store.chunks.length} chunks indexed. Starting the lesson…`
    : 'Starting the lesson…';



  lessonStarting = false;
  if (!turnLoopRunning) runTurnLoop();
}

async function runTurnLoop() {
  if (turnLoopRunning) return;
  turnLoopRunning = true;

  while (isRunning) {
    while (isPaused && isRunning) { await sleep(200); }
    if (!isRunning) break;

    if (_turnInProgress) { await sleep(300); continue; }

_turnInProgress = true;  // ← set it BEFORE deciding which branch

if (userInterrupted && pendingUserMessage) {
  await handleUserTurn();
  _turnInProgress = false;
  continue;
}

const agentId = TURN_ORDER[currentTurnIndex % TURN_ORDER.length];
await runAgentTurn(agentId);
_turnInProgress = false;

    // Only advance AFTER the turn fully completes
    currentTurnIndex = (currentTurnIndex + 1) % TURN_ORDER.length;

    while (isPaused && isRunning) { await sleep(200); }
    if (!isRunning) break;

    await sleep(800);
  }

  turnLoopRunning = false;
}
// ══════════════════════════════════════════════
//  TEACHER 3-PHASE TURN
// ══════════════════════════════════════════════

async function runTeacherTurn() {
  const ttsDeadline = Date.now() + 15000;
  while (speechSynthesis.speaking && Date.now() < ttsDeadline) { await sleep(150); }

  setAgentSpeaking('teacher');
  showTyping('teacher');

  let explainText = '';
  try {
    explainText = await callAgent('teacher');
  } catch (err) {
    console.error('[Teacher]', err);
    hideTyping(); clearAgentSpeaking(); await sleep(1200); return;
  }

  hideTyping();
  if (!isRunning) { clearAgentSpeaking(); return; }

  const lastTeacher = [...dialogueLog].reverse().find(e => e.name === AGENTS.teacher.name);
  if (lastTeacher && lastTeacher.text.trim() === explainText.trim()) {
    console.warn('[teacher] duplicate skipped');
    clearAgentSpeaking(); return;
  }

  dialogueLog.push({ name: AGENTS.teacher.name, text: explainText });
  trimDialogueLog();
  showOnStage('teacher', explainText, true);
  addChatBubble('teacher', explainText);

  await speak(explainText, 'teacher', true);
  if (!isRunning) { clearAgentSpeaking(); return; }

  // Comprehension check-in
  turnsSinceCheckin++;
  if (turnsSinceCheckin >= CHECKIN_EVERY_N) {
    turnsSinceCheckin = 0;
    setPauseReason('checkin', true);
    const choice = await showCheckinPrompt();
    humanLog.checkins.push(choice);
    setPauseReason('checkin', false);
    if (choice === 'repeat') {
      dialogueLog.push({ name: 'System', text: 'The student did not understand. Explain it more simply.' });
      difficultyLevel = 'shallow';
    }
    runAssessor(choice);
  }

  clearAgentSpeaking();
}

async function runAgentTurn(agentId) {
  // Hard stop — wait for speechSynthesis to be fully idle before proceeding
  const ttsDeadline = Date.now() + 15000;
  while (speechSynthesis.speaking && Date.now() < ttsDeadline) { await sleep(150); }

  if (agentId === 'teacher') { await runTeacherTurn(); return; }

  const agent = AGENTS[agentId];

  showTyping(agentId);
  setAgentSpeaking(agentId);

  let reply = '';
  try {
    reply = await callAgent(agentId);
  } catch (err) {
    console.error(`[${agentId}]`, err);
    hideTyping();
    clearAgentSpeaking();
    await sleep(1200);
    return;
  }

  hideTyping();
  if (!isRunning) { clearAgentSpeaking(); return; }

  // Deduplicate — skip if this exact text was already said by this agent
  const lastSame = [...dialogueLog].reverse().find(e => e.name === agent.name);
  if (lastSame && lastSame.text.trim() === reply.trim()) {
    console.warn(`[${agentId}] duplicate response skipped`);
    clearAgentSpeaking();
    return;
  }

  dialogueLog.push({ name: agent.name, text: reply });
  trimDialogueLog();
  dbLog('dialogue_turns', { session_id: SESSION_ID, agent: agentId, text: reply, turn_index: dialogueLog.length, ts: 'NOW()' }); // ← ADD HERE



  showOnStage(agentId, reply, false);
  addChatBubble(agentId, reply);

  await speak(reply, agentId, false);

  clearAgentSpeaking();
  await sleep(400);
}

async function handleUserTurn() {
  const msg = pendingUserMessage; pendingUserMessage = null; userInterrupted = false;
  dialogueLog.push({ name: 'Student', text: msg });
  await runAgentTurn('teacher');
  currentTurnIndex = 1;
}

// ══════════════════════════════════════════════
//  ASSESSOR  (Groq only)
// ══════════════════════════════════════════════

async function runAssessor(trigger, extraData = {}) {
  const totalMCQ    = humanLog.mcqResults.length;
  const correctMCQ  = humanLog.mcqResults.filter(r => r.correct).length;
  const hintedMCQ   = humanLog.mcqResults.filter(r => r.usedHint).length;
  const avgMs       = totalMCQ > 0 ? Math.round(humanLog.mcqResults.reduce((a, r) => a + r.responseMs, 0) / totalMCQ) : null;
  const repeatCount = humanLog.checkins.filter(c => c === 'repeat').length;
  const okCount     = humanLog.checkins.filter(c => c === 'understood').length;
  const recentTyped = humanLog.typedMessages.slice(-4).join(' | ') || 'No messages yet';

  const prompt = `You are an AI learning assessor. Evaluate the student data below and return only valid JSON with level (shallow, medium, or deep), a one-sentence reason, and one instruction for the teacher.
Trigger: ${trigger}
MCQ results: ${totalMCQ > 0 ? `${correctMCQ}/${totalMCQ} correct, ${hintedMCQ} used a hint` : 'none yet'}
Average response time: ${avgMs ? `${(avgMs / 1000).toFixed(1)} seconds` : 'N/A'}
Understood: ${okCount}; asked for repetition: ${repeatCount}
Recent questions: "${recentTyped}"
${extraData.lastMCQ ? `Last MCQ: ${extraData.lastMCQ.correct ? 'correct' : 'incorrect'}, response time: ${(extraData.lastMCQ.responseMs / 1000).toFixed(1)} seconds` : ''}

Return only JSON: {"level":"shallow"|"medium"|"deep","reason":"one sentence","teacher_instruction":"one instruction"}`;

  try {
    const json = await groqJsonChat([{ role: 'user', content: prompt }], 'Return only valid JSON. No markdown.', 250, 0.2);
    if (['shallow', 'medium', 'deep'].includes(json.level)) {
      difficultyLevel = json.level;
      if (json.teacher_instruction) { dialogueLog.push({ name: 'System', text: `[Assessor]: ${json.teacher_instruction}` }); trimDialogueLog(); }
      console.log(`[Assessor] → ${json.level}`);
    }
  } catch (e) {
    console.warn('[Assessor] fallback formula:', e.message);
    const uRate = totalMCQ > 0 ? correctMCQ / totalMCQ : 0.5;
    const rp    = repeatCount > okCount;
    difficultyLevel = uRate >= 0.70 && !rp ? 'deep' : uRate >= 0.42 && !rp ? 'medium' : 'shallow';
  }
}

// ══════════════════════════════════════════════
//  COMPREHENSION CHECK-IN
// ══════════════════════════════════════════════

function showCheckinPrompt() {
  return new Promise(resolve => {
    document.getElementById('checkin-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'checkin-overlay';
    overlay.style.cssText = `position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:9998;display:flex;align-items:center;justify-content:center;padding:20px;font-family:'DM Sans',sans-serif;`;
    overlay.innerHTML = `
      <div style="background:#fff;border-radius:18px;padding:28px 24px;max-width:380px;width:100%;border:2px solid #e2e8f0;color:#1e293b;text-align:center;box-shadow:0 20px 50px rgba(0,0,0,0.18);">
        <div style="font-size:2rem;margin-bottom:10px;">🙋</div>
        <div style="font-size:1.05rem;font-weight:600;line-height:1.6;margin-bottom:22px;">Did you understand?<br/>Let me know if anything was unclear.</div>
        <div style="display:flex;gap:10px;">
          <button id="ci-yes" style="flex:1;padding:12px;background:#f0fdf4;border:2px solid #4ade80;border-radius:12px;color:#166534;font-size:.97rem;font-weight:700;cursor:pointer;">✅ I understood</button>
          <button id="ci-no"  style="flex:1;padding:12px;background:#fef2f2;border:2px solid #f87171;border-radius:12px;color:#991b1b;font-size:.97rem;font-weight:700;cursor:pointer;">🔁 Please repeat</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#ci-yes').onclick = () => {
      overlay.remove();
      resolve('understood');
      dbLog('checkins', { session_id: SESSION_ID, choice: 'understood', ts: 'NOW()' }); // ← ADD HERE
    };
    overlay.querySelector('#ci-no').onclick  = () => {
      overlay.remove();
      resolve('repeat');
      dbLog('checkins', { session_id: SESSION_ID, choice: 'repeat', ts: 'NOW()' }); // ← ADD HERE
    };
  });
}

// ══════════════════════════════════════════════
//  STAGE & CHAT
// ══════════════════════════════════════════════

function showOnStage(agentId, text, wrapForLaser = false) {
  const agent = AGENTS[agentId];
  stageIdle.classList.add('hidden'); stageMessage.classList.remove('hidden');
  stageSpeakerName.textContent = agent.name; stageSpeakerRole.textContent = agent.role;
  stageText.style.borderLeftColor = agent.color;
  stageMessage.style.animation = 'none'; stageMessage.offsetHeight; stageMessage.style.animation = '';
  if (wrapForLaser && agentId === 'teacher') { wrapWordsInSpans(text); }
  else { stageText.textContent = text; laserWordSpans = []; }
}

function setAgentSpeaking(agentId) {
  document.querySelectorAll('.agent-card').forEach(c => c.classList.remove('speaking'));
  document.getElementById(`card-${agentId}`)?.classList.add('speaking');
}
function clearAgentSpeaking() { document.querySelectorAll('.agent-card').forEach(c => c.classList.remove('speaking')); }

let typingBubbleEl = null;
function showTyping(agentId) {
  const agent = AGENTS[agentId];
  typingBubbleEl = document.createElement('div');
  typingBubbleEl.className = `chat-bubble typing-bubble bubble-${agentId}`;
  typingBubbleEl.innerHTML = `
    <div class="bubble-meta"><span class="bubble-dot" style="background:${agent.color}"></span>${agent.name} typing…</div>
    <div class="bubble-text"><span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span></div>`;
  chatMessages.appendChild(typingBubbleEl); scrollChat();
}
function hideTyping() { typingBubbleEl?.remove(); typingBubbleEl = null; }

function addChatBubble(agentId, text, isUser = false) {
  if (!text?.trim()) return;
  const agent  = isUser ? null : AGENTS[agentId];
  const bubble = document.createElement('div');
  bubble.className = isUser ? 'chat-bubble user-bubble bubble-user' : `chat-bubble bubble-${agentId}`;
  bubble.innerHTML = isUser
    ? `<div class="bubble-meta" style="justify-content:flex-end">You</div><div class="bubble-text">${escapeHtml(text)}</div>`
    : `<div class="bubble-meta"><span class="bubble-dot" style="background:${agent.color}"></span>${agent.name}</div><div class="bubble-text">${escapeHtml(text)}</div>`;
  chatMessages.appendChild(bubble); scrollChat();
}

function scrollChat() { chatMessages.scrollTop = chatMessages.scrollHeight; }
function escapeHtml(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ══════════════════════════════════════════════
//  RAISE HAND / USER INPUT
// ══════════════════════════════════════════════

raiseHandBtn.addEventListener('click', () => {
  const active = raiseHandBtn.classList.toggle('active');
  setPauseReason('raise-hand', active);
  if (active) {
    if (ttsLabel) ttsLabel.textContent = 'Paused — your turn';
    userInput.disabled = false; sendBtn.disabled = false;
    if (micBtn) micBtn.disabled = false; userInput.focus();
  } else {
    userInput.disabled = true; sendBtn.disabled = true;
    if (micBtn) micBtn.disabled = true; stopMic();
    if (ttsLabel) ttsLabel.textContent = isPaused ? 'Paused' : 'Muted';
  }
});

sendBtn.addEventListener('click', submitUserMessage);
userInput.addEventListener('keydown', e => { if (e.key === 'Enter') submitUserMessage(); });

function submitUserMessage() {
  const msg = userInput.value.trim(); if (!msg) return;
  addChatBubble('user', msg, true); userInput.value = '';
  pendingUserMessage = msg; userInterrupted = true;
  humanLog.typedMessages.push(msg); if (humanLog.typedMessages.length > 10) humanLog.typedMessages.shift();
  userInput.disabled = true; sendBtn.disabled = true;
  if (micBtn) micBtn.disabled = true;
  raiseHandBtn.classList.remove('active'); stopMic();
  cancelCurrentSpeech();
  setPauseReason('raise-hand', false);
  hideLaser();
}

// ══════════════════════════════════════════════
// Browser speech recognition is available without an audio-transcription API.
const MIC_BTN_LABEL = document.getElementById('micBtnLabel');
let micState = 'idle';
let speechRecognition = null;

if (micBtn) {
  micBtn.addEventListener('click', () => {
    if (micState === 'recording') stopRecording();
    else if (micState !== 'processing') startRecording();
  });
}

function setMicLabel(text) { if (MIC_BTN_LABEL) MIC_BTN_LABEL.textContent = text; }
function setMicState(state) {
  micState = state;
  if (!micBtn) return;
  micBtn.classList.toggle('mic-active', state === 'recording');
  micBtn.classList.toggle('mic-processing', state === 'processing');
  setMicLabel(state === 'recording' ? 'Stop' : state === 'processing' ? 'Processing?' : 'Speak');
}

function startRecording() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert('Speech input is not supported by this browser. You can type your question instead.');
    return;
  }
  speechRecognition = new SpeechRecognition();
  speechRecognition.lang = 'en-US';
  speechRecognition.interimResults = false;
  speechRecognition.continuous = false;
  speechRecognition.onresult = event => {
    const transcript = event.results?.[0]?.[0]?.transcript || '';
    _appendTranscript(transcript);
  };
  speechRecognition.onerror = event => {
    if (event.error !== 'aborted' && event.error !== 'no-speech') {
      console.warn('[Speech recognition]', event.error);
      alert(`Speech input failed (${event.error}). You can type your question instead.`);
    }
  };
  speechRecognition.onend = () => {
    speechRecognition = null;
    setMicState('idle');
  };
  try {
    speechRecognition.start();
    setMicState('recording');
  } catch (error) {
    speechRecognition = null;
    setMicState('idle');
    alert(`Could not start speech input: ${error.message}`);
  }
}

function stopRecording() {
  if (speechRecognition) speechRecognition.stop();
  else setMicState('idle');
}

function stopMic() { if (micState !== 'idle') stopRecording(); }

// ══════════════════════════════════════════════
//  CONTROLS
// ══════════════════════════════════════════════

if (ttsToggle) {
  ttsToggle.addEventListener('click', () => {
    ttsEnabled = !ttsEnabled;
    ttsToggle.textContent = ttsEnabled ? '🔊' : '🔇';
    if (!ttsEnabled) { cancelCurrentSpeech(); hideLaser(); }
  });
}

pauseBtn.addEventListener('click', () => {
  const pausedByUser = pauseReasons.has('manual');
  setPauseReason('manual', !pausedByUser);
  if (!pausedByUser) {
    stopMic();
    laserActive = false;
    hideLaser();
  }
});

exportBtn.addEventListener('click', () => {
  exportWarehouse();                    // ← ADD THIS LINE FIRST
  const lines = Array.from(chatMessages.querySelectorAll('.chat-bubble')).map(b => {
    const name = b.querySelector('.bubble-meta')?.textContent?.trim() || 'Unknown';
    const text = b.querySelector('.bubble-text')?.textContent?.trim() || '';
    return `${name}: ${text}`;
  });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([lines.join('\n\n')], { type: 'text/plain;charset=utf-8' }));
  a.download = `classroom-${Date.now()}.txt`; a.click();
});

resetBtn.addEventListener('click', () => {
  if (!confirm('End this class?')) return;
  isRunning = false; lessonStarting = false;
  pauseReasons.clear(); isPaused = false;
  _lessonStarted = false;
  stopMic(); cancelCurrentSpeech();
  speechSynthesis.resume();
  clearInterval(timerInterval); timerInterval = null; hideLaser();
  sessionSeconds = 0; dialogueLog = []; pdfPages = []; store.reset(); uploadedFiles = [];
  uploadPreviews.innerHTML = ''; uploadPreviews.classList.add('hidden');
  topicInput.value = ''; fileInput.value = '';
  chatMessages.innerHTML = '<div class="chat-welcome">The discussion will appear here when class begins.</div>';
  stageMessage.classList.add('hidden'); stageIdle.classList.remove('hidden');
  hideSlide(); clearAgentSpeaking();
  if (ttsWave)  ttsWave.classList.remove('speaking');
  if (ttsLabel) ttsLabel.textContent = 'Muted';
  pauseBtn.textContent = 'Pause'; raiseHandBtn.classList.remove('active');
  userInput.disabled = true; sendBtn.disabled = true;
  if (micBtn) micBtn.disabled = true;
  classroomScreen.classList.remove('active'); uploadScreen.classList.add('active');
});

// ══════════════════════════════════════════════
//  TIMER
// ══════════════════════════════════════════════

function startTimer() {
  sessionSeconds = 0; clearInterval(timerInterval);
  timerInterval = null;
  runSessionTimer();
}

function runSessionTimer() {
  if (timerInterval !== null) return;
  timerInterval = setInterval(() => {
    sessionSeconds++;
    const m = String(Math.floor(sessionSeconds / 60)).padStart(2, '0');
    const s = String(sessionSeconds % 60).padStart(2, '0');
    sessionTimer.textContent = `${m}:${s}`;
  }, 1000);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ══════════════════════════════════════════════
//  QUIZ ENGINE — Bloom's Taxonomy + ZPD
// ══════════════════════════════════════════════

const BLOOM_LEVELS = ['Remember','Understand','Apply','Analyze','Evaluate','Create'];
const zpd = { unassisted: { correct: 0, total: 0 }, assisted: { correct: 0, total: 0 } };
const bloomPerf = {};
BLOOM_LEVELS.forEach(l => { bloomPerf[l] = { correct: 0, total: 0 }; });

let quizQuestions = [], quizIndex = 0, quizActive = false;
let currentBloomLevel = 'Remember', hintUsed = false;
let quizResults = [], weakTopics = [], questionShownAt = 0;

const quizBtn         = document.getElementById('quizBtn');
const quizPanel       = document.getElementById('quizPanel');
const quizLoading     = document.getElementById('quizLoading');
const quizContent     = document.getElementById('quizContent');
const quizQuestionEl  = document.getElementById('quizQuestion');
const quizBloomBadge  = document.getElementById('quizBloomBadge');
const quizOptionsEl   = document.getElementById('quizOptions');
const quizHintBtn     = document.getElementById('quizHintBtn');
const quizHintText    = document.getElementById('quizHintText');
const quizFeedback    = document.getElementById('quizFeedback');
const quizNextBtn     = document.getElementById('quizNextBtn');
const quizProgress    = document.getElementById('quizProgress');
const quizResultPanel = document.getElementById('quizResultPanel');
const quizScoreEl     = document.getElementById('quizScore');
const quizBloomChart  = document.getElementById('quizBloomChart');
const quizZpdEl       = document.getElementById('quizZpd');
const reviseBtn       = document.getElementById('reviseBtn');
const quizCloseBtn    = document.getElementById('quizCloseBtn');

if (quizBtn) quizBtn.addEventListener('click', () => { if (!sessionTopic) { alert('Start a class first.'); return; } startQuiz(); });

async function startQuiz() {
  setPauseReason('quiz', true);
  hideLaser();
  if (ttsLabel) ttsLabel.textContent = 'Quiz in progress…';
  quizQuestions = []; quizIndex = 0; quizActive = true; quizResults = []; weakTopics = [];
  BLOOM_LEVELS.forEach(l => { bloomPerf[l] = { correct: 0, total: 0 }; });
  zpd.unassisted = { correct: 0, total: 0 }; zpd.assisted = { correct: 0, total: 0 };
  currentBloomLevel = 'Remember';
  quizPanel.classList.remove('hidden'); quizResultPanel?.classList.add('hidden');
  quizContent.classList.add('hidden'); quizLoading.classList.remove('hidden');
  quizQuestions = await fetchQuizQuestions(sessionTopic);
  quizLoading.classList.add('hidden');
  if (!quizQuestions.length) {
    quizContent.innerHTML = '<p style="padding:16px;font-family:\'DM Sans\',sans-serif;color:#dc2626;">Could not load questions. Please try again.</p>';
    quizContent.classList.remove('hidden'); return;
  }
  quizContent.classList.remove('hidden'); showQuestion();
}

async function fetchQuizQuestions(topic) {
  const docCtx  = getRelevantContext(topic, 3000);
  const docBlock = docCtx ? `\nMaterial:\n${docCtx}\n` : '';
  const prompt  = `You create multiple-choice questions for secondary and higher-secondary students. ${docBlock}
Create 10 English questions about "${topic}" at an appropriate curriculum level.
Bloom levels: 2 Remember, 2 Understand, 2 Apply, 2 Analyze, 1 Evaluate, and 1 Create.
Return only a JSON array in this format: [{"bloom":"Remember","topic":"subtopic","question":"question","options":["A) ...","B) ...","C) ...","D) ..."],"answer":0,"hint":"hint","explanation":"explanation"}]. The answer is the correct option index from 0 to 3.`;

  try {
    let parsed = await groqJsonChat([{ role: 'user', content: prompt }], 'Return only a valid JSON array. No markdown.', 4000, 0.4);
    if (!Array.isArray(parsed)) { const k = Object.keys(parsed).find(k => Array.isArray(parsed[k])); if (k) parsed = parsed[k]; else throw new Error('Not array'); }
    return parsed.slice(0, 10);
  } catch (e) { console.error('[Quiz] fetch failed:', e); return []; }
}

function adaptBloomLevel() {
  const p = bloomPerf[currentBloomLevel]; if (p.total < 2) return;
  const rate = p.correct / p.total, idx = BLOOM_LEVELS.indexOf(currentBloomLevel);
  if (rate >= 0.75 && idx < BLOOM_LEVELS.length - 1) currentBloomLevel = BLOOM_LEVELS[idx + 1];
  else if (rate < 0.4 && idx > 0) currentBloomLevel = BLOOM_LEVELS[idx - 1];
}

function nextQuestionIndex() {
  for (let i = quizIndex; i < quizQuestions.length; i++) if (quizQuestions[i].bloom === currentBloomLevel) return i;
  return quizIndex < quizQuestions.length ? quizIndex : -1;
}

function formatBloomLevel(l) { return { Remember:'Remember',Understand:'Understand',Apply:'Apply',Analyze:'Analyze',Evaluate:'Evaluate',Create:'Create' }[l] || l; }

function showQuestion() {
  adaptBloomLevel();
  const idx = nextQuestionIndex();
  if (idx === -1 || quizIndex >= quizQuestions.length) { endQuiz(); return; }
  quizIndex = idx;
  const q = quizQuestions[quizIndex]; hintUsed = false; questionShownAt = Date.now();
  quizProgress.textContent   = `Question ${quizIndex + 1} / ${quizQuestions.length}`;
  quizBloomBadge.textContent = formatBloomLevel(q.bloom);
  quizBloomBadge.className   = `bloom-badge bloom-${q.bloom.toLowerCase()}`;
  quizQuestionEl.textContent = q.question;
  quizOptionsEl.innerHTML = '';
  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-option'; btn.textContent = opt;
    btn.addEventListener('click', () => handleAnswer(i, q));
    quizOptionsEl.appendChild(btn);
  });
  quizHintText.textContent = ''; quizHintText.classList.add('hidden');
  quizFeedback.textContent = ''; quizFeedback.className = 'quiz-feedback';
  quizNextBtn.classList.add('hidden'); quizHintBtn.classList.remove('hidden'); quizHintBtn.disabled = false;
}

function handleAnswer(chosen, q) {
  quizOptionsEl.querySelectorAll('.quiz-option').forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answer) btn.classList.add('correct');
    if (i === chosen && chosen !== q.answer) btn.classList.add('wrong');
  });
  quizHintBtn.classList.add('hidden');
  const correct = chosen === q.answer;
  bloomPerf[q.bloom].total++; if (correct) bloomPerf[q.bloom].correct++;
  if (hintUsed) { zpd.assisted.total++;   if (correct) zpd.assisted.correct++; }
  else          { zpd.unassisted.total++; if (correct) zpd.unassisted.correct++; }
  const entry = { correct, usedHint: hintUsed, responseMs: Date.now() - questionShownAt };
  humanLog.mcqResults.push(entry);
  dbLog('quiz_results', { session_id: SESSION_ID, bloom: q.bloom, topic: q.topic, correct: entry.correct, hint_used: entry.usedHint, response_ms: entry.responseMs, ts: 'NOW()' });
  runAssessor('mcq_answered', { lastMCQ: entry });
  quizResults.push({ question: q.question, bloom: q.bloom, topic: q.topic, correct, hintUsed });
  quizFeedback.textContent = correct ? `✓ Correct! ${q.explanation}` : `✗ Incorrect. Correct answer: ${q.options[q.answer]}. ${q.explanation}`;
  quizFeedback.className = `quiz-feedback ${correct ? 'feedback-correct' : 'feedback-wrong'}`;
  quizNextBtn.classList.remove('hidden');
}

if (quizHintBtn) quizHintBtn.addEventListener('click', () => {
  const q = quizQuestions[quizIndex]; if (!q) return;
  hintUsed = true; quizHintText.textContent = `💡 ${q.hint}`; quizHintText.classList.remove('hidden'); quizHintBtn.disabled = true;
});
if (quizNextBtn) quizNextBtn.addEventListener('click', () => { quizIndex++; showQuestion(); });

function endQuiz() {
  quizActive = false; quizContent.classList.add('hidden'); quizResultPanel.classList.remove('hidden');
  const total = quizResults.length, correct = quizResults.filter(r => r.correct).length;
  quizScoreEl.textContent = `${correct} / ${total} correct`;
  quizBloomChart.innerHTML = '';
  BLOOM_LEVELS.forEach(level => {
    const p = bloomPerf[level]; if (p.total === 0) return;
    const pct = Math.round((p.correct / p.total) * 100);
    const bar = document.createElement('div'); bar.className = 'bloom-bar-row';
    bar.innerHTML = `<span class="bloom-bar-label">${formatBloomLevel(level)}</span><div class="bloom-bar-track"><div class="bloom-bar-fill" style="width:${pct}%;background:${pct>=70?'#16a34a':pct>=40?'#ca8a04':'#dc2626'}"></div></div><span class="bloom-bar-pct">${pct}%</span>`;
    quizBloomChart.appendChild(bar);
  });
  const uRate = zpd.unassisted.total > 0 ? Math.round((zpd.unassisted.correct / zpd.unassisted.total) * 100) : 0;
  const aRate = zpd.assisted.total   > 0 ? Math.round((zpd.assisted.correct   / zpd.assisted.total)   * 100) : 0;
  const gap   = aRate - uRate;
  quizZpdEl.innerHTML = `<div>Independent performance: <strong>${uRate}%</strong></div><div>With support: <strong>${aRate}%</strong></div><div>ZPD gap: <strong>${gap>0?'+':''}${gap}%</strong> ${gap>20?'(more support needed)':gap>0?'(expected)':'(independent mastery)'}</div>`;
  const weakSet = new Set();
  quizResults.forEach(r => { if (!r.correct && !r.hintUsed) weakSet.add(r.topic); if (r.correct && r.hintUsed) weakSet.add(r.topic); });
  weakTopics = [...weakSet];
  if (reviseBtn) reviseBtn.classList.toggle('hidden', weakTopics.length === 0);
}

if (reviseBtn) reviseBtn.addEventListener('click', () => {
  if (!weakTopics.length) return;
  quizPanel.classList.add('hidden');
  setPauseReason('quiz', false);
  quizActive = false;
  dialogueLog.push({ name: 'System', text: `The student struggled with these quiz topics: ${weakTopics.join(', ')}. Focus the discussion on these topics.` });
  currentTurnIndex = 0;
});

if (quizCloseBtn) quizCloseBtn.addEventListener('click', () => {
  quizPanel.classList.add('hidden'); quizActive = false;
  setPauseReason('quiz', false);
});