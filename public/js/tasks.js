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

let tasks = [];
let activeFilter = 'all';
let activeSort = 'time-desc';

const priorityOrder = { high: 0, medium: 1, low: 2 };
const priorityLabels = { high: 'High', medium: 'Medium', low: 'Low' };

function getSorted(list) {
  return [...list].sort((a, b) => {
    if (activeSort === 'time-desc') return new Date(b.created_at) - new Date(a.created_at);
    if (activeSort === 'time-asc') return new Date(a.created_at) - new Date(b.created_at);
    if (activeSort === 'priority') return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function getFiltered() {
  if (activeFilter === 'completed') return tasks.filter(t => t.completed);
  if (activeFilter === 'all') return tasks.filter(t => !t.completed);
  return tasks.filter(t => (t.priority || 'medium') === activeFilter && !t.completed);
}

function renderTasks() {
  const list = document.getElementById('taskList');
  const empty = document.getElementById('tasksEmpty');
  const count = document.getElementById('js-count');

  list.innerHTML = '';

  const total = tasks.length;
  const done = tasks.filter(t => t.completed).length;
  count.textContent = total === 0 ? '0 tasks' : `${done}/${total} completed`;

  const visible = getSorted(getFiltered());

  if (visible.length === 0) {
    const emptyMessages = {
      all: 'No tasks yet. Every productive day begins with a task.',
      high: 'No high priority tasks.',
      medium: 'No medium priority tasks.',
      low: 'No low priority tasks.',
      completed: 'No completed tasks. Progress starts with just one.'
    };
    document.getElementById('tasksEmptyMsg').textContent = emptyMessages[activeFilter] || emptyMessages.all;
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

  visible.forEach(task => {
    const p = task.priority || 'medium';
    const wrapper = document.createElement('div');
    wrapper.className = 'task-swipe-wrapper';

    const leftLabel = task.completed ? 'Undo' : 'Complete';
    const leftIcon = task.completed ? 'fa-rotate-left' : 'fa-check';

    wrapper.innerHTML = `
      <div class="task-reveal task-reveal--left">
        <button class="task-reveal-btn ${task.completed ? 'undo-btn' : 'complete-btn'}" onclick="toggleTask(${task.id}, this.closest('.task-swipe-wrapper').querySelector('.task-checkbox'))">
          <i class="fa-solid ${leftIcon}"></i>${leftLabel}
        </button>
      </div>
      <div class="task-reveal task-reveal--right">
        <button class="task-reveal-btn edit-btn" onclick="editTask(${task.id})">
          <i class="fa-solid fa-pen"></i>Edit
        </button>
        <button class="task-reveal-btn delete-btn" onclick="deleteTask(${task.id})">
          <i class="fa-solid fa-trash"></i>Delete
        </button>
      </div>
      <div class="task-item${task.completed ? ' completed' : ''}">
        <div class="task-item__row">
          <span class="task-hint"><i class="fa-solid fa-chevron-left"></i></span>
          <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''} onchange="toggleTask(${task.id}, this)">
          <div class="task-body">
            <span class="task-label"></span>
          </div>
          <span class="task-priority task-priority--${p}" title="${priorityLabels[p]}">
            <span class="dot"></span>
          </span>
          <span class="task-hint"><i class="fa-solid fa-chevron-right"></i></span>
        </div>
        ${task.description ? `<p class="task-desc"></p>` : ''}
      </div>
    `;

    wrapper.querySelector('.task-label').textContent = task.text;
    if (task.description) wrapper.querySelector('.task-desc').textContent = task.description;

    addArrowListeners(wrapper.querySelector('.task-item'));
    list.appendChild(wrapper);
  });
}

function addArrowListeners(card) {
  const leftHint = card.querySelector('.task-hint:first-child');
  const rightHint = card.querySelector('.task-hint:last-child');

  if (leftHint) leftHint.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = card.classList.contains('revealed-left');
    card.classList.remove('revealed-left', 'revealed-right');
    if (!isOpen) card.classList.add('revealed-left');
  });

  if (rightHint) rightHint.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = card.classList.contains('revealed-right');
    card.classList.remove('revealed-left', 'revealed-right');
    if (!isOpen) card.classList.add('revealed-right');
  });

  // Click outside to close
  document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.task-swipe-wrapper')) {
      card.classList.remove('revealed-left', 'revealed-right');
    }
  });
}

