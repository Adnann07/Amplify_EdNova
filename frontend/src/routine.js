import { felcloudChatCompletion } from './felcloud-client.js';


// ── DOM refs ──
const form              = document.getElementById('routineForm');
const stepForm          = document.getElementById('step-form');
const stepLoading       = document.getElementById('step-loading');
const stepResult        = document.getElementById('step-result');
const loadingFill       = document.getElementById('loadingFill');
const loadingMsg        = document.getElementById('loadingMsg');
const routineOutput     = document.getElementById('routineOutput');
const resultMeta        = document.getElementById('resultMeta');
const btnRestart        = document.getElementById('btnRestart');
const examDateInput     = document.getElementById('examDate');
const daysRemaining     = document.getElementById('daysRemaining');
const hoursSlider       = document.getElementById('studyHours');
const hoursValue        = document.getElementById('hoursValue');
const uploadZone        = document.getElementById('uploadZone');
const uploadInput       = document.getElementById('syllabusUpload');
const uploadPreviews    = document.getElementById('uploadPreviews');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');

let selectedLevel  = 'SSC';
let uploadedImages = [];

// ── Level toggle ──
document.getElementById('btnSSC').addEventListener('click', () => setLevel('SSC'));
document.getElementById('btnHSC').addEventListener('click', () => setLevel('HSC'));

function setLevel(val) {
  selectedLevel = val;
  document.getElementById('btnSSC').classList.toggle('active', val === 'SSC');
  document.getElementById('btnHSC').classList.toggle('active', val === 'HSC');
  document.getElementById('levelInput').value = val;
}

// ── Date → days remaining ──
examDateInput.addEventListener('change', () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(examDateInput.value);
  const diff = Math.ceil((exam - today) / (1000 * 60 * 60 * 24));
  if (diff > 0) {
    daysRemaining.textContent = `${diff} days remaining`;
  } else if (diff === 0) {
    daysRemaining.textContent = 'Exam is today!';
  } else {
    daysRemaining.textContent = 'Please pick a future date';
  }
});

// ── Hours slider ──
hoursSlider.addEventListener('input', () => {
  hoursValue.textContent = `${hoursSlider.value} hrs`;
});

// ── Upload zone ──
uploadZone.addEventListener('click', () => uploadInput.click());

uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('dragover');
});

uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  handleFiles(Array.from(e.dataTransfer.files));
});

uploadInput.addEventListener('change', () => {
  handleFiles(Array.from(uploadInput.files));
});

function handleFiles(files) {
  const allowed = files.filter(f => f.type.startsWith('image/')).slice(0, 3);
  uploadedImages = allowed;
  uploadPreviews.innerHTML = '';
  if (allowed.length > 0) {
    uploadPlaceholder.style.display = 'none';
    allowed.forEach(file => {
      const img    = document.createElement('img');
      img.className = 'preview-thumb';
      img.src       = URL.createObjectURL(file);
      uploadPreviews.appendChild(img);
    });
  } else {
    uploadPlaceholder.style.display = 'flex';
  }
}

// ── Convert images to base64 ──
async function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader  = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Loading animation ──
const loadingMessages = [
  'Analyzing your syllabus and exam timeline...',
  'Calculating subject weights and priorities...',
  'Distributing study sessions across days...',
  'Scheduling revision and mock test slots...',
  'Finalizing your personalized routine...',
];

function animateLoading() {
  let progress = 0;
  let msgIndex  = 0;
  const interval = setInterval(() => {
    progress = Math.min(progress + Math.random() * 14, 92);
    loadingFill.style.width = `${progress}%`;
    if (msgIndex < loadingMessages.length - 1) {
      msgIndex++;
      loadingMsg.textContent = loadingMessages[msgIndex];
    }
  }, 900);
  return interval;
}

