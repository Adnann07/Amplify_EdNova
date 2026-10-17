// ── Dashboard: show today's routine + voice greeting on homepage ──

// ── Day tracking ──
function getVisitDayNumber() {
  const today      = new Date().toDateString();
  const firstVisit = localStorage.getItem('amplify_first_visit');

  if (!firstVisit) {
    localStorage.setItem('amplify_first_visit', today);
    localStorage.setItem('amplify_visit_day',   '1');
    localStorage.setItem('amplify_last_visit',   today);
    return 1;
  }

  const lastVisit = localStorage.getItem('amplify_last_visit');
  let dayCount    = parseInt(localStorage.getItem('amplify_visit_day') || '1');

  if (lastVisit !== today) {
    dayCount += 1;
    localStorage.setItem('amplify_visit_day',  String(dayCount));
    localStorage.setItem('amplify_last_visit', today);
  }

  return dayCount;
}

// ── Keep routine announcements readable by English speech synthesis ──
function sanitizeForSpeech(text) {
  if (!text) return '';

  return text.replace(/[^\x00-\x7F]/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

// ── Convert a time string like "8:00 AM - 9:45 AM" into natural speech ──
// Handles separators: " - ", " – ", " to ", "–", "-"
// Output: "8:00 AM to 9:45 AM"
function formatTimeForSpeech(timeStr) {
  if (!timeStr) return '';

  // Normalise various dash/separator styles to a single token we can split on
  const normalised = timeStr
    .replace(/\s*[–—-]+\s*/g, '|')  // en-dash, em-dash, hyphen → pipe
    .replace(/\s+to\s+/gi, '|');    // "to" → pipe

  const parts = normalised.split('|').map(p => p.trim()).filter(Boolean);

  if (parts.length === 2) {
    // "8:00 AM to 9:45 AM" — sounds natural when spoken
    return `${parts[0]} to ${parts[1]}`;
  }

  // Single time or unrecognised format — return as-is
  return sanitizeForSpeech(timeStr);
}

// ── Build speech text from a day's session data ──
function buildSpeechText(dayData) {
  if (!dayData) return 'No routine found for today.';

  const sessions = dayData.sessions.filter(s => s.tag !== 'break');
  if (sessions.length === 0) return "Today's a rest day — go easy on yourself and recharge.";

  const connectors = ["you've got", "it's time for", "next up is", "you have"];

  const lines = sessions.map((s, i) => {
    const subject   = sanitizeForSpeech(s.subject);
    const detail    = sanitizeForSpeech(s.detail);
    const timeRange = formatTimeForSpeech(s.time);   // ← natural "X to Y" format
    const connector = connectors[i % connectors.length];

    return `From ${timeRange}, ${connector} ${subject}. ${detail}`;
  });

  return lines.join('... ') + '.';
}

// ── Pick the most natural-sounding English voice available ──
function pickEnglishVoice() {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;

  const preferred = [
    'Google UK English Female',
    'Google UK English Male',
    'Google US English',
    'Microsoft Aria Online (Natural) - English (United States)',
    'Microsoft Jenny Online (Natural) - English (United States)',
    'Microsoft Guy Online (Natural) - English (United States)',
    'Samantha',
    'Karen',
    'Daniel',
    'Moira',
  ];

  for (const name of preferred) {
    const match = voices.find(v => v.name === name);
    if (match) return match;
  }

  // Prefer cloud/neural voices over local robotic ones
  const onlineEn = voices.find(v => v.lang.startsWith('en') && v.localService === false);
  if (onlineEn) return onlineEn;

  return voices.find(v => v.lang.startsWith('en')) || null;
}

// ── Core speak function ──
function speakRoutine(body) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const voice = pickEnglishVoice();
  const btn   = document.getElementById('dashboardSpeakBtn');

  function makeUtterance(text, rate = 0.88, pitch = 1.05) {
    const utt  = new SpeechSynthesisUtterance(text);
    if (voice) utt.voice = voice;
    utt.lang   = 'en-US';
    utt.rate   = rate;
    utt.pitch  = pitch;
    utt.volume = 1;
    return utt;
  }

  const utt1 = makeUtterance(
    "Hello, welcome back to Amplify, your AI companion. Hope you're having a good day. Here's what you've got lined up today —",
    0.85, 1.08
  );
  const utt2 = makeUtterance(body, 0.88, 1.03);
  const utt3 = makeUtterance(
    "Study hard. good luck!",
    0.86, 1.05
  );

  utt1.onstart = () => btn?.classList.add('speaking');
  utt1.onend   = () => setTimeout(() => window.speechSynthesis.speak(utt2), 300);
  utt2.onend   = () => setTimeout(() => window.speechSynthesis.speak(utt3), 200);
  utt3.onend   = () => btn?.classList.remove('speaking');
  utt1.onerror = () => btn?.classList.remove('speaking');
  utt2.onerror = () => btn?.classList.remove('speaking');
  utt3.onerror = () => btn?.classList.remove('speaking');

  window.speechSynthesis.speak(utt1);
}

// ── Wait for voices to load, then speak ──
function speakWhenReady(body) {
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null;
      speakRoutine(body);
    };
  } else {
    speakRoutine(body);
  }
}