async function toggleTask(id, el) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  const newCompleted = !task.completed;
  if (newCompleted) {
    const checkbox = el
      ? (el.classList.contains('task-checkbox') ? el : el.querySelector('.task-checkbox'))
      : null;
    if (checkbox) { checkbox.classList.add('completing'); checkbox.checked = true; }
  }
  task.completed = newCompleted;
  await fetch(`/api/tasks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ completed: newCompleted })
  });
  if (newCompleted) setTimeout(() => renderTasks(), 480);
  else renderTasks();
}

let editingId = null;
let deletingId = null;
let editPriority = 'medium';

function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

function editTask(id) {
  const task = tasks.find(t => t.id === id);
  if (!task) return;
  editingId = id;
  editPriority = task.priority || 'medium';
  document.getElementById('editInput').value = task.text;
  document.getElementById('editDesc').value = task.description || '';
  document.querySelectorAll('#editPriorityPicker .priority-pick-btn').forEach(btn =>
    btn.classList.toggle('selected', btn.dataset.pick === editPriority));
  openModal('editModal');
  setTimeout(() => document.getElementById('editInput').focus(), 50);
}

function setEditPriority(p) {
  editPriority = p;
  document.querySelectorAll('#editPriorityPicker .priority-pick-btn').forEach(btn =>
    btn.classList.toggle('selected', btn.dataset.pick === p));
}

async function saveEdit() {
  const text = document.getElementById('editInput').value.trim();
  if (!text) return;
  const description = document.getElementById('editDesc').value.trim();
  const res = await fetch(`/api/tasks/${editingId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ text, description, priority: editPriority })
  });
  const updated = await res.json();
  tasks = tasks.map(t => t.id === editingId ? updated : t);
  closeModal('editModal');
  renderTasks();
}

function deleteTask(id) {
  deletingId = id;
  const t = tasks.find(t => t.id === id);
  const p = t.priority || 'medium';
  const preview = document.getElementById('deletePreview');
  preview.innerHTML = `<span></span><span class="task-priority task-priority--${p}"><span class="dot"></span></span>`;
  preview.querySelector('span').textContent = t.text;
  openModal('deleteModal');
}

async function confirmDelete() {
  await fetch(`/api/tasks/${deletingId}`, { method: 'DELETE', credentials: 'same-origin' });
  tasks = tasks.filter(t => t.id !== deletingId);
  closeModal('deleteModal');
  renderTasks();
}

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal('addModal');
    closeModal('editModal');
    closeModal('deleteModal');
  }
  if (e.key === 'Enter' && document.getElementById('addModal').classList.contains('open')) submitAddModal();
  if (e.key === 'Enter' && document.getElementById('editModal').classList.contains('open')) saveEdit();
});

function setFilter(f) {
  activeFilter = f;
  document.querySelectorAll('[data-filter]').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.filter === f));
  renderTasks();
}

function setSort(s) {
  activeSort = s;
  document.querySelectorAll('[data-sort]').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.sort === s));
  renderTasks();
}

let selectedPriority = 'medium';

function pickPriority(p) {
  selectedPriority = p;
  document.querySelectorAll('#addPriorityPicker .priority-pick-btn').forEach(btn =>
    btn.classList.toggle('selected', btn.dataset.pick === p));
}

async function submitAddModal() {
  const text = document.getElementById('taskInput').value.trim();
  if (!text) return;
  const description = document.getElementById('descInput').value.trim();
  const res = await fetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'same-origin',
    body: JSON.stringify({ text, description, priority: selectedPriority })
  });
  const newTask = await res.json();
  tasks.unshift(newTask);
  document.getElementById('taskInput').value = '';
  document.getElementById('descInput').value = '';
  selectedPriority = 'medium';
  document.querySelectorAll('#addPriorityPicker .priority-pick-btn').forEach(btn =>
    btn.classList.toggle('selected', btn.dataset.pick === 'medium'));
  closeModal('addModal');
  renderTasks();
}

async function loadTasks() {
  const res = await fetch('/api/tasks', { credentials: 'same-origin' });
  tasks = await res.json();
  renderTasks();
}
loadTasks();
