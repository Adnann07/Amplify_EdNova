const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_PAGES = 35;
const FAST_MODEL = 'openai/gpt-oss-20b';
const REASONING_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.6-27b'];
const MODEL_TIMEOUT_MS = 90_000;
const elements = {
  dropzone: document.getElementById('dropzone'),
  pdfFile: document.getElementById('pdfFile'),
  fileStatus: document.getElementById('fileStatus'),
  progressWrap: document.getElementById('progressWrap'),
  progressFill: document.getElementById('progressFill'),
  progressText: document.getElementById('progressText'),
  diagnosticForm: document.getElementById('diagnosticForm'),
  startLesson: document.getElementById('startLesson'),
  profileCard: document.getElementById('profileCard'),
  profileSummary: document.getElementById('profileSummary'),
  editProfile: document.getElementById('editProfile'),
  levelSelect: document.getElementById('levelSelect'),
  styleSelect: document.getElementById('styleSelect'),
  languageSelect: document.getElementById('languageSelect'),
  priorKnowledge: document.getElementById('priorKnowledge'),
  chatMessages: document.getElementById('chatMessages'),
  tutorStatus: document.getElementById('tutorStatus'),
  chatForm: document.getElementById('chatForm'),
  messageInput: document.getElementById('messageInput'),
  sendButton: document.getElementById('sendButton'),
};

let pdfPages = [];
let conversation = [];
let busy = false;
let readingPdf = false;
let learningProfile = null;
let ocrWorker = null;
let ocrWorkerLanguage = '';
let activeSpeechButton = null;
let activeUtterance = null;
let activeSpeechAudio = null;
let activeSpeechUrl = '';
let activeSpeechController = null;

const SPEECH_LANGUAGES = {
  English: { locale: 'en-US', voices: ['en-US', 'en-GB', 'en'] },
  French: { locale: 'fr-FR', voices: ['fr-FR', 'fr-CA', 'fr'] },
  Arabic: { locale: 'ar', voices: ['ar', 'ar-SA', 'ar-EG'] },
  'Moroccan Darija': { locale: 'ar-MA', voices: ['ar-MA', 'ar'] },
};

function resetSpeechButton() {
  if (activeSpeechButton) {
    activeSpeechButton.textContent = activeSpeechButton.dataset.listenLabel;
    activeSpeechButton.setAttribute('aria-pressed', 'false');
  }
  if (activeSpeechAudio) {
    activeSpeechAudio.pause();
    activeSpeechAudio.src = '';
  }
  if (activeSpeechUrl) URL.revokeObjectURL(activeSpeechUrl);
  activeSpeechAudio = null;
  activeSpeechUrl = '';
  activeSpeechController = null;
  activeSpeechButton = null;
  activeUtterance = null;
}

function stopSpeech() {
  globalThis.speechSynthesis?.cancel();
  activeSpeechController?.abort();
  resetSpeechButton();
}

function findSpeechVoice(language) {
  const settings = SPEECH_LANGUAGES[language] || SPEECH_LANGUAGES.English;
  const voices = globalThis.speechSynthesis?.getVoices() || [];
  const normalized = voice => voice.lang.replaceAll('_', '-').toLowerCase();

  for (const preferred of settings.voices) {
    const match = voices.find(voice => normalized(voice) === preferred.toLowerCase());
    if (match) return match;
  }
  const languageCode = settings.locale.split('-')[0].toLowerCase();
  return voices.find(voice => normalized(voice).split('-')[0] === languageCode);
}

