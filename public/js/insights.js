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

function formatMinutes(mins) {
  if (mins === 0) return '0m';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

Chart.defaults.font.family = 'Inter, sans-serif';
Chart.defaults.color = '#94a3b8';

function makeLineChart(id, labels, data, color) {
  const canvas = document.getElementById(id);
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 180);
  gradient.addColorStop(0, color + '40');
  gradient.addColorStop(1, color + '00');

  return new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data,
        borderColor: color,
        borderWidth: 2.5,
        backgroundColor: gradient,
        fill: true,
        tension: 0.45,
        pointRadius: 4,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: color,
        pointBorderWidth: 2,
        pointHoverRadius: 6,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e293b',
          titleColor: '#94a3b8',
          bodyColor: '#f8fafc',
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
          callbacks: { label: ctx => ` ${ctx.parsed.y}` }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { font: { size: 11 }, maxRotation: 0 }
        },
        y: {
          grid: { color: '#ffffff40', drawBorder: false },
          border: { display: false },
          ticks: { font: { size: 11 }, stepSize: 1, precision: 0 },
          beginAtZero: true
        }
      }
    }
  });
}

function makeDoughnutChart(id, labels, data, colors) {
  return new Chart(document.getElementById(id), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderWidth: 0, hoverOffset: 0 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '72%',
      plugins: {
        legend: {
          display: true,
          position: 'right',
          labels: { font: { size: 12 }, boxWidth: 10, boxHeight: 10, padding: 16, usePointStyle: true, pointStyle: 'circle' }
        },
        tooltip: {
          backgroundColor: '#1e293b',
          titleColor: '#94a3b8',
          bodyColor: '#f8fafc',
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
          callbacks: { label: ctx => ` ${ctx.label}: ${ctx.parsed}` }
        }
      }
    }
  });
}

function makeBarChart(id, labels, data, colorTop, colorBottom) {
  const canvas = document.getElementById(id);
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, 160);
  gradient.addColorStop(0, colorTop);
  gradient.addColorStop(1, colorBottom);

  return new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: gradient,
        borderRadius: 6,
        borderSkipped: false,
        barPercentage: 0.55,
        categoryPercentage: 0.7,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1e293b',
          titleColor: '#94a3b8',
          bodyColor: '#f8fafc',
          padding: 10,
          cornerRadius: 8,
          displayColors: false,
          callbacks: { label: ctx => ` ${ctx.parsed.y} entr${ctx.parsed.y !== 1 ? 'ies' : 'y'}` }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          border: { display: false },
          ticks: { font: { size: 11 }, maxRotation: 0 }
        },
        y: {
          grid: { color: 'rgba(0,0,0,0.04)', drawBorder: false },
          border: { display: false },
          ticks: { font: { size: 11 }, stepSize: 1, precision: 0 },
          beginAtZero: true
        }
      }
    }
  });
}

function makeFocusBarChart(id, labels, data) {
  return makeBarChart(id, labels, data, '#6366f1', '#818cf8');
}

let journalBarChart = null;

async function loadJournalChart(range) {
  const res = await fetch(`/api/insights/journal-chart?range=${range}`, { credentials: 'same-origin' });
  const rows = await res.json();
  const canvas = document.getElementById('journalChart');
  const empty = document.getElementById('journalEmpty');

  if (journalBarChart) { journalBarChart.destroy(); journalBarChart = null; }

  if (!rows.length) {
    canvas.style.display = 'none';
    empty.style.display = 'flex';
    return;
  }

  canvas.style.display = '';
  empty.style.display = 'none';
  journalBarChart = makeBarChart('journalChart', rows.map(r => r.day), rows.map(r => r.count), '#3b82f6', '#60a5fa');
}

let focusBarChart = null;

async function loadFocusChart(range) {
  const res = await fetch(`/api/insights/focus-chart?range=${range}`, { credentials: 'same-origin' });
  const rows = await res.json();
  const canvas = document.getElementById('focusChart');
  const empty = document.getElementById('focusEmpty');

  if (focusBarChart) { focusBarChart.destroy(); focusBarChart = null; }

  if (!rows.length) {
    canvas.style.display = 'none';
    empty.style.display = 'flex';
    return;
  }

  canvas.style.display = '';
  empty.style.display = 'none';
  focusBarChart = makeFocusBarChart('focusChart', rows.map(r => r.day), rows.map(r => r.count));
}

async function loadInsights() {
  const res = await fetch('/api/insights', { credentials: 'same-origin' });
  const data = await res.json();
  const { journals, tasks, focus, tasksPriority } = data;

  // Journal
  document.getElementById('stat-total-logs').textContent = journals.total_logs;
  document.getElementById('detail-total-words').textContent = journals.total_words.toLocaleString();
  document.getElementById('detail-avg-words').textContent = journals.total_logs > 0
    ? Math.round(journals.total_words / journals.total_logs) : 0;
  document.getElementById('detail-logs-week').textContent = journals.logs_this_week;

  await loadJournalChart('week');

  document.getElementById('journalRangeGroup').querySelectorAll('.ins-range-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.getElementById('journalRangeGroup').querySelectorAll('.ins-range-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      await loadJournalChart(btn.dataset.range);
    });
  });

  // Tasks
  document.getElementById('stat-tasks-done').textContent = tasks.completed_tasks;
  document.getElementById('stat-tasks-sub').textContent = `Of ${tasks.total_tasks} completed`;
  document.getElementById('detail-total-tasks').textContent = tasks.total_tasks;
  document.getElementById('detail-tasks-pending').textContent = tasks.pending_tasks;
  const rate = tasks.total_tasks > 0
    ? Math.round((tasks.completed_tasks / tasks.total_tasks) * 100) : 0;
  document.getElementById('detail-completion-rate').textContent = `${rate}%`;
  document.getElementById('completion-bar').style.width = `${rate}%`;

  if (tasksPriority.length > 0) {
    const priorityColors = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' };
    const labels = tasksPriority.map(r => r.priority.charAt(0).toUpperCase() + r.priority.slice(1));
    const counts = tasksPriority.map(r => r.count);
    const colors = tasksPriority.map(r => priorityColors[r.priority] || '#94a3b8');
    makeDoughnutChart('tasksChart', labels, counts, colors);
  } else {
    document.getElementById('tasksChart').style.display = 'none';
    document.getElementById('tasksEmpty').style.display = 'flex';
  }

  // Focus
  document.getElementById('stat-focus-time').textContent = formatMinutes(focus.total_minutes);
  document.getElementById('detail-sessions').textContent = focus.total_sessions;
  document.getElementById('detail-sessions-week').textContent = focus.sessions_this_week;
  document.getElementById('detail-cycles').textContent = focus.full_cycles;

  await loadFocusChart('week');

  document.getElementById('focusRangeGroup').querySelectorAll('.ins-range-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      document.getElementById('focusRangeGroup').querySelectorAll('.ins-range-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      await loadFocusChart(btn.dataset.range);
    });
  });
}

loadInsights();
