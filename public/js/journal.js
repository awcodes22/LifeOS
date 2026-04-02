window.addEventListener('pageshow', e => { if (e.persisted) location.reload(); });

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

const _now = new Date();
document.getElementById('modalDate').textContent = _now.toLocaleDateString('en-US', {
  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});

// In-memory store, load from the DB on page load
let logs = [];

// Date formatting
function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday - 86400000);
  const startOfWeek = new Date(startOfToday - 6 * 86400000);
  let label;
  if (d >= startOfToday) label = 'Today';
  else if (d >= startOfYesterday) label = 'Yesterday';
  else if (d >= startOfWeek) label = d.toLocaleDateString('en-US', { weekday: 'long' });
  else label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${label} at ${time}`;
}

const moodEmojis = { excellent: '😄', good: '😊', okay: '😐', bad: '☹️', terrible: '😡' };

// Render all cards
function renderLogs() {
  const body = document.getElementById('journalBody');
  const count = document.getElementById('entryCount');
  count.textContent = `${logs.length} ${logs.length === 1 ? 'Entry' : 'Entries'}`;

  if (logs.length === 0) {
    body.classList.remove('has-entries');
    journalWrap.classList.add('is-empty');
    body.innerHTML = `
      <div class="los-empty">
        <div class="los-empty__icon"><i class="fa-solid fa-pen-to-square"></i></div>
        <p>Nothing yet. Every great day begins with a reflection.</p>
      </div>`;
    updateFade();
    return;
  }

  journalWrap.classList.remove('is-empty');
  body.classList.add('has-entries');
  body.innerHTML = logs.map((log, i) => {
    const moodKey = log.mood ? log.mood.toLowerCase() : 'okay';
    const emoji = moodEmojis[moodKey] || '😐';
    const cardAnim = i < 5 ? `anim anim-d${i + 2}` : '';
    return `
      <div class="jentry ${cardAnim}">
        <div class="jentry__label-row">
          <p class="jentry__date">${formatDate(log.created_at)}</p>
          <span class="jentry__mood jentry__mood--${moodKey}">
            <span class="jentry__mood-emoji">${emoji}</span>
            <span class="jentry__mood-label">${log.mood || ''}</span>
          </span>
        </div>
        ${log.title ? `<p class="jentry__title">${log.title}</p>` : ''}
        <p class="jentry__content">${log.content || ''}</p>
        <div class="jentry__actions">
          <div class="jentry__actions-left">
            <button type="button" class="jentry__icon-btn jentry__icon-btn--view" onclick="openViewModal(${log.id})">
              <i class="fa-solid fa-eye"></i> View
            </button>
            <button type="button" class="jentry__icon-btn jentry__icon-btn--edit" onclick="openEditModal(${log.id})">
              <i class="fa-solid fa-pen"></i> Edit
            </button>
          </div>
          <button type="button" class="jentry__icon-btn jentry__icon-btn--delete" onclick="showDeleteConfirm(${log.id})">
            <i class="fa-solid fa-trash"></i> Delete
          </button>
        </div>
      </div>`;
  }).join('');
  updateFade();
}

// Scroll fade
const journalBody = document.getElementById('journalBody');
const journalWrap = document.getElementById('journalWrap');
function updateFade() {
  if (!journalBody || !journalWrap) return;
  const atTop = journalBody.scrollTop < 4;
  const atBottom = journalBody.scrollTop + journalBody.clientHeight >= journalBody.scrollHeight - 4;
  journalWrap.classList.toggle('fade-top', !atTop);
  journalWrap.classList.toggle('fade-bottom', !atBottom && journalBody.scrollHeight > journalBody.clientHeight);
}
journalBody.addEventListener('scroll', updateFade);

// Remove animation classes after animation ends so hover transitions work
journalBody.addEventListener('animationend', (e) => {
  if (e.target.classList.contains('jentry')) {
    e.target.classList.remove('anim', 'anim-d1', 'anim-d2', 'anim-d3', 'anim-d4', 'anim-d5', 'anim-d6', 'anim-d7');
  }
});

// New entry modal
function openEntryModal() {
  document.getElementById('newEntryModal').classList.add('open');
}
function closeEntryModal(e) {
  if (!e || e.target === document.getElementById('newEntryModal'))
    document.getElementById('newEntryModal').classList.remove('open');
}
function selectModalMood(el) {
  document.querySelectorAll('#newEntryForm .modal-mood__option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('modalMood').value = el.dataset.mood;
}
async function saveNewEntry(e) {
  e.preventDefault();
  const title = document.getElementById('modalTitle').value.trim();
  const content = document.getElementById('modalContent').value.trim();
  const mood = document.getElementById('modalMood').value;
  if (!content) return;

  try {
    const res = await fetch('/api/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ title, content, mood })
    });
    const text = await res.text();
    if (!res.ok) { alert('Save failed: ' + text); return; }
    const newLog = JSON.parse(text);
    logs.unshift(newLog);
    document.getElementById('newEntryForm').reset();
    document.querySelectorAll('#newEntryForm .modal-mood__option').forEach(o => o.classList.remove('selected'));
    document.getElementById('newEntryModal').classList.remove('open');
    renderLogs();
  } catch (err) {
    console.error('saveNewEntry error:', err);
    alert('Error saving entry: ' + err.message);
  }
}

// View modal
function openViewModal(id) {
  const log = logs.find(l => l.id === id);
  if (!log) return;
  document.getElementById('viewModalDate').textContent = new Date(log.created_at).toLocaleString();
  document.getElementById('viewModalTitle').textContent = log.title || '(No title)';
  document.getElementById('viewModalContent').textContent = log.content || '';

  const moodKey = log.mood ? log.mood.toLowerCase() : '';
  const emoji = moodEmojis[moodKey] || '';
  const badge = document.getElementById('viewModalMoodBadge');
  badge.innerHTML = moodKey && emoji
    ? `<span class="jentry__mood jentry__mood--${moodKey}"><span class="jentry__mood-emoji">${emoji}</span><span class="jentry__mood-label">${log.mood}</span></span>`
    : '';

  document.getElementById('viewToEditBtn').onclick = () => { closeViewModal(); openEditModal(id); };
  document.getElementById('viewEntryModal').classList.add('open');
}
function closeViewModal(e) {
  if (!e || e.target === document.getElementById('viewEntryModal'))
    document.getElementById('viewEntryModal').classList.remove('open');
}

// Edit modal
let editingId = null;
function openEditModal(id) {
  const log = logs.find(l => l.id === id);
  if (!log) return;
  editingId = id;
  document.getElementById('editModalDate').textContent = new Date(log.created_at).toLocaleString();
  document.getElementById('editModalTitle').value = log.title || '';
  document.getElementById('editModalContent').value = log.content || '';
  document.getElementById('editModalMood').value = log.mood || '';
  document.querySelectorAll('#editMoodPicker .modal-mood__option').forEach(o => {
    o.classList.toggle('selected', o.dataset.mood === log.mood);
  });
  document.getElementById('editEntryModal').classList.add('open');
}
function closeEditModal(e) {
  if (!e || e.target === document.getElementById('editEntryModal'))
    document.getElementById('editEntryModal').classList.remove('open');
}
function selectEditMood(el) {
  document.querySelectorAll('#editMoodPicker .modal-mood__option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected');
  document.getElementById('editModalMood').value = el.dataset.mood;
}
async function saveEditEntry(e) {
  e.preventDefault();
  const title = document.getElementById('editModalTitle').value.trim();
  const content = document.getElementById('editModalContent').value.trim();
  const mood = document.getElementById('editModalMood').value;

  const res = await fetch(`/api/journal/${editingId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, content, mood })
  });
  const updated = await res.json();
  logs = logs.map(l => l.id === editingId ? updated : l);

  document.getElementById('editEntryModal').classList.remove('open');
  renderLogs();
}

// Delete modal
let pendingDeleteId = null;
function showDeleteConfirm(id) {
  pendingDeleteId = id;
  document.getElementById('deleteModal').classList.add('active');
}
function hideDeleteModal() {
  pendingDeleteId = null;
  document.getElementById('deleteModal').classList.remove('active');
}
async function confirmDelete() {
  if (pendingDeleteId === null) return;
  await fetch(`/api/journal/${pendingDeleteId}`, { method: 'DELETE' });
  logs = logs.filter(l => l.id !== pendingDeleteId);
  hideDeleteModal();
  renderLogs();
}
document.getElementById('deleteModal').addEventListener('click', function (e) {
  if (e.target === this) hideDeleteModal();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeEntryModal(); closeViewModal(); closeEditModal(); hideDeleteModal(); }
});

// Load entries from DB on page load
async function loadEntries() {
  const res = await fetch('/api/journal');
  logs = await res.json();
  renderLogs();
}
loadEntries();