function createSpeechButton(text, language) {
  const settings = SPEECH_LANGUAGES[language] || SPEECH_LANGUAGES.English;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'speech-button';
  button.dataset.listenLabel = `🔊 Listen · ${language}`;
  button.textContent = button.dataset.listenLabel;
  button.setAttribute('aria-label', `Read this response aloud in ${language}`);
  button.setAttribute('aria-pressed', 'false');
  button.addEventListener('click', async () => {
    if (activeSpeechButton === button) {
      stopSpeech();
      return;
    }

    stopSpeech();
    activeSpeechButton = button;
    button.textContent = 'Preparing audio…';
    button.setAttribute('aria-pressed', 'true');

    const controller = new AbortController();
    activeSpeechController = controller;
    try {
      const response = await fetch('/api/pdf-tutor/speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
        signal: controller.signal,
        body: JSON.stringify({ text, language }),
      });
      if (!response.ok) {
        throw new Error(`Speech service returned HTTP ${response.status}.`);
      }
      const audioBlob = await response.blob();
      if (!audioBlob.size) throw new Error('Speech service returned empty audio.');
      if (controller.signal.aborted) return;

      activeSpeechUrl = URL.createObjectURL(audioBlob);
      activeSpeechAudio = new Audio(activeSpeechUrl);
      button.textContent = '⏹ Stop reading';
      await new Promise((resolve, reject) => {
        activeSpeechAudio.onended = resolve;
        activeSpeechAudio.onerror = () => reject(new Error('Audio playback failed.'));
        activeSpeechAudio.play().catch(reject);
      });
      if (activeSpeechButton === button) resetSpeechButton();
    } catch (error) {
      if (controller.signal.aborted) return;
      console.warn('[PDF Tutor speech] Azure playback failed; trying browser speech.', error);
      if (activeSpeechButton === button) resetSpeechButton();

      if (!globalThis.speechSynthesis || typeof globalThis.SpeechSynthesisUtterance !== 'function') {
        elements.tutorStatus.textContent = 'Voice playback is unavailable. Check the speech service or browser voice support.';
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = settings.locale;
      utterance.rate = 0.95;
      const voice = findSpeechVoice(language);
      if (voice) utterance.voice = voice;
      activeSpeechButton = button;
      activeUtterance = utterance;
      button.textContent = '⏹ Stop reading';
      button.setAttribute('aria-pressed', 'true');
      const finish = () => {
        if (activeUtterance === utterance) resetSpeechButton();
      };
      utterance.onend = finish;
      utterance.onerror = event => {
        if (activeUtterance !== utterance) return;
        finish();
        if (event.error !== 'canceled' && event.error !== 'interrupted') {
          elements.tutorStatus.textContent = `Speech playback failed (${event.error}). Check that your device has a voice for ${language}.`;
        }
      };
      try {
        globalThis.speechSynthesis.speak(utterance);
      } catch (speechError) {
        resetSpeechButton();
        elements.tutorStatus.textContent = `Speech playback could not start: ${speechError.message}`;
      }
    }
  });
  return button;
}

function setStatus(message, kind = '') {
  elements.fileStatus.textContent = message;
  elements.fileStatus.className = `file-status ${kind}`.trim();
}

function setProgress(percent, message) {
  elements.progressWrap.classList.remove('hidden');
  elements.progressFill.style.width = `${percent}%`;
  elements.progressText.textContent = message;
}