// ── Render dashboard ──
function renderDashboard(routine, displayDayIndex) {
  const dashboard  = document.getElementById('dailyDashboard');
  const sessionsEl = document.getElementById('dashboardSessions');
  const subtitleEl = document.getElementById('dashboardDayLabel');
  const counterEl  = document.getElementById('dashDayCounter');
  const prevBtn    = document.getElementById('dashPrevDay');
  const nextBtn    = document.getElementById('dashNextDay');

  if (!dashboard || !routine || routine.length === 0) return;

  const dayData = routine[displayDayIndex];
  if (!dayData) return;

  dashboard.style.display = 'block';

  const dateStr = dayData.date
    ? new Date(dayData.date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
    : `Day ${dayData.day}`;
  subtitleEl.textContent = `Day ${dayData.day} — ${dateStr}`;
  counterEl.textContent  = `${displayDayIndex + 1} / ${routine.length} days`;

  // ── REPLACED BLOCK START ──
  sessionsEl.innerHTML = dayData.sessions.map((s, sIdx) => {
    const isBreak     = s.tag === 'break';
    const isCompleted = s.completed === true;
    const quizParams  = new URLSearchParams({
      subject:      s.subject,
      detail:       s.detail,
      level:        'HSC',
      dayIndex:     String(displayDayIndex),
      sessionIndex: String(sIdx)
    });
    const quizLink = `/quiz.html?${quizParams.toString()}`;

    return `
      <div class="dash-session ${isBreak ? 'is-break' : ''} ${isCompleted ? 'is-completed' : ''}">
        <span class="dash-time">${s.time}</span>
        <div class="dash-session-body">
          <div class="dash-subject ${isCompleted ? 'task-done' : ''}">${s.subject}</div>
          <div class="dash-detail ${isCompleted ? 'task-done' : ''}">${s.detail}</div>
        </div>
        <div class="dash-session-actions">
          <span class="dash-tag dash-tag-${s.tag}">${s.tag}</span>
          ${!isBreak ? `<a href="${quizLink}" class="quiz-btn">Quiz</a>` : ''}
        </div>
      </div>
    `;
  }).join('');
  // ── REPLACED BLOCK END ──

  prevBtn.disabled = displayDayIndex === 0;
  nextBtn.disabled = displayDayIndex === routine.length - 1;
  prevBtn.onclick  = () => renderDashboard(routine, displayDayIndex - 1);
  nextBtn.onclick  = () => renderDashboard(routine, displayDayIndex + 1);

  const speakBtn = document.getElementById('dashboardSpeakBtn');
  speakBtn.onclick = () => speakWhenReady(buildSpeechText(dayData));
}

// ── Init ──
function initDashboard() {
  const saved = localStorage.getItem('amplify_routine');
  if (!saved) return;

  try {
    const routine    = JSON.parse(saved);
    const todayDay   = getVisitDayNumber();
    const todayIndex = routine.findIndex(d => d.day === todayDay);
    const startIndex = todayIndex >= 0 ? todayIndex : 0;

    renderDashboard(routine, startIndex);

    const speakBtn = document.getElementById('dashboardSpeakBtn');
    speakBtn.classList.add('speaking');

    let hasSpoken = false;

    function triggerAutoSpeak() {
      if (hasSpoken) return;
      hasSpoken = true;

      document.removeEventListener('click',      triggerAutoSpeak);
      document.removeEventListener('keydown',    triggerAutoSpeak);
      document.removeEventListener('touchstart', triggerAutoSpeak);
      document.removeEventListener('scroll',     triggerAutoSpeak);

      speakBtn.classList.remove('speaking');

      const dayData = routine[startIndex];
      if (dayData) speakWhenReady(buildSpeechText(dayData));
    }

    document.addEventListener('click',      triggerAutoSpeak, { once: true });
    document.addEventListener('keydown',    triggerAutoSpeak, { once: true });
    document.addEventListener('touchstart', triggerAutoSpeak, { once: true });
    document.addEventListener('scroll',     triggerAutoSpeak, { once: true });

  } catch (err) {
    console.error('Dashboard init failed:', err);
  }
}

window.addEventListener('load', initDashboard);