import { loadEnvConfig, getViteEnv } from './env-config.js';

let _config = {};
loadEnvConfig().then(cfg => { _config = cfg; });

const _env = getViteEnv();
const GROQ_API_KEY = _config.GROQ_API_KEY || _env.VITE_GROQ_API_KEY || window.GROQ_API_KEY || '';

const params = new URLSearchParams(window.location.search);
const subject = params.get('subject') || '';
const detail = params.get('detail') || '';
const level = params.get('level') || 'HSC';
const dayIndex = params.get('dayIndex');
const sessionIndex = params.get('sessionIndex');

const stepLoading = document.getElementById('step-loading');
const stepQuiz = document.getElementById('step-quiz');
const stepResult = document.getElementById('step-result');
const stepError = document.getElementById('step-error');
const loadingFill = document.getElementById('quizLoadingFill');
const loadingMsg = document.getElementById('quizLoadingMsg');
const nextBtn = document.getElementById('nextBtn');
const timerText = document.getElementById('timerText');
const timerPill = document.getElementById('timerPill');
const btnRetry = document.getElementById('btnRetry');
const btnBackToRoutine = document.getElementById('btnBackToRoutine');
const btnGoBack = document.getElementById('btnGoBack');

let questions = [];
let currentIndex = 0;
let userAnswers = [];
let loadingTimer = null;
let quizTimer = null;
let timeLeft = 600;
let quizFinished = false;

function showStep(id) {
  [stepLoading, stepQuiz, stepResult, stepError].forEach(el => {
    if (el) el.classList.add('hidden');
  });
  const target = document.getElementById(id);
  if (target) target.classList.remove('hidden');
}

function resetQuizState() {
  questions = [];
  currentIndex = 0;
  userAnswers = [];
  quizFinished = false;
  timeLeft = 600;
  loadingFill.style.width = '0%';
  loadingMsg.textContent = 'Finding NCTB standard questions';
  nextBtn.style.display = 'none';
  nextBtn.textContent = 'Next Question';
  timerText.textContent = '10:00';
  timerPill.classList.remove('low-time');
  document.getElementById('optionsGrid').innerHTML = '';
  document.getElementById('questionText').textContent = '';
  document.getElementById('questionNumber').textContent = 'Question 1';
  document.getElementById('quizProgressText').textContent = 'Question 1 of 10';
  document.getElementById('quizProgressFill').style.width = '0%';
  document.getElementById('answerReview').innerHTML = '';
}

const loadingMessages = [
  'Searching NCTB curriculum...',
  'Identifying key topics...',
  'Composing MCQ questions...',
  'Verifying answer accuracy...',
  'Finalizing your quiz...'
];

function animateLoading() {
  let progress = 0;
  let msgIndex = 0;
  clearInterval(loadingTimer);
  loadingTimer = setInterval(() => {
    progress = Math.min(progress + Math.random() * 14, 92);
    loadingFill.style.width = `${progress}%`;
    if (msgIndex < loadingMessages.length - 1) {
      msgIndex++;
      loadingMsg.textContent = loadingMessages[msgIndex];
    }
  }, 700);
}

function startQuizTimer() {
  clearInterval(quizTimer);
  updateTimerUI();
  quizTimer = setInterval(() => {
    if (quizFinished) {
      clearInterval(quizTimer);
      return;
    }
    timeLeft -= 1;
    updateTimerUI();
    if (timeLeft <= 0) {
      timeLeft = 0;
      updateTimerUI();
      clearInterval(quizTimer);
      showResults(true);
    }
  }, 1000);
}

function updateTimerUI() {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = String(timeLeft % 60).padStart(2, '0');
  timerText.textContent = `${minutes}:${seconds}`;
  timerPill.classList.toggle('low-time', timeLeft <= 60);
}