async function requestModel(model, messages, { maxTokens = 700, temperature = 0.35 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MODEL_TIMEOUT_MS);
  try {
    const response = await fetch('/api/pdf-tutor/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model_id: model,
        max_tokens: maxTokens,
        temperature,
        messages,
      }),
    });
    const responseText = await response.text();
    let data = null;
    if (responseText.trim()) {
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(response.ok
          ? 'The tutor service returned an unreadable response.'
          : `The tutor service returned an invalid response (HTTP ${response.status}).`);
      }
    } else if (!response.ok) {
      throw new Error(`The tutor service is unavailable (HTTP ${response.status}). Check that the AI backend is running.`);
    } else {
      throw new Error('The tutor service returned an empty response.');
    }
    if (!response.ok) {
      const detail = data && typeof data.detail === 'string' ? data.detail : '';
      throw new Error(detail || `The AI request failed (${response.status}).`);
    }
    if (typeof data.content !== 'string' || !data.content.trim()) {
      throw new Error('The AI service returned an empty response.');
    }
    return data.content.replace(/<think[^>]*>[\s\S]*?<\/think>/gi, '').trim();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(`The AI model ${model} timed out after ${MODEL_TIMEOUT_MS / 1000} seconds.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function requestWithFallback(models, messages, options) {
  let lastError;
  for (const model of models) {
    try {
      return await requestModel(model, messages, options);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('No AI model is available.');
}

function getOcrLanguage() {
  switch (elements.languageSelect.value) {
    case 'French': return 'fra';
    case 'Arabic': return 'ara';
    case 'Moroccan Darija': return 'ara+fra';
    default: return 'eng';
  }
}

async function getOcrWorker(language) {
  if (!globalThis.Tesseract?.createWorker) {
    throw new Error('The local OCR engine did not load. Check your connection and reload the page.');
  }
  if (ocrWorker && ocrWorkerLanguage !== language) {
    await ocrWorker.terminate();
    ocrWorker = null;
  }
  if (!ocrWorker) {
    setStatus(`Loading local ${language.toUpperCase()} OCR…`);
    ocrWorker = await Tesseract.createWorker(language, 1, {
      logger: message => {
        if (message.status === 'recognizing text') {
          setStatus(`Reading scanned page… ${Math.round(message.progress * 100)}%`);
        }
      },
    });
    ocrWorkerLanguage = language;
  }
  return ocrWorker;
}

async function ocrPage(page, pageNumber, language) {
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser could not prepare a PDF page for OCR.');
  try {
    setStatus(`Preparing scanned page ${pageNumber} for local OCR…`);
    await page.render({ canvasContext: context, viewport }).promise;
    const worker = await getOcrWorker(language);
    setStatus(`Running local OCR on scanned page ${pageNumber}…`);
    const { data } = await worker.recognize(canvas);
    return data.text.trim();
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

async function readPdf(file) {
  if (!file || file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new Error('Choose a PDF file to start.');
  }
  if (file.size > MAX_FILE_BYTES) throw new Error('This PDF is larger than 20 MB. Choose a smaller file.');
  if (!globalThis.pdfjsLib) throw new Error('The PDF reader did not load. Check your connection and reload the page.');
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  setStatus(`Reading ${file.name}…`);
  setProgress(2, 'Opening your PDF…');
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const pageCount = Math.min(pdf.numPages, MAX_PAGES);
  const ocrLanguage = getOcrLanguage();
  const pages = [];
  for (let number = 1; number <= pageCount; number++) {
    setProgress(Math.round(number / pageCount * 95), `Reading page ${number} of ${pageCount}…`);
    const page = await pdf.getPage(number);
    const content = await page.getTextContent();
    let text = content.items.map(item => item.str).join(' ').trim();
    if (text.replace(/\s/g, '').length < 35) {
      setProgress(Math.round(number / pageCount * 95), `Using OCR on scanned page ${number} of ${pageCount}…`);
      text = await ocrPage(page, number, ocrLanguage);
    }
    if (text.trim()) pages.push({ number, text: text.trim() });
  }
  if (!pages.length) throw new Error('No readable text was found. Try a clearer PDF or another file.');
  pdfPages = pages;
  conversation = [];
  setProgress(100, `Ready · ${pages.length} readable page${pages.length === 1 ? '' : 's'}${pdf.numPages > MAX_PAGES ? ` (first ${MAX_PAGES} pages)` : ''}`);
  setStatus(`${file.name} · ${pages.length} page${pages.length === 1 ? '' : 's'} indexed, including OCR for scanned pages.`, 'success');
  elements.startLesson.disabled = false;
}

function addMessage(role, text, actions = [], speechLanguage = '', speechText = text) {
  const bubble = document.createElement('article');
  bubble.className = `message ${role}`;
  bubble.dir = 'auto';
  const label = document.createElement('span');
  label.className = 'message-label';
  label.textContent = role === 'assistant' ? 'Your tutor' : 'You';
  const body = document.createElement('div');
  body.textContent = text;
  bubble.append(label, body);
  if (actions.length) {
    const actionRow = document.createElement('div');
    actionRow.className = 'message-actions';
    for (const action of actions) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = action.label;
      button.addEventListener('click', action.onClick);
      actionRow.append(button);
    }
    bubble.append(actionRow);
  }
  if (role === 'assistant' && speechLanguage) {
    const actionRow = bubble.querySelector('.message-actions') || document.createElement('div');
    actionRow.className = 'message-actions';
    actionRow.append(createSpeechButton(speechText, speechLanguage));
    if (!actionRow.parentElement) bubble.append(actionRow);
  }
  elements.chatMessages.append(bubble);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  return bubble;
}

function setBusy(value, status) {
  busy = value;
  elements.pdfFile.disabled = value || readingPdf;
  elements.sendButton.disabled = value || !learningProfile;
  elements.messageInput.disabled = value || !learningProfile;
  elements.startLesson.disabled = value || !pdfPages.length || !!learningProfile;
  elements.diagnosticForm.querySelectorAll('select, textarea').forEach(input => { input.disabled = value || !!learningProfile; });
  elements.chatMessages.querySelectorAll('.message-actions button').forEach(button => { button.disabled = value; });
  elements.tutorStatus.textContent = status;
}

async function runDiagnostic() {
  const language = elements.languageSelect.value;
  const answers = {
    selfAssessedLevel: elements.levelSelect.value,
    preferredMethod: elements.styleSelect.value,
    language,
    priorKnowledge: elements.priorKnowledge.value.trim() || 'Not provided yet',
  };
  setBusy(true, 'A quick learning check-in is underway…');
  elements.startLesson.textContent = 'Finding your learning fit…';
  try {
    const summary = await requestModel(FAST_MODEL, [
      { role: 'system', content: `You are a concise learning diagnostic. Use the learner's self-assessment and their low-stakes explanation exercise, comparing their response with the PDF context, to identify a starting level, likely useful explanation approach, and one adaptation to watch for as they learn. Do not claim certainty about a fixed learning style or judge the learner. Reply in ${language}, in 2 short sentences, in a warm and non-judgmental tone.` },
      { role: 'user', content: JSON.stringify({
        ...answers,
        diagnosticExercise: answers.priorKnowledge,
        pdfContext: relevantContext('key ideas concepts definitions', 2200),
      }) },
    ], { maxTokens: 180, temperature: 0.2 });
    learningProfile = { ...answers, summary };
    elements.profileSummary.textContent = summary;
    elements.profileCard.classList.remove('hidden');
    elements.chatMessages.innerHTML = '';
    elements.messageInput.disabled = false;
    elements.messageInput.placeholder = 'Ask about a concept, or tell me what feels confusing…';
    elements.messageInput.focus();
    elements.sendButton.disabled = false;
    addMessage('assistant', `${summary}\n\nI’ve read your PDF. What would you like to understand first? I can start with a hint and a guiding question.`, [], language, summary);
    setBusy(false, `${answers.language} · ${answers.selfAssessedLevel} · ${answers.preferredMethod}`);
    elements.diagnosticForm.querySelectorAll('select, textarea').forEach(input => { input.disabled = true; });
    elements.startLesson.textContent = 'Learning plan ready';
  } catch (error) {
    setBusy(false, 'The learning check-in could not be completed.');
    elements.startLesson.textContent = 'Try the check-in again';
    addMessage('assistant', error.message);
  }
}

