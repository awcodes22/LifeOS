
// if browser restores this page from cache after logout, force a fresh request so requireAuth can redirect
window.addEventListener('pageshow', e => { if (e.persisted) location.reload(); });

// Stats from DB, single request for stats to update together
fetch('/api/insights', { credentials: 'same-origin' })
  .then(r => r.json())
  .then(({ journals, tasks, focus }) => {
    document.getElementById('js-logs-total').textContent = journals.total_logs;
    document.getElementById('js-tasks-done').textContent = tasks.completed_tasks;
    const rate = tasks.total_tasks > 0 ? Math.round((tasks.completed_tasks / tasks.total_tasks) * 100) : 0;
    document.getElementById('js-tasks-rate').textContent = rate;
    document.getElementById('js-focus-total').textContent = focus.total_sessions;

    document.querySelectorAll('.los-stat-body').forEach((el, i) => {
      setTimeout(() => el.classList.add('is-loaded'), i * 80);
    });
  })
  .catch(() => {
    ['js-logs-total', 'js-tasks-done', 'js-tasks-rate', 'js-focus-total']
      .forEach(id => { document.getElementById(id).textContent = '0'; });
    document.querySelectorAll('.los-stat-body').forEach(el => el.classList.add('is-loaded'));
  });

// Pull a random motivational quote, proxied through our server to avoid CORS
fetch('/api/quote')
  .then(r => r.json())
  .then(({ q, a }) => {
    document.getElementById('js-quote').textContent = q;
    document.getElementById('js-quote-author').textContent = `— ${a}`;
  })
  .catch(() => {
    // fallback if the API is down — Aristotle quote
  })
  .finally(() => {
    requestAnimationFrame(() => {
      document.getElementById('js-quote').style.opacity = '1';
      document.getElementById('js-quote-author').style.opacity = '1';
    });
  });

// Live date in hero
const d = new Date();
document.getElementById('js-date').textContent = d.toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});
document.getElementById('js-year').textContent = d.getFullYear();

// Hamburger menu
function toggleMenu() {
  const btn = document.getElementById('hamburger');
  const menu = document.getElementById('mobileMenu');
  btn.classList.toggle('open');
  menu.classList.toggle('open');
  document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
}
function handleOverlayClick(e) {
  if (e.target === document.getElementById('mobileMenu')) toggleMenu();
}

// Reflection modal
document.getElementById('reflModalDate').textContent = d.toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});

async function saveReflection(e) {
  e.preventDefault();
  const title = document.getElementById('reflTitle').value.trim();
  const content = document.getElementById('reflContent').value.trim();
  const mood = document.getElementById('reflMood').value;
  if (!content) return;

  try {
    const res = await fetch('/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ title, content, mood })
    });
    if (!res.ok) { console.error('Save failed:', res.status, await res.text()); return; }

    // Close modal and reset form
    document.getElementById('reflectionModal').classList.remove('open');
    document.getElementById('reflTitle').value = '';
    document.getElementById('reflContent').value = '';
    document.getElementById('reflMood').value = '';
    document.querySelectorAll('#reflectionModal .modal-mood__option').forEach(o => o.classList.remove('selected'));

    // Update the reflections counter without a page reload
    const countEl = document.getElementById('js-logs-total');
    countEl.textContent = (parseInt(countEl.textContent) || 0) + 1;
  } catch (err) {
    console.error('saveReflection error:', err);
  }
}

function openReflectionModal() {
  document.getElementById('reflectionModal').classList.add('open');
}

function closeReflectionModal(e) {
  if (!e || e.target === document.getElementById('reflectionModal')) {
    document.getElementById('reflectionModal').classList.remove('open');
  }
}

function selectReflMood(el) {
  document.querySelectorAll('#reflectionModal .modal-mood__option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('reflMood').value = el.dataset.mood;
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeReflectionModal(); });

// Delete modal
let pendingForm = null;

function showDeleteModal(form) {
  pendingForm = form;
  document.getElementById('deleteModal').classList.add('active');
}

function hideDeleteModal() {
  pendingForm = null;
  document.getElementById('deleteModal').classList.remove('active');
}

function confirmDelete() {
  if (pendingForm) pendingForm.submit();
}

document.getElementById('deleteModal').addEventListener('click', function (e) {
  if (e.target === this) hideDeleteModal();
});