async function fetchQuestions() {
  resetQuizState();
  showStep('step-loading');
  animateLoading();

  const prompt = `You are an expert question writer for Bangladeshi ${level} students following the NCTB curriculum.

Generate exactly 10 multiple-choice questions on the following topic:
Subject: ${subject}
Topic / Detail: ${detail}

Rules:
1. Return ONLY valid JSON.
2. The JSON must be an array of exactly 10 objects.
3. Each object has:
   - "question": the question string
   - "options": array of exactly 4 strings labeled A, B, C, D (include the letter prefix, e.g. "A. Newton's first law")
   - "answer": the correct option string exactly as it appears in "options"
   - "explanation": one sentence explaining why the answer is correct
4. Questions must be NCTB board-exam standard.
5. Mix recall, application, and conceptual questions.
6. Do not repeat questions.
7. No markdown, no backticks, no extra text.

Return only the JSON array.`;

  try {
    if (!GROQ_API_KEY) throw new Error('Missing VITE_GROQ_API_KEY in your Vite environment.');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        temperature: 0.4,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Groq API error ${response.status}: ${data.error?.message || 'Unknown API error'}`);
    }

    const raw = data.choices?.[0]?.message?.content;
    if (!raw) throw new Error('Empty response from Groq.');

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error('Model returned invalid JSON.');
    }

    if (!Array.isArray(parsed)) {
      if (Array.isArray(parsed.questions)) parsed = parsed.questions;
      else throw new Error('Quiz JSON must be an array.');
    }

    if (parsed.length !== 10) {
      throw new Error(`Expected 10 questions, got ${parsed.length}.`);
    }

    questions = parsed;
    clearInterval(loadingTimer);
    loadingFill.style.width = '100%';
    await new Promise(r => setTimeout(r, 250));

    renderQuiz();
    showStep('step-quiz');
    startQuizTimer();
  } catch (err) {
    clearInterval(loadingTimer);
    clearInterval(quizTimer);
    console.error(err);
    document.getElementById('errorMsg').textContent = err.message || 'Unknown error.';
    showStep('step-error');
  }
}

function renderQuiz() {
  document.getElementById('quizSubjectLabel').textContent = subject;
  document.getElementById('quizTopicLabel').textContent = detail;
  currentIndex = 0;
  userAnswers = [];
  renderQuestion();
}

function renderQuestion() {
  const q = questions[currentIndex];
  const total = questions.length;
  const progressPct = (currentIndex / total) * 100;

  document.getElementById('questionNumber').textContent = `Question ${currentIndex + 1}`;
  document.getElementById('questionText').textContent = q.question;
  document.getElementById('quizProgressText').textContent = `Question ${currentIndex + 1} of ${total}`;
  document.getElementById('quizProgressFill').style.width = `${progressPct}%`;

  const grid = document.getElementById('optionsGrid');
  grid.innerHTML = '';

  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.type = 'button';
    btn.textContent = opt;
    btn.onclick = () => selectAnswer(opt, btn);
    grid.appendChild(btn);
  });

  nextBtn.style.display = 'none';
  nextBtn.textContent = currentIndex === total - 1 ? 'See Results' : 'Next Question';
}

function selectAnswer(selected, clickedBtn) {
  if (quizFinished) return;

  const q = questions[currentIndex];

  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === q.answer) btn.classList.add('correct');
    if (btn === clickedBtn && selected !== q.answer) btn.classList.add('wrong');
  });

  userAnswers[currentIndex] = selected;
  nextBtn.style.display = 'block';
}

function showResults(fromTimer = false) {
  if (quizFinished) return;
  quizFinished = true;
  clearInterval(quizTimer);

  const total = questions.length;
  const correct = userAnswers.filter((ans, i) => ans === questions[i].answer).length;
  const pct = Math.round((correct / total) * 100);

  document.getElementById('resultHeading').textContent = fromTimer ? 'Time is up' : 'Quiz Complete';
  document.getElementById('scoreText').textContent = `${correct} / ${total}`;
  document.getElementById('quizProgressFill').style.width = '100%';

  let message = '';
  if (fromTimer) {
    message = 'The timer ended. Review your answers and try again to improve your speed.';
  } else if (pct >= 80) {
    message = 'Excellent work. You have a strong grasp of this topic.';
  } else if (pct >= 60) {
    message = 'Good effort. Review the explanations below to reinforce weak areas.';
  } else {
    message = 'Keep practicing. Go through the explanations and revisit the topic.';
  }
  document.getElementById('resultMessage').textContent = message;

  const review = document.getElementById('answerReview');
  review.innerHTML = `<h3>Answer Review</h3>` + questions.map((q, i) => {
    const userAns = userAnswers[i] || 'No answer';
    const isCorrect = userAns === q.answer;
    return `
      <div class="review-item ${isCorrect ? 'review-correct' : 'review-wrong'}">
        <p class="review-q"><strong>Q${i + 1}.</strong> ${q.question}</p>
        <p class="review-your">Your answer: ${userAns}</p>
        ${!isCorrect ? `<p class="review-correct-ans">Correct answer: ${q.answer}</p>` : ''}
        <p class="review-explanation">${q.explanation}</p>
      </div>
    `;
  }).join('');

  if (dayIndex !== null && sessionIndex !== null) {
    markTaskComplete(parseInt(dayIndex, 10), parseInt(sessionIndex, 10));
  }

  showStep('step-result');
}

function markTaskComplete(dIdx, sIdx) {
  try {
    const saved = localStorage.getItem('amplify_routine');
    if (!saved) return;
    const routine = JSON.parse(saved);
    if (routine[dIdx] && routine[dIdx].sessions[sIdx]) {
      routine[dIdx].sessions[sIdx].completed = true;
      localStorage.setItem('amplify_routine', JSON.stringify(routine));
    }
  } catch (err) {
    console.error('Could not mark task complete:', err);
  }
}

nextBtn.addEventListener('click', () => {
  if (currentIndex < questions.length - 1) {
    currentIndex++;
    renderQuestion();
  } else {
    showResults(false);
  }
});

btnRetry.addEventListener('click', () => {
  clearInterval(quizTimer);
  fetchQuestions();
});

btnBackToRoutine.addEventListener('click', () => {
  window.location.assign('/routine.html');
});

btnGoBack.addEventListener('click', () => {
  if (window.history.length > 1 && document.referrer) window.history.back();
  else window.location.assign('/index.html');
});

window.addEventListener('scroll', () => {
  const header = document.getElementById('header');
  if (header) header.classList.toggle('scrolled', window.scrollY > 50);
});

if (!subject || !detail) {
  document.getElementById('errorMsg').textContent = 'No subject or topic provided. Please go back and click a Quiz button.';
  showStep('step-error');
} else {
  fetchQuestions();
}