function relevantContext(query) {
  const terms = new Set(query.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []);
  const ranked = pdfPages.map(page => {
    const pageTerms = page.text.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [];
    const counts = new Map();
    for (const term of pageTerms) counts.set(term, (counts.get(term) || 0) + 1);
    const score = [...terms].reduce((total, term) => total + (counts.has(term) ? 1 + Math.log(counts.get(term)) : 0), 0);
    return { ...page, score };
  }).sort((a, b) => b.score - a.score);
  const selected = (ranked.some(page => page.score > 0) ? ranked.filter(page => page.score > 0).slice(0, 4) : ranked.slice(0, 2));
  return selected.map(page => `[PDF page ${page.number}]\n${page.text}`).join('\n\n').slice(0, 9000);
}

async function classifyTurn(userText) {
  const language = learningProfile.language;
  const result = await requestModel(FAST_MODEL, [
    { role: 'system', content: 'Classify the learner’s latest message using the prior learning profile and conversation. Return only valid JSON with keys "confused" (boolean), "level" (beginner/intermediate/advanced), "approach" (one short phrase), and "reason" (one short phrase). Treat explicit confusion or repeated misunderstanding as confused. Do not infer ability from grammar or language.' },
    { role: 'user', content: JSON.stringify({ language, profile: learningProfile, recentConversation: conversation.slice(-6), latestMessage: userText }) },
  ], { maxTokens: 120, temperature: 0.1 });
  const json = result.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error('The learning diagnostic returned an unreadable result. Please try your question again.');
  try {
    const profile = JSON.parse(json);
    if (typeof profile.confused !== 'boolean' || !['beginner', 'intermediate', 'advanced'].includes(profile.level)) {
      throw new Error('invalid diagnostic fields');
    }
    return profile;
  } catch {
    throw new Error('The learning diagnostic returned an invalid result. Please try your question again.');
  }
}