// ── Show / hide steps ──
function showStep(id) {
  [stepForm, stepLoading, stepResult].forEach(el => el.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

// ── Form submit ──
form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const examDate = examDateInput.value;
  const subjects = document.getElementById('subjects').value.trim();
  const hours    = hoursSlider.value;
  const today    = new Date();
  today.setHours(0, 0, 0, 0);
  const exam     = new Date(examDate);
  const daysLeft = Math.ceil((exam - today) / (1000 * 60 * 60 * 24));

  if (daysLeft <= 0) {
    alert('Please select a future exam date.');
    return;
  }

  showStep('step-loading');
  const loadingInterval = animateLoading();

  const imageContent = [];

  for (const img of uploadedImages) {
    const b64 = await toBase64(img);
    imageContent.push({
      type: 'image_url',
      image_url: { url: `data:${img.type};base64,${b64}` }
    });
  }

  const displayDays = Math.min(daysLeft, 60);
  const todayDate = new Date().toISOString().split('T')[0];

  try {
    const days = [];
    for (let firstDay = 1; firstDay <= displayDays; firstDay += 7) {
      const lastDay = Math.min(firstDay + 6, displayDays);
      const isFinalPhase = lastDay >= Math.ceil(displayDays * 0.8);
      const prompt = `You are an expert academic planner for Bangladeshi students.

Create days ${firstDay} through ${lastDay} of a day-by-day exam preparation routine for this student:

- Level: ${selectedLevel}
- Subjects: ${subjects}
- Days until exam: ${daysLeft}
- Available study hours per day: ${hours} hours
- Today's date: ${todayDate}
${uploadedImages.length > 0 ? '- Use the attached syllabus images to choose specific topics for this batch.' : ''}
${isFinalPhase ? '- This is the final revision phase: emphasize review and mock questions.' : ''}

Return ONLY a JSON array containing exactly ${lastDay - firstDay + 1} day objects. Each day object must have "day" (the absolute day number, ${firstDay} through ${lastDay}), "date" (YYYY-MM-DD), and "sessions" (an array).
Each session must have "time", "subject", "detail", and "tag" (study, revision, break, or mock). Give each day two focused study sessions and one short 15-30 minute break. Spread subjects evenly and do not repeat one subject more than twice in a day. No markdown or explanation.`;
      const content = imageContent.length
        ? [...imageContent, { type: 'text', text: prompt }]
        : prompt;
      const raw = await felcloudChatCompletion(
        [{ role: 'user', content }],
        { tier: 'midsize', temperature: 0.4, maxTokens: 1400 }
      );
      const clean = raw.replace(/```json|```/g, '').trim();
      const batch = JSON.parse(clean);
      if (!Array.isArray(batch) || batch.length !== lastDay - firstDay + 1) {
        throw new Error(`Felcloud returned an incomplete routine for days ${firstDay}-${lastDay}.`);
      }
      for (let index = 0; index < batch.length; index++) {
        const day = batch[index];
        if (
          day?.day !== firstDay + index
          || typeof day.date !== 'string'
          || !Array.isArray(day.sessions)
          || day.sessions.some(session => (
            !session
            || typeof session.time !== 'string'
            || typeof session.subject !== 'string'
            || typeof session.detail !== 'string'
            || !['study', 'revision', 'break', 'mock'].includes(session.tag)
          ))
        ) {
          throw new Error(`Felcloud returned an invalid routine for day ${firstDay + index}.`);
        }
      }
      days.push(...batch);
      if (lastDay < displayDays) await new Promise(resolve => setTimeout(resolve, 3100));
    }

    clearInterval(loadingInterval);
    loadingFill.style.width = '100%';
    await new Promise(r => setTimeout(r, 400));

    renderRoutine(days, { level: selectedLevel, subjects, daysLeft, hours, examDate });
    showStep('step-result');

  } catch (err) {
    clearInterval(loadingInterval);
    console.error(err);
    alert(`Something went wrong generating your routine. ${err.message || 'Please check your API key and try again.'}`);
    showStep('step-form');
  }
});

// ── Render routine ──
function renderRoutine(days, meta) {
  localStorage.setItem('amplify_routine', JSON.stringify(days));

  resultMeta.innerHTML = `
    <span class="meta-chip">📚 ${meta.level}</span>
    <span class="meta-chip">📅 ${meta.daysLeft} days to exam</span>
    <span class="meta-chip">⏱ ${meta.hours} hrs/day</span>
    <span class="meta-chip">🎯 ${meta.subjects}</span>
  `;

  routineOutput.innerHTML = days.map((day, i) => {
    const sessions = day.sessions.map(s => `
      <div class="session-row">
        <span class="session-time">${s.time}</span>
        <div>
          <div class="session-subject">${s.subject}</div>
          <div class="session-detail">${s.detail}</div>
        </div>
        <span class="session-tag tag-${s.tag}">${s.tag}</span>
      </div>
    `).join('');

    return `
      <div class="routine-day ${i === 0 ? 'open' : ''}" id="day-${i}">
        <div class="routine-day-header" onclick="toggleDay(${i})">
          <div>
            <h3>Day ${day.day}</h3>
            <span class="day-date">${formatDate(day.date)}</span>
          </div>
          <span class="day-toggle">▼</span>
        </div>
        <div class="routine-day-body">
          ${sessions}
        </div>
      </div>
    `;
  }).join('');
}

// ── Toggle day accordion ──
window.toggleDay = function(i) {
  document.getElementById(`day-${i}`).classList.toggle('open');
};

// ── Format date ──
function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ── Restart ──
btnRestart.addEventListener('click', () => {
  form.reset();
  uploadedImages = [];
  uploadPreviews.innerHTML   = '';
  uploadPlaceholder.style.display = 'flex';
  hoursValue.textContent     = '6 hrs';
  daysRemaining.textContent  = '';
  setLevel('SSC');
  showStep('step-form');
});

// ── Navbar scroll ──
window.addEventListener('scroll', () => {
  const header = document.getElementById('header');
  if (header) header.classList.toggle('scrolled', window.scrollY > 50);
});