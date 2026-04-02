window.addEventListener('pageshow', e => { if (e.persisted) location.reload(); });

// focus = 25 min, short break = 5 min, long break = 30 min
const PHASES = {
  focus: { label: 'Focus Session', minutes: 25 },
  short: { label: 'Short Break', minutes: 5 },
  long: { label: 'Long Break', minutes: 30 }
};

const saved = JSON.parse(sessionStorage.getItem('focusState') || 'null');
let phase = saved?.phase || 'focus';
let remaining = saved?.remaining ?? PHASES.focus.minutes * 60;
let running = false;
let interval = null;
let session = saved?.session || 0;

const timerEl = document.getElementById('focusTimer');
const playIcon = document.getElementById('playIcon');
const labelEl = document.getElementById('focusLabel');
const dotsEl = document.getElementById('focusDots');

function saveState() {
  sessionStorage.setItem('focusState', JSON.stringify({ phase, remaining, session }));
}

function pad(n) { return String(n).padStart(2, '0'); }

function render() {
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  timerEl.textContent = `${pad(m)}:${pad(s)}`;
  document.title = `${pad(m)}:${pad(s)} — LifeOS Focus`;
}

function updateDots() {
  const dots = dotsEl.querySelectorAll('.focus-dot');
  dots.forEach((d, i) => {
    d.classList.remove('active', 'done');
    if (i < session && phase !== 'focus') d.classList.add('done');
    else if (i < session) d.classList.add('done');
    if (i === session && phase === 'focus') d.classList.add('active');
  });
}

function setPhase(p) {
  phase = p;
  remaining = PHASES[p].minutes * 60;
  labelEl.textContent = PHASES[p].label;
  stopTimer();
  render();
  updateDots();
  saveState();
}

function toggleTimer() {
  running ? stopTimer() : startTimer();
}

function startTimer() {
  running = true;
  playIcon.className = 'fa-solid fa-pause';
  interval = setInterval(() => {
    remaining--;
    render();
    saveState();
    if (remaining <= 0) {
      clearInterval(interval);
      running = false;
      playIcon.className = 'fa-solid fa-play';
      onPhaseEnd(true);
    }
  }, 1000);
}

function stopTimer() {
  running = false;
  clearInterval(interval);
  playIcon.className = 'fa-solid fa-play';
}

function resetTimer() {
  stopTimer();
  remaining = PHASES[phase].minutes * 60;
  render();
}

function skipSession() {
  stopTimer();
  onPhaseEnd(false);
}

function onPhaseEnd(natural) {
  if (phase === 'focus') {
    // Only log to DB if the timer completes naturally
    if (natural) {
      fetch('/api/focus', { method: 'POST', credentials: 'same-origin' });
    }
    session++;
    if (session >= 4) {
      session = 0;
      updateDots();
      setPhase('long');
    } else {
      updateDots();
      setPhase('short');
    }
  } else {
    if (phase === 'long') sessionStorage.removeItem('focusState');
    setPhase('focus');
  }
}

render();
updateDots();