function addTyping(message) {
  const typing = document.createElement('div');
  typing.className = 'typing';
  typing.setAttribute('role', 'status');
  typing.textContent = message;
  elements.chatMessages.append(typing);
  elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  return typing;
}

async function askForHint(question, diagnostic) {
  const language = learningProfile.language;
  const context = relevantContext(question);
  const system = `You are a patient, Socratic AI tutor. Answer in ${language}. Learner level: ${diagnostic.level}. Preferred approach: ${diagnostic.approach || learningProfile.preferredMethod}. ${diagnostic.confused ? 'The learner appears confused: simplify substantially, validate the difficulty without judgment, use one concrete analogy, and avoid jargon.' : 'Adapt to the learner’s current understanding.'} Use the provided PDF context as the source of truth. First respond with a useful hint and one guiding question only; do not give the complete answer. Keep it short and specific. If the answer is not in the PDF, say so and distinguish general knowledge clearly.`;
  return requestWithFallback(REASONING_MODELS, [
    { role: 'system', content: system },
    { role: 'user', content: `PDF context:\n${context}\n\nLearner question: ${question}` },
  ], { maxTokens: 500, temperature: 0.45 });
}

async function revealExplanation(question, hintBubble, diagnostic) {
  if (busy) return;
  setBusy(true, 'Building a clear explanation…');
  const typing = addTyping('Putting the idea together…');
  try {
    const context = relevantContext(question);
    const history = conversation.slice(-8).map(item => `${item.role}: ${item.content}`).join('\n');
    const answer = await requestWithFallback(REASONING_MODELS, [
      { role: 'system', content: `You are a patient, accessible AI tutor. Respond in ${learningProfile.language}. Explain at ${diagnostic.level} level using ${diagnostic.approach || learningProfile.preferredMethod}. ${diagnostic.confused ? 'The learner has signaled confusion: start from the simplest idea, use short steps and a different everyday example, and check understanding gently.' : 'Use plain language and concrete examples.'} Give a complete but focused explanation grounded in the supplied PDF. Define difficult terms and never shame the learner. Do not invent claims from the document.` },
      { role: 'user', content: `Relevant PDF context:\n${context}\n\nRecent conversation:\n${history}\n\nExplain the answer to: ${question}` },
    ], { maxTokens: 900, temperature: 0.4 });
    typing.remove();
    addMessage('assistant', answer, [], learningProfile.language);
    conversation.push({ role: 'assistant', content: answer });
  } catch (error) {
    typing.remove();
    addMessage('assistant', error.message);
  } finally {
    setBusy(false, `${learningProfile.language} · ${diagnostic.level} · ${diagnostic.approach || learningProfile.preferredMethod}`);
  }
}

async function submitQuestion(question) {
  if (busy || !learningProfile || !question.trim()) return;
  const cleanQuestion = question.trim();
  addMessage('user', cleanQuestion);
  conversation.push({ role: 'user', content: cleanQuestion });
  elements.messageInput.value = '';
  setBusy(true, 'Checking what would help you most…');
  const typing = addTyping('Noticing how this idea is landing…');
  try {
    const diagnostic = await classifyTurn(cleanQuestion);
    learningProfile.level = diagnostic.level;
    learningProfile.approach = diagnostic.approach;
    const hint = await askForHint(cleanQuestion, diagnostic);
    typing.remove();
    const hintBubble = addMessage('assistant', hint, [{
      label: 'Show the full explanation',
      onClick: () => revealExplanation(cleanQuestion, hintBubble, diagnostic),
    }, {
      label: 'I’m still confused',
      onClick: () => submitQuestion(`I’m still confused about this. Please explain it differently: ${cleanQuestion}`),
    }], learningProfile.language);
    conversation.push({ role: 'assistant', content: hint });
  } catch (error) {
    typing.remove();
    addMessage('assistant', error.message);
  } finally {
    setBusy(false, `${learningProfile.language} · ${learningProfile.level} · ${learningProfile.approach || learningProfile.preferredMethod}`);
  }
}

elements.pdfFile.addEventListener('change', async () => {
  const file = elements.pdfFile.files?.[0];
  if (!file || readingPdf) return;
  readingPdf = true;
  elements.pdfFile.disabled = true;
  pdfPages = [];
  conversation = [];
  elements.startLesson.disabled = true;
  elements.profileCard.classList.add('hidden');
  learningProfile = null;
  elements.messageInput.disabled = true;
  elements.sendButton.disabled = true;
  elements.messageInput.placeholder = 'Complete your learning check-in to continue…';
  elements.chatMessages.replaceChildren();
  try {
    await readPdf(file);
  } catch (error) {
    setStatus(error.message, 'error');
    elements.progressWrap.classList.add('hidden');
  } finally {
    readingPdf = false;
    elements.pdfFile.disabled = false;
  }
});

elements.dropzone.addEventListener('dragover', event => {
  event.preventDefault();
  elements.dropzone.classList.add('dragging');
});
elements.dropzone.addEventListener('dragleave', () => elements.dropzone.classList.remove('dragging'));
elements.dropzone.addEventListener('drop', event => {
  event.preventDefault();
  elements.dropzone.classList.remove('dragging');
  if (readingPdf || busy) return;
  const [file] = event.dataTransfer.files;
  if (!file) return;
  const transfer = new DataTransfer();
  transfer.items.add(file);
  elements.pdfFile.files = transfer.files;
  elements.pdfFile.dispatchEvent(new Event('change'));
});
elements.diagnosticForm.addEventListener('submit', event => {
  event.preventDefault();
  runDiagnostic();
});
elements.editProfile.addEventListener('click', () => {
  learningProfile = null;
  elements.profileCard.classList.add('hidden');
  elements.diagnosticForm.querySelectorAll('select, textarea').forEach(input => { input.disabled = false; });
  elements.startLesson.disabled = !pdfPages.length;
  elements.startLesson.textContent = 'Analyze & start lesson';
  elements.messageInput.disabled = true;
  elements.sendButton.disabled = true;
  elements.messageInput.placeholder = 'Complete your learning check-in to continue…';
});
elements.chatForm.addEventListener('submit', event => {
  event.preventDefault();
  submitQuestion(elements.messageInput.value);
});
elements.messageInput.addEventListener('keydown', event => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    elements.chatForm.requestSubmit();
  }
});
