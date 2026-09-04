const DEFAULT_TASK_COLOR = '#c7c0b3';
const IMPORTANCE_LABELS = { none: 'Без', low: 'Низкая', medium: 'Средняя', high: 'Высокая' };
const STORAGE_KEY = 'todo-app-v47'; // Версия обновлена
const TIMER_DEFAULT = 1800;

const AVAILABLE_ICONS = [
  'fa-circle-dot', 'fa-inbox', 'fa-sun', 'fa-moon', 'fa-star', 'fa-bookmark',
  'fa-calendar', 'fa-plane', 'fa-heart', 'fa-flag', 'fa-music', 'fa-envelope',
  'fa-bell', 'fa-clock', 'fa-comment', 'fa-thumbs-up', 'fa-trash-can', 'fa-pen-to-square',
  'fa-circle-check', 'fa-circle-question', 'fa-eye', 'fa-lightbulb', 'fa-hand', 'fa-key'
];

let state = {
  tasks: [],
  groups: [],
  tags: [],
  systemListsConfig: {
    all: { icon: 'fa-circle-dot', color: '#f5f1e8' },
    inbox: { icon: 'fa-inbox', color: '#fbbf24' },
    today: { icon: 'fa-sun', color: '#ff6b4a' },
    tomorrow: { icon: 'fa-moon', color: '#2dd4bf' },
    scheduled: { icon: 'fa-calendar-days', color: '#8b5cf6' },
    overdue: { icon: 'fa-circle-exclamation', color: '#fb7185' },
    done: { icon: 'fa-circle-check', color: '#4ade80' }
  },
  listVisibility: {
    all: true,
    inbox: true,
    today: true,
    tomorrow: true,
    scheduled: true,
    overdue: true,
    done: true
  },
  activeGroupId: 'today',
  dealOfDayId: null,
  filter: 'all',
  formImportance: 'none',
  formGroupId: '',
  formTags: [],
  formTimerDuration: 1800, // НОВОЕ
  formRepeat: null,        // НОВОЕ
  activeTimer: { taskId: null, remaining: TIMER_DEFAULT, total: TIMER_DEFAULT, running: false },
  doneExpanded: false,
  addingGroup: false,
  editingGroupId: null,
  addingTag: false,
  editingTagId: null,
  editingSystemListId: null,
  sidebarCollapsed: false,
  theme: 'dark',
  shareEmail: '',
  autoFormatDay: false
};

let timerInterval = null;
let selectedDate = new Date(); 
let calendar = { visible: false, view: 'days', date: new Date() };
let lastRenderedDay = null;   // день, для которого последний раз обновлялась панель списков
let lastPrefillDateVal = '';  // последнее значение, авто-подставленное в поле даты формы
let timelineNowInterval = null; // таймер линии текущего времени на таймлайне

let dragData = { id: null, isCopy: false };

let currentNoteTaskId = null;
let lastVisibleTasks = []; // задачи текущего выбора (для отправки на e-mail)

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function createTask(text, importance, groupId, tags, note, dueDate, repeat, timerDuration, endDate, startTime, endTime) {
  return {
    id: uid(),
    text: text.trim(),
    note: (note || '').trim(),
    dueDate: dueDate || null,
    endDate: endDate || null,
    startTime: startTime || null,
    endTime: endTime || null,
    importance,
    groupId: groupId || null,
    tags: tags || [],
    done: false,
    subtasks: [],
    createdAt: Date.now(),
    repeat: repeat || null,
    timerDuration: timerDuration || TIMER_DEFAULT
  };
}
function escapeHtml(s) { const div = document.createElement('div'); div.textContent = s; return div.innerHTML.replace(/"/g, '&quot;'); }
function formatTime(s) { const m = Math.floor(s / 60); const sec = s % 60; return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`; }
function addMinutes(hhmm, min) {
  const parts = hhmm.split(':').map(Number);
  const total = (parts[0] * 60 + parts[1] + min) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
// Строка таймлайна для любого времени: 14:20 -> "14:00", 14:45 -> "14:30"
function timeToRow(hhmm) {
  const parts = hhmm.split(':').map(Number);
  return `${String(parts[0]).padStart(2, '0')}:${parts[1] < 30 ? '00' : '30'}`;
}
// Плавный скролл наверх на requestAnimationFrame: задаёт абсолютную позицию каждый кадр.
// Важно: behavior:'instant' — иначе CSS scroll-behavior:smooth перехватывает покадровые
// scrollTo и анимации начинают конфликтовать (дрожание и залипание)
function smoothScrollToTop(duration = 450) {
  const start = window.scrollY;
  if (start < 2) return;
  const t0 = performance.now();
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const prevAnchor = document.documentElement.style.overflowAnchor;
  document.documentElement.style.overflowAnchor = 'none';
  (function frame(now) {
    const p = Math.min(1, (now - t0) / duration);
    window.scrollTo({ top: Math.round(start * (1 - easeOut(p))), behavior: 'instant' });
    if (p < 1) requestAnimationFrame(frame);
    else document.documentElement.style.overflowAnchor = prevAnchor;
  })(performance.now());
}
function formatRuDate(dateObj) {
  // Если передали null или undefined
  if (!dateObj) return 'Без даты';
  
  // Пытаемся получить дату. Если это уже объект Date, new Date() вернет копию.
  // Если это строка ISO, new Date() распарсит её.
  const d = new Date(dateObj);
  
  // Если дата невалидна
  if (isNaN(d.getTime())) return 'Без даты';
  
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}
function isSameDay(d1, d2) {
  if (!d1 || !d2) return false;
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}
// Дата в формате YYYY-MM-DD по локальному времени (toISOString даёт UTC и смещает день)
function toLocalISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
// Канонический формат хранения dueDate: локальная полночь
function localMidnightISO(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString(); }
function isTomorrow(date) {
  if (!date) return false;
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return isSameDay(date, tomorrow);
}
function getTomorrowDate() {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  return t;
}
function isOverdue(t) {
  if (!t.dueDate || t.done) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (t.repeat) {
    const nextDate = getNextRepeatDate(t);
    if (!nextDate) return false; // Повтор закончился
    return nextDate < today;
  }

  const checkDate = t.endDate ? new Date(t.endDate) : new Date(t.dueDate);
  return checkDate < today;
}
function getNextRepeatDate(task) {
  if (!task.repeat || !task.dueDate) return null;
  
  // Гарантируем, что работаем с объектом Date
  const current = new Date(task.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Проверка даты завершения повтора
  if (task.endDate) {
    const end = new Date(task.endDate);
    end.setHours(0, 0, 0, 0);
    if (current > end) return null; 
  }

  // Если дата задачи в будущем, просто возвращаем её
  if (current > today) return current;

  // Если дата задачи сегодня или в прошлом, ищем СЛЕДУЮЩИЙ день повтора
  if (task.repeat.type === 'daily') {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  } 
  if (task.repeat.type === 'monthly') {
    let nextDate = new Date(current);
    while (nextDate <= today) {
      nextDate.setMonth(nextDate.getMonth() + 1);
      if (task.endDate && nextDate > new Date(task.endDate)) return null;
    }
    return nextDate;
  } 
  if (task.repeat.type === 'weekly' && task.repeat.days?.length > 0) {
    let nextDate = new Date(today);
    nextDate.setDate(nextDate.getDate() + 1);
    
    for (let i = 0; i < 14; i++) {
      if (task.repeat.days.includes(nextDate.getDay())) {
        if (task.endDate && nextDate > new Date(task.endDate)) return null;
        return nextDate;
      }
      nextDate.setDate(nextDate.getDate() + 1);
    }
  }
  return null;
}

// Совпадает ли задача (с учётом повтора) с конкретным днём
function isTaskOnDay(t, day) {
  if (!t.dueDate || !day) return false;
  const due = new Date(t.dueDate); due.setHours(0, 0, 0, 0);
  const target = new Date(day); target.setHours(0, 0, 0, 0);
  if (target.getTime() < due.getTime()) return false;
  if (t.endDate) {
    const end = new Date(t.endDate); end.setHours(0, 0, 0, 0);
    if (target.getTime() > end.getTime()) return false;
  }
  if (!t.repeat) return target.getTime() === due.getTime();
  if (target.getTime() === due.getTime()) return true;
  if (t.repeat.type === 'daily') return true;
  if (t.repeat.type === 'weekly') return (t.repeat.days || []).includes(target.getDay());
  if (t.repeat.type === 'monthly') return target.getDate() === due.getDate();
  return false;
}

// Текущее наступление повторяющейся задачи: сегодня (если совпадает) или следующее
function getCurrentOccurrence(t) {
  const today = new Date();
  if (isTaskOnDay(t, today)) return today;
  return getNextRepeatDate(t);
}

function isTaskVisibleToday(task) {
  if (!task.repeat) return true;
  const nextDate = getNextRepeatDate(task);
  if (!nextDate) return true;
  const today = new Date();
  today.setHours(0,0,0,0);
  return nextDate.getTime() === today.getTime();
}
// ===== LOCALSTORAGE =====
// Снимок состояния — единый и для localStorage, и для отправки на сервер
function getStateSnapshot() {
  return {
    tasks: state.tasks,
    groups: state.groups,
    tags: state.tags,
    systemListsConfig: state.systemListsConfig,
    listVisibility: state.listVisibility,
    dealOfDayId: state.dealOfDayId,
    activeTimer: { ...state.activeTimer, running: false },
    sidebarCollapsed: state.sidebarCollapsed,
    doneExpanded: state.doneExpanded,
    theme: state.theme,
    shareEmail: state.shareEmail,
    autoFormatDay: state.autoFormatDay,
    seeded: true
  };
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getStateSnapshot()));
  } catch(e) { console.warn('Не удалось сохранить', e); }
  schedulePush();
}

function loadState() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      state.tasks = parsed.tasks || [];
      // Миграция: прежнее поле duration (минуты) пересчитываем в endTime (ЧЧ:ММ)
      state.tasks.forEach(t => {
        if (t.duration && t.startTime && !t.endTime) t.endTime = addMinutes(t.startTime, t.duration);
        delete t.duration;
      });
      state.groups = parsed.groups || [];
      state.tags = parsed.tags || [];
   if (parsed.systemListsConfig) {
  state.systemListsConfig = { ...state.systemListsConfig, ...parsed.systemListsConfig };
}
      state.listVisibility = parsed.listVisibility || state.listVisibility;
      state.dealOfDayId = parsed.dealOfDayId || null;
      if (parsed.activeTimer) state.activeTimer = parsed.activeTimer;
      state.sidebarCollapsed = parsed.sidebarCollapsed || false;
      state.doneExpanded = parsed.doneExpanded || false;
      state.theme = parsed.theme || 'dark';
      state.shareEmail = parsed.shareEmail || '';
      state.autoFormatDay = !!parsed.autoFormatDay;
      if (state.tasks.length === 0 && state.groups.length === 0 && !parsed.seeded) seedDemo();
    } else { seedDemo(); }
  } catch(e) { console.warn('Не удалось загрузить', e); seedDemo(); }
}

function seedDemo() {
  state.groups = [
    { id: 'g1', name: 'Работа', color: '#2dd4bf' },
    { id: 'g2', name: 'Личное', color: '#fbbf24' }
  ];
  state.tags = [
    { id: 't1', name: 'Срочно', color: '#fb7185' },
    { id: 't2', name: 'Дизайн', color: '#a3e635' },
    { id: 't3', name: 'Дом', color: '#2dd4bf' },
    { id: 't4', name: 'Код', color: '#fbbf24' }
  ];
  const todayISO = localMidnightISO(new Date());
  const tomorrowISO = localMidnightISO(getTomorrowDate());
  
  const t1 = createTask('Подготовить презентацию для клиента', 'high', 'g1', ['t1', 't2'], 'Согласовать структуру с руководителем проекта до начала работы.', todayISO, null, TIMER_DEFAULT, null);
  t1.subtasks = [
    { id: uid(), text: 'Собрать материалы', done: true },
    { id: uid(), text: 'Сделать дизайн слайдов', done: false },
    { id: uid(), text: 'Отправить на ревью', done: false }
  ];
  const t2 = createTask('Прочитать главу из книги', 'none', 'g2', ['t3'], '', null); 
  const t3 = createTask('Тренировка в зале', 'medium', 'g2', [], 'Не забыть взять полотенце и воду.', todayISO);
  t3.startTime = '18:00'; t3.endTime = '19:30';
  const t4 = createTask('Купить продукты на неделю', 'low', null, [], '', tomorrowISO); 
  const t5 = createTask('Позвонить в страховую', 'medium', null, [], '', null); 
  t5.done = true;
  state.tasks = [t1, t2, t3, t4, t5];
  state.dealOfDayId = t1.id;
}

// ===== ТОСТЫ =====
function toast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icon = type === 'success' ? 'fa-circle-check' : type === 'danger' ? 'fa-circle-exclamation' : 'fa-circle-info';
  el.innerHTML = `<i class="fa-regular ${icon}"></i><span>${escapeHtml(message)}</span>`;
  container.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 300); }, 2800);
}

// ===== ДАТА И КАЛЕНДАРЬ =====
function updateDate() {
  const today = new Date();
  const months = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'];
  const weekdays = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];

  document.getElementById('dateLabel').textContent = 'Сегодня';
  document.getElementById('dateDay').textContent = String(today.getDate()).padStart(2, '0');
  document.getElementById('dateMonth').textContent = months[today.getMonth()];
  document.getElementById('dateWeekday').textContent = weekdays[today.getDay()];
  
  // Перерисовываем панель списков только при смене суток и не во время редактирования,
  // чтобы ежеминутный таймер не сбивал ввод в поля названия списка
  const dayKey = today.toDateString();
  if (dayKey !== lastRenderedDay) {
    lastRenderedDay = dayKey;
    if (!state.addingGroup && state.editingGroupId === null) renderGroupsBar();
  }
}

function renderCalendar() {
  const pop = document.getElementById('calendarPopover');
  if (!calendar.visible) { pop.style.display = 'none'; return; }
  pop.style.display = 'block';

  const year = calendar.date.getFullYear();
  const month = calendar.date.getMonth();
  const monthsArr = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

  let html = `<div class="cal-header">`;
  if (calendar.view === 'days') {
    html += `
      <button class="cal-nav-btn" data-cal-action="prev-month"><i class="fa-solid fa-chevron-left"></i></button>
      <button class="cal-title" data-cal-action="toggle-view">${monthsArr[month]} ${year}</button>
      <button class="cal-nav-btn" data-cal-action="next-month"><i class="fa-solid fa-chevron-right"></i></button>
    </div>
    <div class="cal-grid">
      <div class="cal-day-name">Пн</div><div class="cal-day-name">Вт</div><div class="cal-day-name">Ср</div>
      <div class="cal-day-name">Чт</div><div class="cal-day-name">Пт</div><div class="cal-day-name">Сб</div><div class="cal-day-name">Вс</div>
    `;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    let startDayOfWeek = firstDay.getDay();
    if (startDayOfWeek === 0) startDayOfWeek = 7;
    startDayOfWeek--;

    const prevMonthLastDay = new Date(year, month, 0).getDate();

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      html += `<div class="cal-day outside">${prevMonthLastDay - i}</div>`;
    }

    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

    for (let d = 1; d <= lastDay.getDate(); d++) {
      let classes = 'cal-day';
      if (isCurrentMonth && d === today.getDate()) classes += ' today';
      if (selectedDate && selectedDate.getFullYear() === year && selectedDate.getMonth() === month && selectedDate.getDate() === d) classes += ' selected';
      html += `<div class="${classes}" data-cal-action="select-day" data-day="${d}">${d}</div>`;
    }

    let nextDayCount = 1;
    let currentCount = startDayOfWeek + lastDay.getDate();
    while (currentCount % 7 !== 0) {
      html += `<div class="cal-day outside">${nextDayCount}</div>`;
      nextDayCount++;
      currentCount++;
    }

    html += `</div>`;
    html += `<button class="cal-today-btn" data-cal-action="today">Сегодня</button>`;
    // Кнопка "Входящие" удалена из календаря

  } else {
    html += `
      <button class="cal-nav-btn" data-cal-action="prev-year"><i class="fa-solid fa-chevron-left"></i></button>
      <button class="cal-title" data-cal-action="toggle-view">${year}</button>
      <button class="cal-nav-btn" data-cal-action="next-year"><i class="fa-solid fa-chevron-right"></i></button>
    </div>
    <div class="cal-grid cal-months-grid">
    `;
    const today = new Date();
    for (let m = 0; m < 12; m++) {
      let classes = 'cal-month';
      if (today.getFullYear() === year && today.getMonth() === m) classes += ' current';
      if (selectedDate && selectedDate.getFullYear() === year && selectedDate.getMonth() === m) classes += ' selected';
      html += `<div class="${classes}" data-cal-action="select-month" data-month="${m}">${monthsArr[m]}</div>`;
    }
    html += `</div>`;
  }

  pop.innerHTML = html;
}

// ===== ТАЙМЛАЙН (ПОЧАСОВОЕ РАСПИСАНИЕ) =====
function getTimelineDate() { return selectedDate ? new Date(selectedDate) : new Date(); }

function renderTimeline() {
  const d = getTimelineDate();
  const months = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
  const weekdays = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];
  document.getElementById('timelineSubtitle').textContent = `${d.getDate()} ${months[d.getMonth()]} · ${weekdays[d.getDay()]}`;

  // Дела выбранного дня: со временем — по своим получасовым строкам, без времени — блоком сверху
  const dayTasks = state.tasks.filter(t => !t.done && isTaskOnDay(t, d));
  const dealFirst = (arr) => [...arr].sort((a, b) => (b.id === state.dealOfDayId) - (a.id === state.dealOfDayId));
  const chipHTML = (t, timed) => `<div class="timeline-chip ${timed ? 'timed' : ''}" draggable="true" data-id="${t.id}" style="--task-color: ${getTaskColor(t)}">${timed ? `<span class="chip-time"><i class="fa-regular fa-clock"></i>${t.startTime}${t.endTime ? '–' + t.endTime : ''}</span>` : ''}${escapeHtml(t.text)}${t.id === state.dealOfDayId ? '<i class="fa-regular fa-star chip-deal"></i>' : ''}</div>`;
  const timedByRow = {};
  dayTasks.filter(t => t.startTime).forEach(t => {
    const row = timeToRow(t.startTime);
    (timedByRow[row] = timedByRow[row] || []).push(t);
  });
  const untimedTasks = dealFirst(dayTasks.filter(t => !t.startTime));
  const chips = untimedTasks.map(t => chipHTML(t, false)).join('');

  const today = new Date();
  const isToday = isSameDay(d, today);
  const nowHalf = today.getMinutes() >= 30;

  // Цифровое время текущего момента — в шапке под датой (только для сегодняшнего дня)
  const clock = document.getElementById('timelineNowClock');
  if (clock) {
    if (isToday) {
      clock.textContent = String(today.getHours()).padStart(2, '0') + ':' + String(today.getMinutes()).padStart(2, '0');
      clock.style.display = 'inline-flex';
    } else {
      clock.style.display = 'none';
    }
  }

  let hours = '';
  for (let h = 0; h < 24; h++) {
    [0, 30].forEach(m => {
      const timeStr = `${String(h).padStart(2, '0')}:${m === 0 ? '00' : '30'}`;
      const cur = isToday && h === today.getHours() && (m === 30) === nowHalf;
      const inRow = dealFirst(timedByRow[timeStr] || []);
      hours += `<div class="timeline-hour ${cur ? 'current' : ''} ${m === 30 ? 'half' : ''}" data-time="${timeStr}">
        <div class="timeline-hour-time">${timeStr}</div>
        <div class="timeline-hour-body">${inRow.map(t => chipHTML(t, true)).join('')}</div>
      </div>`;
    });
  }
  document.getElementById('timelineHours').innerHTML = `
    ${untimedTasks.length > 0 ? `<div class="timeline-untimed"><div class="timeline-untimed-label">Дела этого дня · без времени</div>${chips}</div>` : ''}
    ${hours}
    ${isToday ? `<div class="timeline-now-line" id="timelineNowLine"></div>` : ''}`;

  // Прокручиваем к текущему получасу и выставляем линию «сейчас»
  if (isToday) {
    const el = document.querySelector('.timeline-hour.current');
    const cont = document.getElementById('timelineHours');
    if (el && cont) setTimeout(() => { cont.scrollTop = el.offsetTop - cont.clientHeight / 2; }, 60);
    updateTimelineNowLine();
  }
}

// Линия текущего времени: позиция считается по минутам внутри получасовых строк
function updateTimelineNowLine() {
  const line = document.getElementById('timelineNowLine');
  const clock = document.getElementById('timelineNowClock');
  const now = new Date();
  const hhmm = String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
  if (clock) clock.textContent = hhmm;
  if (!line) return;
  const totalMin = now.getHours() * 60 + now.getMinutes();
  const rows = document.querySelectorAll('.timeline-hours .timeline-hour');
  const row = rows[Math.floor(totalMin / 30)];
  if (!row) return;
  const frac = (totalMin % 30) / 30;
  line.style.top = (row.offsetTop + row.offsetHeight * frac) + 'px';
}

function openTimeline() {
  renderTimeline();
  document.getElementById('timelinePanel').classList.add('open');
  document.body.classList.add('timeline-open');
  if (!timelineNowInterval) timelineNowInterval = setInterval(updateTimelineNowLine, 30000);
}
function closeTimeline() {
  document.getElementById('timelinePanel').classList.remove('open');
  document.body.classList.remove('timeline-open');
  if (timelineNowInterval) { clearInterval(timelineNowInterval); timelineNowInterval = null; }
}

// ===== ПРОГРЕСС ДНЯ =====
function updateProgress() {
  // Процент — по задачам текущего дня (тот же состав, что и список «Сегодня»).
  // Выполненная задача считается целиком (незакрытые подзадачи не занижают процент),
  // у невыполненной учитываются её подзадачи.
  const today = new Date();
  let total = 0, done = 0;
  state.tasks.forEach(t => {
    if (!isTaskOnDay(t, today)) return;
    total += 1;
    if (t.done) { done += 1; return; }
    t.subtasks.forEach(s => { total += 1; if (s.done) done += 1; });
  });
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);
  const circle = document.getElementById('progressCircle');
  const num = document.getElementById('progressNum');
  const circumference = 2 * Math.PI * 42;
  circle.style.strokeDasharray = circumference;
  circle.style.strokeDashoffset = circumference - (percent / 100) * circumference;
  num.textContent = percent + '%';
  if (percent === 100 && total > 0) circle.style.stroke = 'var(--success)';
  else if (percent >= 50) circle.style.stroke = 'var(--accent-2)';
  else circle.style.stroke = 'var(--accent)';
}

function updateCounts() {
  let tasks = state.tasks;
  const today = new Date();
  const tomorrow = getTomorrowDate();
  
   if (state.activeGroupId === 'done') {
    tasks = tasks.filter(t => t.done);
  } else if (state.activeGroupId === 'inbox') {
    tasks = tasks.filter(t => !t.dueDate);
} else if (state.activeGroupId === 'today') {
  tasks = tasks.filter(t => isTaskOnDay(t, today));

} else if (state.activeGroupId === 'tomorrow') {
  tasks = tasks.filter(t => isTaskOnDay(t, tomorrow));

  } else if (state.activeGroupId === 'scheduled') {
    tasks = tasks.filter(t => {
      if (t.done) return false; // Исключаем выполненные
      if (!t.dueDate) return false;
      
      const nextDate = t.repeat ? getNextRepeatDate(t) : new Date(t.dueDate);
      if (!nextDate) return false;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      return nextDate.getTime() > today.getTime();
    });
  } else if (state.activeGroupId === 'overdue') {
    tasks = tasks.filter(t => isOverdue(t));
  } else if (state.activeGroupId === 'date') {
    tasks = tasks.filter(t => isTaskOnDay(t, selectedDate));
  } else if (state.activeGroupId !== 'all') {
    tasks = tasks.filter(t => t.groupId === state.activeGroupId);
    if (selectedDate) {
      tasks = tasks.filter(t => isTaskOnDay(t, selectedDate));
    }
  }
  
  const all = tasks.length;
  const done = tasks.filter(t => t.done).length;
  const active = all - done;
  document.getElementById('cntAll').textContent = all;
  document.getElementById('cntActive').textContent = active;
  document.getElementById('cntDone').textContent = done;
  document.getElementById('taskCount').textContent = `(${all})`;
}

// ===== ПРОГРЕСС КОНКРЕТНОЙ ЗАДАЧИ =====
function getTaskProgress(t) {
  if (t.subtasks.length > 0) {
    const done = t.subtasks.filter(s => s.done).length;
    return Math.round((done / t.subtasks.length) * 100);
  }
  return t.done ? 100 : 0;
}

function renderProgress(t) {
  const pct = getTaskProgress(t);
  if (t.subtasks.length === 0 && !t.done && t.id !== state.dealOfDayId) return '';
  return `
    <div class="task-progress">
      <div class="task-progress-track">
        <div class="task-progress-fill" style="width: ${pct}%"></div>
      </div>
      <span class="task-progress-pct">${pct}%</span>
    </div>`;
}

// ===== РЕНДЕР =====
function renderGroupSelect() {
  const select = document.getElementById('taskGroupSelect');
  let html = `<option value="">Без списка</option>`;
  state.groups.forEach(g => {
    html += `<option value="${g.id}">${escapeHtml(g.name)}</option>`;
  });
  select.innerHTML = html;
  select.value = state.formGroupId || "";
}

function getTaskColor(t) {
  const group = state.groups.find(g => g.id === t.groupId);
  return group ? group.color : DEFAULT_TASK_COLOR;
}

function renderTagsPicker(selectedTags = []) {
  if (state.tags.length === 0) return '<span style="font-size: 11px; color: var(--muted);">Нет тегов</span>';
  return state.tags.map(t => `
    <button type="button" class="tag-picker-btn ${selectedTags.includes(t.id) ? 'active' : ''}" 
            style="--tag-color: ${t.color}" 
            data-tag-id="${t.id}">
      ${escapeHtml(t.name)}
    </button>
  `).join('');
}

function updateTagPickerSelections(pickerEl, selectedTags) {
  if (!pickerEl) return;
  
  const currentTagIds = Array.from(pickerEl.querySelectorAll('.tag-picker-btn')).map(b => b.dataset.tagId);
  const stateTagIds = state.tags.map(t => t.id);
  
  const needsRebuild = currentTagIds.length !== stateTagIds.length || !currentTagIds.every((id, i) => id === stateTagIds[i]);
  
  if (needsRebuild) {
    pickerEl.innerHTML = renderTagsPicker(selectedTags);
    return;
  }
  
  pickerEl.querySelectorAll('.tag-picker-btn').forEach(btn => {
    const tagId = btn.dataset.tagId;
    btn.classList.toggle('active', selectedTags.includes(tagId));
  });
}

function renderFormTagPicker() {
  updateTagPickerSelections(document.getElementById('formTagPicker'), state.formTags);
}

function prefillDateInput() {
  const dateInput = document.getElementById('taskDueDateInput');
  if (!dateInput) return;
  
  let val = '';
  if (state.activeGroupId === 'today' || (state.activeGroupId === 'date' && isSameDay(selectedDate, new Date()))) {
    val = toLocalISODate(new Date());
  } else if (state.activeGroupId === 'tomorrow' || (state.activeGroupId === 'date' && isTomorrow(selectedDate))) {
    val = toLocalISODate(getTomorrowDate());
  } else if (state.activeGroupId === 'date' && selectedDate) {
    val = toLocalISODate(selectedDate);
  }
  // Не затираем дату, введённую пользователем вручную
  if (!dateInput.value || dateInput.value === lastPrefillDateVal) dateInput.value = val;
  lastPrefillDateVal = val;
}

function renderGroupsBar() {
  const bar = document.getElementById('groupsBar');
  const cfg = state.systemListsConfig;
  const vis = state.listVisibility;
  
  const today = new Date();
  const tomorrow = getTomorrowDate();
  
  const allCount = state.tasks.filter(t => !t.done).length;
  const inboxCount = state.tasks.filter(t => !t.dueDate && !t.done).length;
const todayCount = state.tasks.filter(t => !t.done && isTaskOnDay(t, today)).length;
const tomorrowCount = state.tasks.filter(t => !t.done && isTaskOnDay(t, tomorrow)).length;
    const scheduledCount = state.tasks.filter(t => {
    if (t.done) return false;
    if (!t.dueDate) return false;
    
    const nextDate = t.repeat ? getNextRepeatDate(t) : new Date(t.dueDate);
    if (!nextDate) return false;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return nextDate.getTime() > today.getTime();
  }).length;
  const overdueCount = state.tasks.filter(t => isOverdue(t)).length;
  const doneCount = state.tasks.filter(t => t.done).length;
  
  let html = '';
  
  if (vis.all) {
    html += `
      <div class="group-item system-group ${state.activeGroupId === 'all' ? 'active' : ''}" data-group-id="all">
        <span class="group-icon" data-action="edit-system-icon" data-list-id="all" style="color: ${cfg.all.color}"><i class="fa-regular ${cfg.all.icon}"></i></span>
        <button class="group-select-btn" data-action="select-group" data-id="all">
          <span class="group-name">Все дела</span>
        </button>
        <div class="group-right-controls">
          ${allCount > 0 ? `<span class="group-count">${allCount}</span>` : ''}
        </div>
      </div>
    `;
  }
  if (vis.inbox) {
    html += `
      <div class="group-item system-group ${state.activeGroupId === 'inbox' ? 'active' : ''}" data-group-id="inbox">
        <span class="group-icon" data-action="edit-system-icon" data-list-id="inbox" style="color: ${cfg.inbox.color}"><i class="fa-regular ${cfg.inbox.icon}"></i></span>
        <button class="group-select-btn" data-action="select-group" data-id="inbox">
          <span class="group-name">Входящие</span>
        </button>
        <div class="group-right-controls">
          ${inboxCount > 0 ? `<span class="group-count">${inboxCount}</span>` : ''}
        </div>
      </div>
    `;
  }
  if (vis.today) {
    html += `
      <div class="group-item system-group ${state.activeGroupId === 'today' ? 'active' : ''}" data-group-id="today">
        <span class="group-icon" data-action="edit-system-icon" data-list-id="today" style="color: ${cfg.today.color}"><i class="fa-regular ${cfg.today.icon}"></i></span>
        <button class="group-select-btn" data-action="select-group" data-id="today">
          <span class="group-name">Сегодня</span>
        </button>
        <div class="group-right-controls">
          ${todayCount > 0 ? `<span class="group-count">${todayCount}</span>` : ''}
        </div>
      </div>
    `;
  }
  if (vis.tomorrow) {
    html += `
      <div class="group-item system-group ${state.activeGroupId === 'tomorrow' ? 'active' : ''}" data-group-id="tomorrow">
        <span class="group-icon" data-action="edit-system-icon" data-list-id="tomorrow" style="color: ${cfg.tomorrow.color}"><i class="fa-regular ${cfg.tomorrow.icon}"></i></span>
        <button class="group-select-btn" data-action="select-group" data-id="tomorrow">
          <span class="group-name">Завтра</span>
        </button>
        <div class="group-right-controls">
          ${tomorrowCount > 0 ? `<span class="group-count">${tomorrowCount}</span>` : ''}
        </div>
      </div>
    `;
  }
  if (vis.scheduled) {
    html += `
      <div class="group-item system-group ${state.activeGroupId === 'scheduled' ? 'active' : ''}" data-group-id="scheduled">
        <span class="group-icon" data-action="edit-system-icon" data-list-id="scheduled" style="color: ${cfg.scheduled.color}"><i class="fa-regular ${cfg.scheduled.icon}"></i></span>
        <button class="group-select-btn" data-action="select-group" data-id="scheduled">
          <span class="group-name">Запланировано</span>
        </button>
        <div class="group-right-controls">
          ${scheduledCount > 0 ? `<span class="group-count">${scheduledCount}</span>` : ''}
        </div>
      </div>
    `;
  }

  if (vis.overdue) {
    html += `
      <div class="group-item system-group overdue-group ${state.activeGroupId === 'overdue' ? 'active' : ''}" data-group-id="overdue">
        <span class="group-dot" style="background: var(--danger)"></span>
        <button class="group-select-btn" data-action="select-group" data-id="overdue">
          <span class="group-name">Просрочено</span>
        </button>
        <div class="group-right-controls">
          ${overdueCount > 0 ? `<span class="group-count overdue-count">${overdueCount}</span>` : ''}
        </div>
      </div>
    `;
  }
  if (vis.done) {
    html += `
      <div class="group-item system-group ${state.activeGroupId === 'done' ? 'active' : ''}" data-group-id="done">
        <span class="group-icon" data-action="edit-system-icon" data-list-id="done" style="color: ${cfg.done.color}"><i class="fa-regular ${cfg.done.icon}"></i></span>
        <button class="group-select-btn" data-action="select-group" data-id="done">
          <span class="group-name">Выполнено</span>
        </button>
        <div class="group-right-controls">
          ${doneCount > 0 ? `<span class="group-count">${doneCount}</span>` : ''}
        </div>
      </div>
    `;
  }

  html += `
    <div class="groups-subheader">Пользовательские списки</div>
    <div class="group-divider"></div>
  `;
  
  state.groups.forEach(g => {
    const groupCount = state.tasks.filter(t => t.groupId === g.id && !t.done).length;
    const groupOverdueCount = state.tasks.filter(t => t.groupId === g.id && isOverdue(t)).length;
    
    if (state.editingGroupId === g.id) {
      html += `
        <div class="group-item" data-group-id="${g.id}" style="grid-template-columns: 1fr;">
          <div class="edit-group-wrap" style="width: 100%; margin: 0;">
            <input type="text" class="add-group-input" id="editGroupName-${g.id}" value="${escapeHtml(g.name)}" maxlength="24">
            <div class="palette-wrap">
              <input type="color" id="editGroupColor-${g.id}" value="${g.color}" class="color-picker">
              <span class="palette-label">Цвет списка</span>
            </div>
            <div class="edit-group-actions">
              <button class="mini-btn mini-btn-save" data-action="save-edit-group" data-id="${g.id}">Сохранить</button>
              <button class="mini-btn mini-btn-cancel" data-action="cancel-edit-group">Отмена</button>
            </div>
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="group-item ${state.activeGroupId === g.id ? 'active' : ''}" data-group-id="${g.id}">
          <span class="group-dot" style="background:${g.color}"></span>
          <button class="group-select-btn" data-action="select-group" data-id="${g.id}">
            <span class="group-name">${escapeHtml(g.name)}</span>
          </button>
          <div class="group-right-controls">
            <div class="group-controls">
              <button class="group-control-btn" data-action="edit-group" data-id="${g.id}" title="Настроить"><i class="fa-regular fa-pen-to-square"></i></button>
              <button class="group-control-btn delete" data-action="delete-group" data-id="${g.id}" title="Удалить"><i class="fa-regular fa-trash-can"></i></button>
            </div>
            ${groupOverdueCount > 0 ? `<span class="group-count overdue-count">${groupOverdueCount}</span>` : (groupCount > 0 ? `<span class="group-count">${groupCount}</span>` : '')}
          </div>
        </div>
      `;
    }
  });
  
  if (state.addingGroup) {
    html += `
      <div class="add-group-input-wrap">
        <input type="text" class="add-group-input" id="newGroupName" placeholder="Название списка..." maxlength="24" autofocus>
        <div class="palette-wrap">
          <input type="color" id="newGroupColor" value="#2dd4bf" class="color-picker">
          <span class="palette-label">Цвет списка</span>
        </div>
        <div class="edit-group-actions">
          <button class="mini-btn mini-btn-save" data-action="save-new-group">Создать</button>
          <button class="mini-btn mini-btn-cancel" data-action="cancel-new-group">Отмена</button>
        </div>
      </div>
    `;
  } else {
    html += `<button class="add-list-btn" data-action="add-group-ui"><i class="fa-regular fa-plus"></i> Новый список</button>`;
  }
  bar.innerHTML = html;
}

function renderTagsBar() {
  const bar = document.getElementById('tagsBar');
  let html = '';
  state.tags.forEach(t => {
    if (state.editingTagId === t.id) {
      html += `
        <div class="tag-item" data-tag-id="${t.id}">
          <div class="edit-group-wrap" style="width: 100%; margin: 0;">
            <input type="text" class="add-group-input" id="editTagName-${t.id}" value="${escapeHtml(t.name)}" maxlength="8">
            <div class="palette-wrap">
              <input type="color" id="editTagColor-${t.id}" value="${t.color}" class="color-picker">
              <span class="palette-label">Цвет тега</span>
            </div>
            <div class="edit-group-actions">
              <button class="mini-btn mini-btn-save" data-action="save-edit-tag" data-id="${t.id}">Сохранить</button>
              <button class="mini-btn mini-btn-cancel" data-action="cancel-edit-tag">Отмена</button>
            </div>
          </div>
        </div>
      `;
    } else {
      html += `
        <div class="tag-item" data-tag-id="${t.id}">
          <span class="tag-pill" style="--tag-color: ${t.color}">${escapeHtml(t.name)}</span>
          <div class="tag-controls">
            <button class="tag-control-btn" data-action="edit-tag" data-id="${t.id}" title="Редактировать"><i class="fa-regular fa-pen-to-square"></i></button>
            <button class="tag-control-btn delete" data-action="delete-tag" data-id="${t.id}" title="Удалить"><i class="fa-regular fa-trash-can"></i></button>
          </div>
        </div>
      `;
    }
  });
  
  if (state.addingTag) {
    html += `
      <div class="add-group-input-wrap" style="margin-top: 8px;">
        <input type="text" class="add-group-input" id="newTagName" placeholder="Название тега..." maxlength="8" autofocus>
        <div class="palette-wrap">
          <input type="color" id="newTagColor" value="#2dd4bf" class="color-picker">
          <span class="palette-label">Цвет тега</span>
        </div>
        <div class="edit-group-actions">
          <button class="mini-btn mini-btn-save" data-action="save-new-tag">Создать</button>
          <button class="mini-btn mini-btn-cancel" data-action="cancel-new-tag">Отмена</button>
        </div>
      </div>
    `;
  } else {
    html += `<button class="add-list-btn" style="margin-top: 8px;" data-action="add-tag-ui"><i class="fa-regular fa-plus"></i> Новый тег</button>`;
  }
  bar.innerHTML = html;
}

function renderFocusTimer(t) {
  const isActive = state.activeTimer.taskId === t.id;
  if (!isActive) return '';
  const { remaining, total, running } = state.activeTimer;
  const pct = total > 0 ? ((total - remaining) / total) * 100 : 0;
  return `
    <div class="focus-timer ${running ? '' : 'paused'}" data-timer-task="${t.id}">
      <div class="timer-top">
        <span class="timer-badge"><i class="fa-regular fa-circle-dot"></i> ${running ? 'В фокусе' : 'Пауза'}</span>
        <div class="timer-display">${formatTime(remaining)}</div>
      </div>
      <div class="timer-bar"><div class="timer-bar-fill" style="width: ${pct}%"></div></div>
      <div class="timer-controls">
        <button class="timer-btn primary" data-action="toggle-pause">
          <i class="fa-regular ${running ? 'fa-circle-pause' : 'fa-circle-play'}"></i> ${running ? 'Пауза' : 'Продолжить'}
        </button>
        <button class="timer-btn" data-action="add-time"><i class="fa-regular fa-circle-plus"></i> 5 мин</button>
        <button class="timer-btn danger" data-action="stop-timer"><i class="fa-regular fa-circle-stop"></i> Стоп</button>
      </div>
    </div>`;
}

function subtaskHTML(s, taskId, color) {
  return `
    <div class="subtask ${s.done ? 'done' : ''}" data-sub-id="${s.id}">
      <button class="subtask-check ${s.done ? 'done' : ''}" data-action="toggle-subtask" data-task="${taskId}" data-sub="${s.id}">
        <i class="fa-regular ${s.done ? 'fa-square-check' : 'fa-square'}"></i>
      </button>
      <div class="subtask-text" data-action="edit-subtask" data-task="${taskId}" data-sub="${s.id}" title="Клик для редактирования">${escapeHtml(s.text)}</div>
      <div class="subtask-actions">
        <button class="subtask-action-btn" data-action="edit-subtask" data-task="${taskId}" data-sub="${s.id}" title="Редактировать"><i class="fa-regular fa-pen-to-square"></i></button>
        <button class="subtask-action-btn delete" data-action="delete-subtask" data-task="${taskId}" data-sub="${s.id}" title="Удалить"><i class="fa-regular fa-trash-can"></i></button>
      </div>
    </div>`;
}

// Автоформатирование дня: дело дня выводится первым (это уже делает renderTasks),
// далее повторяющиеся дела, затем остальные по приоритету; без приоритета — в конце
const IMP_ORDER = { high: 0, medium: 1, low: 2 };
function autoFormatTasks(arr) {
  return [...arr].sort((a, b) => {
    const aRep = a.repeat ? 0 : 1, bRep = b.repeat ? 0 : 1;
    if (aRep !== bRep) return aRep - bRep;
    return (IMP_ORDER[a.importance] ?? 3) - (IMP_ORDER[b.importance] ?? 3);
  });
}

function renderTasks() {
  const list = document.getElementById('tasksList');
  const titleEl = document.getElementById('tasksTitleText');
  
  let tasks = state.tasks;
  const today = new Date();
  const tomorrow = getTomorrowDate();
  
  if (state.activeGroupId === 'all') {
    titleEl.textContent = 'Все дела';
  } else if (state.activeGroupId === 'inbox') {
    titleEl.textContent = 'Входящие';
    tasks = tasks.filter(t => !t.dueDate);
  } else if (state.activeGroupId === 'today') {
    titleEl.textContent = 'Сегодня';
    tasks = tasks.filter(t => isTaskOnDay(t, today));
  } else if (state.activeGroupId === 'tomorrow') {
    titleEl.textContent = 'Завтра';
    tasks = tasks.filter(t => isTaskOnDay(t, tomorrow));
  } else if (state.activeGroupId === 'scheduled') {
    titleEl.textContent = 'Запланировано';
    tasks = tasks.filter(t => {
      if (t.done) return false; // Исключаем выполненные
      if (!t.dueDate) return false;
      
      const nextDate = t.repeat ? getNextRepeatDate(t) : new Date(t.dueDate);
      if (!nextDate) return false;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      return nextDate.getTime() > today.getTime();
    });
  } else if (state.activeGroupId === 'overdue') {
    titleEl.textContent = 'Просрочено';
    tasks = tasks.filter(t => isOverdue(t));
  } else if (state.activeGroupId === 'done') {
    titleEl.textContent = 'Выполнено';
    tasks = tasks.filter(t => t.done);
  } else if (state.activeGroupId === 'date') {
    const months = ['Января', 'Февраля', 'Марта', 'Апреля', 'Мая', 'Июня', 'Июля', 'Августа', 'Сентября', 'Октября', 'Ноября', 'Декабря'];
    const weekdays = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    titleEl.textContent = `${selectedDate.getDate()} ${months[selectedDate.getMonth()]}, ${weekdays[selectedDate.getDay()]}`;
    tasks = tasks.filter(t => isTaskOnDay(t, selectedDate));
  } else {
    const group = state.groups.find(g => g.id === state.activeGroupId);
    titleEl.textContent = group ? group.name : 'Список дел';
    tasks = tasks.filter(t => t.groupId === state.activeGroupId);
    if (selectedDate) {
      tasks = tasks.filter(t => isTaskOnDay(t, selectedDate));
    }
  }

  // Запоминаем выборку — её увидит пользователь и её же отправим на e-mail
  lastVisibleTasks = tasks;

  // Но для списка "Запланировано" мы НЕ фильтруем по "сегодня", так как там нужны будущие даты  //if (state.activeGroupId !== 'all' && state.activeGroupId !== 'overdue' && state.activeGroupId !== 'done' && state.activeGroupId !== 'scheduled') {
  //  tasks = tasks.filter(t => isTaskVisibleToday(t));
  //}

  let html = '';
  if (state.activeGroupId === 'scheduled') {
    if (tasks.length === 0) {
      html += `<div class="empty-state"><i class="fa-regular fa-calendar-days"></i><p>Нет запланированных дел на будущее</p></div>`;
    } else {
      const grouped = {};
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      tasks.forEach(t => {
        const rawDate = t.repeat ? getNextRepeatDate(t) : new Date(t.dueDate);
        if (!rawDate) return;
        
        const dateObj = new Date(rawDate);
        if (dateObj.getTime() <= today.getTime()) return;
        
        const dateStr = formatRuDate(dateObj);
        if (!grouped[dateStr]) grouped[dateStr] = { date: dateObj, tasks: [], dateStr };
        grouped[dateStr].tasks.push(t);
      });

      Object.values(grouped).sort((a, b) => a.date.getTime() - b.date.getTime()).forEach(group => {
        // ВАЖНО: проверяем, что group.dateStr существует
        const dividerText = group.dateStr || 'Без даты';
        html += `<div class="scheduled-date-divider">${dividerText}</div>`;
        html += group.tasks.map(t => taskHTML(t)).join('');
      });
    }
  } else if (state.activeGroupId === 'done') {
    if (tasks.length === 0) {
      html += `<div class="empty-state"><i class="fa-regular fa-clipboard"></i><p>Нет выполненных дел</p></div>`;
    } else {
      // Группировка по датам
      const grouped = {};
      tasks.forEach(t => {
        const dateStr = t.dueDate ? new Date(t.dueDate).toLocaleDateString('ru-RU') : 'Без даты';
        if (!grouped[dateStr]) grouped[dateStr] = [];
        grouped[dateStr].push(t);
      });

      Object.keys(grouped).sort((a, b) => {
        if (a === 'Без даты') return 1;
        if (b === 'Без даты') return -1;
        return new Date(a.split('.').reverse().join('-')) - new Date(b.split('.').reverse().join('-'));
      }).forEach(dateStr => {
        html += `<div class="done-date-divider">${dateStr}</div>`;
        html += grouped[dateStr].map(t => taskHTML(t)).join('');
      });
    }
  } else {
    const dealTask = tasks.find(t => t.id === state.dealOfDayId && !t.done);
    let activeTasks = tasks.filter(t => !t.done && t.id !== state.dealOfDayId);
    if (state.autoFormatDay) activeTasks = autoFormatTasks(activeTasks);
    let doneTasks = tasks.filter(t => t.done);

    if (state.filter === 'active') {
      if (dealTask) {
        html += taskHTML(dealTask);
        if (activeTasks.length > 0) html += `<div class="tasks-divider">Остальные дела</div>`;
      }
      html += activeTasks.map(t => taskHTML(t)).join('');
      if (activeTasks.length === 0 && !dealTask) {
        html += `<div class="empty-state"><i class="fa-regular fa-clipboard"></i><p>Все дела сделаны — отличная работа!</p></div>`;
      }
    } else if (state.filter === 'done') {
      if (doneTasks.length === 0) {
        html += `<div class="empty-state"><i class="fa-regular fa-clipboard"></i><p>Нет выполненных дел</p></div>`;
      } else {
        html += doneTasks.map(t => taskHTML(t)).join('');
      }
    } else {
      if (dealTask) {
        html += taskHTML(dealTask);
        if (activeTasks.length > 0) html += `<div class="tasks-divider">Остальные дела</div>`;
      }
      html += activeTasks.map(t => taskHTML(t)).join('');
      if (activeTasks.length === 0 && !dealTask) {
        if (doneTasks.length === 0) {
          html += `<div class="empty-state"><i class="fa-regular fa-clipboard"></i><p>Список пуст. Добавьте первое дело выше.</p></div>`;
        } else {
          html += `<div class="empty-state"><i class="fa-regular fa-clipboard"></i><p>Все дела сделаны — отличная работа!</p></div>`;
        }
      }

      if (doneTasks.length > 0) {
        html += `
          <div class="done-section">
            <button class="done-header ${state.doneExpanded ? 'expanded' : ''}" data-action="toggle-done-list">
              <span class="chevron"></span>
              Выполнено (${doneTasks.length})
            </button>
            ${state.doneExpanded ? `<div class="done-list">${doneTasks.map(t => taskHTML(t)).join('')}</div>` : ''}
          </div>`;
      }
    }
  }

  list.innerHTML = html;
}

function taskHTML(t) {
  const isDeal = t.id === state.dealOfDayId;
  const isActiveTimer = state.activeTimer.taskId === t.id;
  const taskColor = getTaskColor(t);
  const subtasksHTML = t.subtasks.length > 0 ? `<div class="subtasks">${t.subtasks.map(s => subtaskHTML(s, t.id, taskColor)).join('')}</div>` : '';
  const subcountHTML = t.subtasks.length > 0 ? `<span class="task-subcount"><i class="fa-regular fa-list-alt"></i> ${t.subtasks.filter(s => s.done).length}/${t.subtasks.length}</span>` : '';
  const group = state.groups.find(g => g.id === t.groupId);
  
  const noteBtnHTML = t.note ? `<button class="icon-btn" data-action="view-note" data-id="${t.id}" title="Заметка"><i class="fa-regular fa-note-sticky"></i></button>` : '';

  const tagsHTML = t.tags && t.tags.length > 0 ? `<div class="task-tags-group">${t.tags.slice(0, 3).map(tid => {
  const tag = state.tags.find(t => t.id === tid);
  return tag ? `<span class="task-tag" style="--tag-color: ${tag.color}">${escapeHtml(tag.name)}</span>` : '';
  }).join('')}</div>` : '';

  let dueDateBadgeHTML = '';
  if (t.dueDate) {
    const due = t.repeat ? getCurrentOccurrence(t) : new Date(t.dueDate);
    if (due) {
      const today = new Date();
      const tomorrow = getTomorrowDate();
      let dueText = '';
      let isOverdueBadge = false;
      
      if (isSameDay(due, today)) dueText = 'Сегодня';
      else if (isSameDay(due, tomorrow)) dueText = 'Завтра';
      else {
        // ИСПОЛЬЗУЕМ НАШУ НОВУЮ ФУНКЦИЮ
        dueText = formatRuDate(due);
        const checkDate = t.endDate ? new Date(t.endDate) : due;
        if (checkDate < today && !t.done) isOverdueBadge = true;
      }
      
      dueDateBadgeHTML = `<span class="task-due-date-badge ${isOverdueBadge ? 'overdue' : ''}"><i class="fa-regular fa-calendar"></i> ${dueText}</span>`;
    }
  }
  const repeatBadgeHTML = t.repeat ? `<span class="task-repeat-badge"><i class="fa-solid fa-arrows-rotate"></i></span>` : '';
  const timeBadgeHTML = t.startTime ? `<span class="task-time-badge"><i class="fa-regular fa-clock"></i> ${t.startTime}${t.endTime ? '–' + t.endTime : ''}</span>` : '';

  return `
    <div class="task ${t.done ? 'done' : ''} ${isDeal ? 'is-deal' : ''} ${isActiveTimer ? 'is-focusing' : ''}" 
         data-id="${t.id}" style="--task-color: ${taskColor}" draggable="true">
      <div class="task-main">
        <button class="task-check ${t.done ? 'done' : ''}" data-action="toggle-done" data-id="${t.id}">
          <i class="fa-regular ${t.done ? 'fa-square-check' : 'fa-square'}"></i>
        </button>
        <div class="task-body">
          <div class="task-text" data-action="edit-task" data-id="${t.id}" title="Клик для редактирования">${escapeHtml(t.text)}</div>
            <div class="task-meta">
            ${dueDateBadgeHTML}
            ${timeBadgeHTML}
            ${repeatBadgeHTML}
            ${group ? `<span class="task-group-badge"><i class="fa-regular fa-folder"></i>${escapeHtml(group.name)}</span>` : ''}
            ${subcountHTML}
            <span class="task-importance ${t.importance}"><div class="bars"><span></span><span></span><span></span></div>${IMPORTANCE_LABELS[t.importance]}</span>
            ${tagsHTML}
            ${isDeal ? '<span class="task-deal-badge"><i class="fa-regular fa-star"></i>Дело дня</span>' : ''}
            ${isActiveTimer ? `<span class="task-deal-badge" style="border-color: var(--accent-2); color: var(--accent-2);"><i class="fa-regular fa-clock"></i><span class="task-timer-time">${formatTime(state.activeTimer.remaining)}</span></span>` : ''}
          </div>
        </div>
        <div class="task-actions">
          ${noteBtnHTML}
          <button class="icon-btn" data-action="edit-task" data-id="${t.id}" title="Редактировать"><i class="fa-regular fa-pen-to-square"></i></button>
          <button class="icon-btn ${isActiveTimer ? 'active' : ''}" data-action="${isActiveTimer ? 'stop-timer' : 'start-timer'}" data-id="${t.id}" title="${isActiveTimer ? 'Остановить таймер' : 'Фокус-таймер'}"><i class="fa-regular ${isActiveTimer ? 'fa-circle-stop' : 'fa-circle-play'}"></i></button>
          <button class="icon-btn ${isDeal ? 'active' : ''}" data-action="set-deal" data-id="${t.id}" title="${isDeal ? 'Снять дело дня' : 'Сделать делом дня'}"><i class="fa-regular fa-star"></i></button>
          <button class="icon-btn" data-action="show-add-subtask" data-id="${t.id}" title="Добавить подзадачу"><i class="fa-regular fa-square-plus"></i></button>
          <button class="icon-btn danger" data-action="delete-task" data-id="${t.id}" title="Удалить"><i class="fa-regular fa-trash-can"></i></button>
        </div>
      </div>
      ${subtasksHTML}
      ${renderProgress(t)}
      ${renderFocusTimer(t)}
    </div>`;
}

function render() {
  renderGroupsBar();
  renderTagsBar();
  renderFormTagPicker();
  renderGroupSelect();
  prefillDateInput();
  renderTasks();
  updateProgress();
  updateCounts();
  updateFloatingTimer();
  if (document.getElementById('timelinePanel').classList.contains('open')) renderTimeline();
  saveState();
}

// ===== УПРАВЛЕНИЕ ПАНЕЛЬЮ =====
function applySidebarState() {
  const isCollapsed = state.sidebarCollapsed;
  document.body.classList.toggle('sidebar-collapsed', isCollapsed);
  
  const formCard = document.getElementById('formCard');
  const listsCard = document.getElementById('listsCard');
  const tagsCard = document.getElementById('tagsCard');
  const tasksCard = document.getElementById('tasksCard');
  const leftCol = document.querySelector('.left-col');
  const rightCol = document.querySelector('.right-col');

  if (isCollapsed) {
    if (formCard.parentElement !== rightCol) {
      rightCol.insertBefore(formCard, tasksCard);
    }
  } else {
    if (formCard.parentElement !== leftCol) {
      leftCol.insertBefore(formCard, listsCard);
    }
  }

  const btn = document.getElementById('toggleSidebarBtn');
  if (btn) {
    const icon = btn.querySelector('i');
    const text = btn.querySelector('span');
    if (isCollapsed) {
      icon.className = 'fa-solid fa-chevron-right';
      text.textContent = 'Развернуть';
    } else {
      icon.className = 'fa-solid fa-chevron-left';
      text.textContent = 'Свернуть панель';
    }
  }
  saveState();
}

// ===== НАСТРОЙКИ И ТЕМА =====
function applyTheme() {
  document.body.setAttribute('data-theme', state.theme);
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.themeVal === state.theme);
  });
  saveState();
}

function openSettings() {
  renderVisibilityList();
  updateSyncUI();
  const af = document.getElementById('autoFormatCheck');
  if (af) af.checked = !!state.autoFormatDay;
  document.getElementById('settingsModal').style.display = 'flex';
}

function renderVisibilityList() {
  const listEl = document.getElementById('visibilityList');
  const cfg = state.systemListsConfig;
  const vis = state.listVisibility;
  const names = {
    all: 'Все дела',
    inbox: 'Входящие',
    today: 'Сегодня',
    tomorrow: 'Завтра',
    scheduled: 'Запланировано',
    overdue: 'Просрочено',
    done: 'Выполнено'
  };

  let html = '';
  Object.keys(names).forEach(key => {
    // Добавлена проверка cfg[key]
    if (cfg[key]) {
      html += `
        <div class="visibility-item">
          <span><i class="fa-regular ${cfg[key].icon}" style="color: ${cfg[key].color}"></i><em>${names[key]}</em></span>
          <div class="visibility-toggle ${vis[key] ? 'active' : ''}" data-action="toggle-visibility" data-list="${key}"></div>
        </div>
      `;
    }
  });
  listEl.innerHTML = html;
}

function closeSettings() { document.getElementById('settingsModal').style.display = 'none'; }

// ===== ОТПРАВКА СПИСКА НА E-MAIL =====
// Логотип для письма — абсолютный URL (в письме относительные пути не работают)
const EMAIL_LOGO_URL = 'http://104.171.138.209/logo-todocity-email.png';
const IMP_COLOR = { high: '#fb7185', medium: '#fbbf24', low: '#4ade80' };
const IMP_MARK = { high: '▲', medium: '●', low: '▽' };
let shareHtmlCache = '';

function buildShareText() {
  const title = document.getElementById('tasksTitleText').textContent;
  const tasks = lastVisibleTasks;
  const dateStr = toLocalISODate(new Date()).split('-').reverse().join('.');
  const taskLines = (t, out) => {
    const bits = [];
    if (t.startTime) bits.push(t.startTime + (t.endTime ? '–' + t.endTime : ''));
    if (t.importance && t.importance !== 'none') bits.push(IMP_MARK[t.importance] + ' ' + IMPORTANCE_LABELS[t.importance].toLowerCase());
    const g = state.groups.find(x => x.id === t.groupId);
    if (g) bits.push(g.name);
    const isDeal = t.id === state.dealOfDayId;
    out.push(`${isDeal ? '★ ' : ''}${t.done ? '✓ ' : ''}${t.text}${bits.length ? `  (${bits.join(', ')})` : ''}`);
    t.subtasks.forEach(sub => out.push(`     ${sub.done ? '✓' : '○'} ${sub.text}`));
  };
  const lines = ['✦ TODOCITY — ' + title, '   ' + dateStr, '──────────────────────────────'];
  const active = tasks.filter(t => !t.done && t.id !== state.dealOfDayId);
  const done = tasks.filter(t => t.done);
  const deal = tasks.find(t => t.id === state.dealOfDayId && !t.done);
  if (deal) { lines.push('ДЕЛО ДНЯ'); taskLines(deal, lines); lines.push(''); }
  if (active.length) {
    lines.push(`АКТИВНЫЕ (${active.length}):`);
    active.forEach(t => taskLines(t, lines));
    lines.push('');
  }
  if (done.length) {
    lines.push(`ВЫПОЛНЕНО (${done.length}):`);
    done.forEach(t => taskLines(t, lines));
    lines.push('');
  }
  if (!tasks.length) lines.push('Дел нет — всё сделано! ✦');
  lines.push('──────────────────────────────', 'Отправлено из TODOCITY');
  return lines.join('\n');
}

// Карточка задачи для HTML-письма (все стили инлайн — требование почтовых клиентов)
function shareCardHtml(t, numbering) {
  const isDeal = t.id === state.dealOfDayId;
  const g = state.groups.find(x => x.id === t.groupId);
  const bits = [];
  if (t.startTime) bits.push(`<span style="color:#2dd4bf;font-weight:bold;">${t.startTime}${t.endTime ? '–' + t.endTime : ''}</span>`);
  if (t.importance && t.importance !== 'none') bits.push(`<span style="color:${IMP_COLOR[t.importance]};">${IMP_MARK[t.importance]} ${IMPORTANCE_LABELS[t.importance].toLowerCase()}</span>`);
  if (g) bits.push(`<span style="color:#6f7872;">${escapeHtml(g.name)}</span>`);
  const meta = bits.length ? `<span style="font-size:12px;"> &nbsp;·&nbsp; ${bits.join(' &nbsp;·&nbsp; ')}</span>` : '';
  const subs = t.subtasks.map(s => `
      <div style="margin:4px 0 0 26px;font-size:13px;color:${s.done ? '#6f7872' : '#c7c0b3'};">
        <span style="color:${s.done ? '#4ade80' : '#6f7872'};">${s.done ? '✔' : '○'}</span>&nbsp; ${s.done ? `<s>${escapeHtml(s.text)}</s>` : escapeHtml(s.text)}
      </div>`).join('');
  return `
    <div style="margin:0 0 8px 0;padding:11px 14px;background:${isDeal ? '#241710' : '#191e1c'};border-radius:10px;${isDeal ? 'border-left:3px solid #ff6b4a;' : ''}">
      <div style="font-size:15px;line-height:1.45;color:${t.done ? '#6f7872' : '#f5f1e8'};${t.done ? 'text-decoration:line-through;' : ''}">
        ${isDeal ? '<span style="color:#ff6b4a;">★ </span>' : ''}${numbering ? '' : ''}${escapeHtml(t.text)}${meta}
      </div>${subs}
    </div>`;
}

// Красивое HTML-письмо в стилистике приложения (логотип, фирменные цвета)
function buildShareHtml() {
  const title = document.getElementById('tasksTitleText').textContent;
  const tasks = lastVisibleTasks;
  const dateStr = toLocalISODate(new Date()).split('-').reverse().join('.');
  const active = tasks.filter(t => !t.done);
  const done = tasks.filter(t => t.done);
  const stats = tasks.length
    ? `<span style="color:#4ade80;font-weight:bold;">${done.length}</span><span style="color:#6f7872;"> / ${tasks.length} выполнено</span>`
    : '';
  const activeHtml = active.length
    ? `<div style="margin:22px 0 10px;font-size:11px;letter-spacing:2px;color:#6f7872;font-weight:bold;">АКТИВНЫЕ · ${active.length}</div>` +
      active.map(t => shareCardHtml(t, true)).join('')
    : '';
  const doneHtml = done.length
    ? `<div style="margin:22px 0 10px;font-size:11px;letter-spacing:2px;color:#6f7872;font-weight:bold;">ВЫПОЛНЕНО · ${done.length}</div>` +
      done.map(t => shareCardHtml(t, false)).join('')
    : '';
  const emptyHtml = tasks.length ? '' :
    `<div style="padding:36px 0;text-align:center;color:#c7c0b3;font-size:15px;">Дел нет — всё сделано! ✦</div>`;
  const inner = `
  <div style="background:#0a0e0c;padding:28px 12px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#131816;border:1px solid #232a27;border-radius:16px;overflow:hidden;">
      <div style="padding:26px 28px 18px;background:#0a0e0c;">
        <img src="${EMAIL_LOGO_URL}" width="246" alt="TODOCITY" style="display:block;border:0;">
        <div style="margin-top:14px;padding-top:14px;border-top:1px solid #232a27;font-size:13px;color:#c7c0b3;">
          <span style="color:#ff6b4a;font-weight:bold;">${escapeHtml(title)}</span> &nbsp;·&nbsp; ${dateStr} &nbsp;·&nbsp; ${stats}
        </div>
      </div>
      <div style="padding:6px 20px 8px;">
        ${emptyHtml}${activeHtml}${doneHtml}
      </div>
      <div style="padding:16px 28px;background:#0a0e0c;border-top:1px solid #232a27;font-size:11px;color:#6f7872;">
        Отправлено из TODOCITY — планировщика дел · <a href="http://104.171.138.209" style="color:#ff6b4a;text-decoration:none;">todocity</a>
      </div>
    </div>
  </div>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title></head><body style="margin:0;padding:0;">${inner}</body></html>`;
}

function openShareModal() {
  document.getElementById('shareSubjectInput').value = `TODOCITY: ${document.getElementById('tasksTitleText').textContent}`;
  document.getElementById('shareBodyInput').value = buildShareText();
  shareHtmlCache = buildShareHtml();
  const prev = document.getElementById('sharePreview');
  if (prev) prev.innerHTML = shareHtmlCache.replace(/^<!DOCTYPE html>.*?<body[^>]*>/is, '').replace(/<\/body>.*$/is, '');
  document.getElementById('shareEmailInput').value = state.shareEmail || '';
  document.getElementById('shareModal').style.display = 'flex';
  setTimeout(() => document.getElementById('shareEmailInput')?.focus(), 50);
}
function closeShareModal() {
  document.getElementById('shareModal').style.display = 'none';
}
// Копирование красивой HTML-версии — для вставки в Gmail/Outlook (Ctrl+V)
async function copyShareHtml() {
  if (!shareHtmlCache) shareHtmlCache = buildShareHtml();
  const text = document.getElementById('shareBodyInput').value;
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([shareHtmlCache], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' })
      })]);
      toast('Красивое письмо скопировано — вставьте в письмо (Ctrl+V)', 'success');
      return;
    }
  } catch (e) { /* ниже — запасной способ */ }
  // Запасной способ: временный редактируемый блок с содержимым письма
  const tmp = document.createElement('div');
  tmp.contentEditable = 'true';
  tmp.style.cssText = 'position:fixed;left:-9999px;top:0;width:560px;';
  tmp.innerHTML = shareHtmlCache;
  document.body.appendChild(tmp);
  const range = document.createRange();
  range.selectNodeContents(tmp);
  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
  const ok = document.execCommand('copy');
  sel.removeAllRanges();
  tmp.remove();
  toast(ok ? 'Красивое письмо скопировано — вставьте в письмо (Ctrl+V)' : 'Не удалось скопировать', ok ? 'success' : 'danger');
}
function sendShare() {
  const email = document.getElementById('shareEmailInput').value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    toast('Укажите корректный e-mail', 'danger');
    document.getElementById('shareEmailInput').focus();
    return;
  }
  state.shareEmail = email;
  const subject = document.getElementById('shareSubjectInput').value.trim() || 'TODOCITY';
  const body = document.getElementById('shareBodyInput').value;
  window.location.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  closeShareModal();
  toast('Открываю почтовый клиент…', 'info');
}

// ===== ЗАМЕТКИ =====
function showNoteModal(taskId) {
  const t = state.tasks.find(x => x.id === taskId);
  if (!t) return;
  
  currentNoteTaskId = taskId;
  
  document.getElementById('noteModalTitle').textContent = t.text;
  renderNoteModalContent();
  document.getElementById('noteModal').style.display = 'flex';
}

function renderNoteModalContent() {
  const t = state.tasks.find(x => x.id === currentNoteTaskId);
  if (!t) return;
  
  const contentEl = document.getElementById('noteModalContent');
  
  // Сразу открываем в режиме редактирования
  contentEl.innerHTML = `<textarea class="note-edit-textarea" id="noteEditInput" placeholder="Введите текст заметки...">${escapeHtml(t.note || '')}</textarea>`;
  setTimeout(() => {
    const input = document.getElementById('noteEditInput');
    if (input) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }, 50);
}

function saveEditNote() {
  const input = document.getElementById('noteEditInput');
  if (!input) return;
  
  const t = state.tasks.find(x => x.id === currentNoteTaskId);
  if (!t) return;
  
  t.note = input.value.trim();
  render(); // Обновляем список задач, чтобы обновилась иконка заметки
  closeNoteModal();
  toast('Заметка сохранена', 'success');
}

function cancelEditNote() {
  closeNoteModal();
}

function closeNoteModal() { 
  document.getElementById('noteModal').style.display = 'none'; 
  currentNoteTaskId = null;
}

// ===== КАСТОМИЗАЦИЯ ИКОНОК =====
function showIconModal(listId) {
  state.editingSystemListId = listId;
  const cfg = state.systemListsConfig[listId];
  const modal = document.getElementById('iconModal');
  document.getElementById('iconColorPicker').value = cfg.color;
  
  const grid = document.getElementById('iconPickerGrid');
  grid.innerHTML = AVAILABLE_ICONS.map(icon => `
    <div class="icon-option ${icon === cfg.icon ? 'active' : ''}" data-icon="${icon}">
      <i class="fa-regular ${icon}"></i>
    </div>
  `).join('');
  
  modal.style.display = 'flex';
}
function closeIconModal() {
  document.getElementById('iconModal').style.display = 'none';
  state.editingSystemListId = null;
}

// ===== ГРУППЫ И ТЕГИ =====
function addGroup(name, color) {
  const id = uid();
  state.groups.push({ id, name: name.trim(), color });
  state.activeGroupId = id;
  state.addingGroup = false;
  render();
  toast('Список создан', 'success');
}

function deleteGroup(id) {
  state.groups = state.groups.filter(g => g.id !== id);
  state.tasks.forEach(t => { if (t.groupId === id) t.groupId = null; });
  if (state.activeGroupId === id) state.activeGroupId = 'all';
  if (state.formGroupId === id) state.formGroupId = '';
  render();
  toast('Список удален', 'info');
}

function saveEditGroup(id) {
  const g = state.groups.find(x => x.id === id); if (!g) return;
  const input = document.getElementById(`editGroupName-${id}`);
  const colorInput = document.getElementById(`editGroupColor-${id}`);
  
  if (input && input.value.trim()) {
    g.name = input.value.trim();
    if (colorInput) g.color = colorInput.value;
    toast('Список обновлен', 'success');
  }
  state.editingGroupId = null;
  render();
}

function addTag(name, color) {
  const id = uid();
  state.tags.push({ id, name: name.trim(), color });
  state.addingTag = false;
  render();
  toast('Тег создан', 'success');
}

function deleteTag(id) {
  state.tags = state.tags.filter(t => t.id !== id);
  state.tasks.forEach(t => {
    if (t.tags) {
      t.tags = t.tags.filter(tid => tid !== id);
    }
  });
  state.formTags = state.formTags.filter(tid => tid !== id);
  render();
  toast('Тег удален', 'info');
}

function saveEditTag(id) {
  const tag = state.tags.find(x => x.id === id);
  if (!tag) return;
  const input = document.getElementById(`editTagName-${id}`);
  const colorInput = document.getElementById(`editTagColor-${id}`);

  if (input && input.value.trim()) {
    tag.name = input.value.trim();
    if (colorInput) tag.color = colorInput.value;
    toast('Тег обновлен', 'success');
  }
  state.editingTagId = null;
  render();
}

// ===== DRAG AND DROP ЛОГИКА =====
function getDragAfterElement(container, y) {
  const draggableElements = [...container.querySelectorAll('.task:not(.dragging)')];
  
  return draggableElements.reduce((closest, child) => {
    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }
  }, { offset: Number.NEGATIVE_INFINITY }).element;
}

function applyTaskDragOverStyles(targetTaskEl, clientY) {
  document.querySelectorAll('.task.drag-over-top, .task.drag-over-bottom').forEach(el => {
    el.classList.remove('drag-over-top', 'drag-over-bottom');
  });

  if (!targetTaskEl) return;
  const rect = targetTaskEl.getBoundingClientRect();
  const middleY = rect.top + rect.height / 2;

  if (clientY < middleY) {
    targetTaskEl.classList.add('drag-over-top');
  } else {
    targetTaskEl.classList.add('drag-over-bottom');
  }
}

function moveTaskToGroup(taskId, targetGroupId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;

  const today = new Date();
  const tomorrow = getTomorrowDate();

  if (targetGroupId === 'all' || targetGroupId === 'overdue' || targetGroupId === 'scheduled') return; // Запрет перемещения в виртуальные списки

  if (targetGroupId === 'done') {
    // Перенос в «Выполнено» завершает задачу
    if (!task.done) {
      task.done = true;
      if (state.activeTimer.taskId === taskId) stopTimer();
      render();
      toast('Задача выполнена', 'success');
    }
    return;
  }

  if (targetGroupId === 'inbox') {
    task.dueDate = null;
    task.groupId = null;
  } else if (targetGroupId === 'today') {
    task.dueDate = localMidnightISO(today);
    task.groupId = task.groupId || null; 
  } else if (targetGroupId === 'tomorrow') {
    task.dueDate = localMidnightISO(tomorrow);
    task.groupId = task.groupId || null;
  } else {
    task.groupId = targetGroupId;
  }

  render();
  toast(`Задача перемещена`, 'success');
}
function reorderTasks(draggedId, targetId, insertBefore) {
  const draggedIndex = state.tasks.findIndex(t => t.id === draggedId);
  const targetIndex = state.tasks.findIndex(t => t.id === targetId);
  
  if (draggedIndex === -1 || targetIndex === -1) return;

  const [draggedTask] = state.tasks.splice(draggedIndex, 1);
  
  const newTargetIndex = state.tasks.findIndex(t => t.id === targetId);
  
  if (insertBefore) {
    state.tasks.splice(newTargetIndex, 0, draggedTask);
  } else {
    state.tasks.splice(newTargetIndex + 1, 0, draggedTask);
  }
  
  render();
}

// ===== ТАЙМЕР ЛОГИКА =====
function startTimer(taskId) {
  if (state.activeTimer.taskId === taskId && state.activeTimer.running) return;
  
  const task = state.tasks.find(t => t.id === taskId);
  const duration = task?.timerDuration || TIMER_DEFAULT;
  
  if (state.activeTimer.taskId !== taskId) {
    state.activeTimer = { taskId, remaining: duration, total: duration, running: true };
  } else {
    state.activeTimer.running = true;
  }
  startTimerInterval();
  render();
  toast(`Фокус запущен: ${Math.round(duration / 60)} минут`, 'success');
}

function togglePause() {
  if (!state.activeTimer.taskId) return;
  state.activeTimer.running = !state.activeTimer.running;
  if (state.activeTimer.running) startTimerInterval();
  else stopTimerInterval();
  render();
}

function stopTimer() {
  if (!state.activeTimer.taskId) return;
  const wasRunning = state.activeTimer.running;
  stopTimerInterval();
  state.activeTimer = { taskId: null, remaining: TIMER_DEFAULT, total: TIMER_DEFAULT, running: false };
  render();
  if (wasRunning) toast('Таймер остановлен', 'info');
}

function addTime(secs = 300) {
  if (!state.activeTimer.taskId) return;
  state.activeTimer.remaining += secs;
  state.activeTimer.total += secs;
  render();
  toast('+5 минут добавлено', 'info');
}

function startTimerInterval() {
  stopTimerInterval();
  timerInterval = setInterval(() => {
    if (state.activeTimer.remaining > 0) {
      state.activeTimer.remaining--;
      updateTimerDOM();
    } else {
      finishTimer();
    }
  }, 1000);
}

function stopTimerInterval() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
}

function finishTimer() {
  const task = state.tasks.find(t => t.id === state.activeTimer.taskId);
  stopTimerInterval();
  state.activeTimer.running = false;
  
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.5);
    osc.start(); osc.stop(audioCtx.currentTime + 1.5);
  } catch(e) {}
  
  toast(`Время вышло! Фокус завершен: ${task ? task.text : ''}`, 'success');
  render();
}

function updateTimerDOM() {
  const { remaining, total, taskId } = state.activeTimer;
  const timeStr = formatTime(remaining);
  const pct = total > 0 ? ((total - remaining) / total) * 100 : 0;

  document.querySelectorAll(`[data-timer-task="${taskId}"]`).forEach(el => {
    const display = el.querySelector('.timer-display');
    if (display) display.textContent = timeStr;
    const fill = el.querySelector('.timer-bar-fill');
    if (fill) fill.style.width = pct + '%';
  });

  document.querySelectorAll('.task.is-focusing .task-timer-time').forEach(el => { el.textContent = timeStr; });

  const ftTime = document.getElementById('ftTime');
  if (ftTime) ftTime.textContent = timeStr;
}

function updateFloatingTimer() {
  const ft = document.getElementById('floatingTimer');
  if (state.activeTimer.taskId) {
    const task = state.tasks.find(t => t.id === state.activeTimer.taskId);
    ft.style.display = 'flex';
    ft.classList.toggle('paused', !state.activeTimer.running);
    document.getElementById('ftText').textContent = task ? task.text : 'Фокус';
    document.getElementById('ftTime').textContent = formatTime(state.activeTimer.remaining);
    const icon = document.querySelector('#ftToggle i');
    if (icon) icon.className = state.activeTimer.running ? 'fa-regular fa-circle-pause' : 'fa-regular fa-circle-play';
  } else {
    ft.style.display = 'none';
  }
}

// ===== ДЕЙСТВИЯ С ЗАДАЧАМИ =====
function addTask(text, importance, groupId, tags, note, dueDate, repeat, timerDuration, endDate, startTime, endTime) {
  state.tasks.unshift(createTask(text, importance, groupId, tags, note, dueDate, repeat, timerDuration, endDate, startTime, endTime));
  render(); 
  toast('Дело добавлено', 'success'); 
}
function toggleDone(id) { 
  const t = state.tasks.find(x => x.id === id); 
  if (!t) return; 
  
if (!t.done && t.repeat) {
    t.done = false; // задача не становится выполненной, она переносится
    const nextDate = getNextRepeatDate(t);
    if (nextDate) {
        // Проверяем, не превышает ли новая дата дату окончания повтора (если она задана)
        if (t.endDate) {
            const end = new Date(t.endDate);
            end.setHours(0, 0, 0, 0);
            if (nextDate > end) {
                // Повтор больше не нужен – можно либо завершить задачу, либо убрать повтор
                t.done = true;  // как вариант – отметить выполненной окончательно
                t.repeat = null;
                toast('Последний повтор завершён. Задача выполнена.', 'success');
                render();
                return;
            }
        }
        // Просто устанавливаем следующую дату без дополнительных сдвигов
        t.dueDate = nextDate.toISOString();
        toast('Задача выполнена и перенесена на следующий день!', 'success');
    } else {
        // Если следующая дата не найдена (например, endDate в прошлом), завершаем задачу
        t.done = true;
        t.repeat = null;
        toast('Повтор завершён, задача выполнена.', 'success');
    }
    render();
    return; // важно выйти, чтобы не попасть в else-ветку ниже
}
// Обычное переключение для не-повторяющихся задач
t.done = !t.done; 
if (t.done && state.activeTimer.taskId === id) stopTimer();
if (t.done) toast('Готово!', 'success'); 
render();
}
function deleteTask(id) {
  const el = document.querySelector(`.task[data-id="${id}"]`);
  const cleanup = () => {
    state.tasks = state.tasks.filter(x => x.id !== id);
    if (state.dealOfDayId === id) state.dealOfDayId = null;
    if (state.activeTimer.taskId === id) stopTimer();
    render(); toast('Дело удалено', 'info');
  };
  if (el) { el.classList.add('removing'); setTimeout(cleanup, 280); }
  else cleanup();
}
function setDealOfDay(id) {
  if (state.dealOfDayId === id) { state.dealOfDayId = null; render(); toast('Дело дня снято', 'info'); }
  else {
    state.dealOfDayId = id;
    // Дело дня всегда относится к сегодняшнему дню
    const t = state.tasks.find(x => x.id === id);
    if (t) t.dueDate = localMidnightISO(new Date());
    render(); toast('Теперь это дело дня', 'success');
  }
}
function addSubtask(taskId, text) { const t = state.tasks.find(x => x.id === taskId); if (!t) return; t.subtasks.push({ id: uid(), text: text.trim(), done: false }); render(); }
function toggleSubtask(taskId, subId) { const t = state.tasks.find(x => x.id === taskId); if (!t) return; const s = t.subtasks.find(x => x.id === subId); if (!s) return; s.done = !s.done; render(); }
function deleteSubtask(taskId, subId) { const t = state.tasks.find(x => x.id === taskId); if (!t) return; t.subtasks = t.subtasks.filter(x => x.id !== subId); render(); }

// ===== РЕДАКТИРОВАНИЕ =====
function showEditTaskUI(taskId) {
  const t = state.tasks.find(x => x.id === taskId); if (!t) return;
  const taskEl = document.querySelector(`.task[data-id="${taskId}"]`);
  if (!taskEl) return;
  const editState = {
    text: t.text,
    importance: t.importance,
    groupId: t.groupId || '',
    tags: t.tags ? [...t.tags] : [],
    note: t.note || '',
    dueDate: t.dueDate || '',
    endDate: t.endDate || '',
    startTime: t.startTime || '',
    endTime: t.endTime || '',
    repeat: t.repeat ? JSON.parse(JSON.stringify(t.repeat)) : null,
    timerDuration: t.timerDuration || TIMER_DEFAULT
  };
  const weekdays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  let repeatHTML = `
    <div class="edit-field" style="flex: 1 1 100%;">
      <div class="edit-field-label">Повтор</div>
      <div class="repeat-picker">
        <div class="repeat-options">
          <button type="button" class="repeat-opt-btn ${!editState.repeat ? 'active' : ''}" data-rep="none">Без повтора</button>
          <button type="button" class="repeat-opt-btn ${editState.repeat?.type === 'daily' ? 'active' : ''}" data-rep="daily">Ежедневно</button>
          <button type="button" class="repeat-opt-btn ${editState.repeat?.type === 'weekly' ? 'active' : ''}" data-rep="weekly">В дни недели</button>
          <button type="button" class="repeat-opt-btn ${editState.repeat?.type === 'monthly' ? 'active' : ''}" data-rep="monthly">Ежемесячно</button>
        </div>
        <div class="weekdays-picker" style="${editState.repeat?.type === 'weekly' ? 'display: flex;' : 'display: none;'}">
          ${weekdays.map((d, i) => `<button type="button" class="weekday-btn ${editState.repeat?.days?.includes(i) ? 'active' : ''}" data-day="${i}">${d}</button>`).join('')}
        </div>
      </div>
    </div>
  `;

  taskEl.innerHTML = `
    <div class="task-edit">
      <input type="text" class="edit-input" value="${escapeHtml(t.text)}" maxlength="140">
      <div class="edit-row">
<div class="edit-field">
  <div class="edit-field-label">Дата начала работ по задаче</div>
  <input type="date" class="edit-input" id="editDueDateInput" value="${editState.dueDate ? toLocalISODate(new Date(editState.dueDate)) : ''}">
</div>
<div class="edit-field">
  <div class="edit-field-label">Дата завершения работ по задаче</div>
  <input type="date" class="edit-input" id="editEndDateInput" value="${editState.endDate ? toLocalISODate(new Date(editState.endDate)) : ''}">
</div>
<div class="edit-field">
  <div class="edit-field-label">Время начала</div>
  <div class="time-input-wrap">
    <input type="time" class="edit-input" id="editStartTimeInput" value="${editState.startTime}">
    <button type="button" class="time-clear-btn" data-clear="editStartTimeInput" aria-label="Очистить время начала" title="Очистить"><i class="fa-solid fa-xmark"></i></button>
  </div>
</div>
<div class="edit-field">
  <div class="edit-field-label">Время окончания</div>
  <div class="time-input-wrap">
    <input type="time" class="edit-input" id="editEndTimeInput" value="${editState.endTime}">
    <button type="button" class="time-clear-btn" data-clear="editEndTimeInput" aria-label="Очистить время окончания" title="Очистить"><i class="fa-solid fa-xmark"></i></button>
  </div>
</div>
        <div class="edit-field">
          <div class="edit-field-label">Важность</div>
          <div class="edit-imp-picker">
            ${['none','low','medium','high'].map(imp => `<button type="button" class="imp-btn-mini ${imp === editState.importance ? 'active' : ''}" data-imp="${imp}"><div class="bars"><span></span><span></span><span></span></div>${IMPORTANCE_LABELS[imp]}</button>`).join('')}
          </div>
        </div>
        <div class="edit-field">
          <div class="edit-field-label">Список</div>
          <select class="select-styled edit-select" id="editGroupSelect">
            <option value="">Без списка</option>
            ${state.groups.map(g => `<option value="${g.id}" ${g.id === editState.groupId ? 'selected' : ''}>${escapeHtml(g.name)}</option>`).join('')}
          </select>
        </div>
        <div class="edit-field">
          <div class="edit-field-label">Таймер</div>
          <select class="select-styled edit-select timer-duration-select" id="editTimerSelect">
            <option value="300" ${editState.timerDuration === 300 ? 'selected' : ''}>5 минут</option>
            <option value="600" ${editState.timerDuration === 600 ? 'selected' : ''}>10 минут</option>
            <option value="900" ${editState.timerDuration === 900 ? 'selected' : ''}>15 минут</option>
            <option value="1800" ${editState.timerDuration === 1800 ? 'selected' : ''}>30 минут</option>
            <option value="2700" ${editState.timerDuration === 2700 ? 'selected' : ''}>45 минут</option>
            <option value="3600" ${editState.timerDuration === 3600 ? 'selected' : ''}>60 минут</option>
            <option value="5400" ${editState.timerDuration === 5400 ? 'selected' : ''}>90 минут</option>
          </select>
        </div>
        <div class="edit-field" style="flex: 1 1 100%;">
          <div class="edit-field-label">Теги (макс. 3)</div>
          <div class="tag-picker" id="editTagPicker">
            ${renderTagsPicker(editState.tags)}
          </div>
        </div>
        ${repeatHTML}
        <div class="edit-field" style="flex: 1 1 100%;">
          <div class="edit-field-label">Заметка</div>
          <textarea class="edit-input" id="editNoteInput" maxlength="300" rows="2" placeholder="Дополнительные детали...">${escapeHtml(editState.note)}</textarea>
        </div>
      </div>
      <div class="edit-actions">
        <button type="button" class="btn-save"><i class="fa-solid fa-check"></i> Сохранить</button>
        <button type="button" class="btn-cancel">Отмена</button>
        <span class="edit-hint"><kbd>Enter</kbd> сохранить · <kbd>Esc</kbd> отмена</span>
      </div>
    </div>`;

  const input = taskEl.querySelector('.edit-input');
  input.focus(); input.setSelectionRange(input.value.length, input.value.length);
  wireTimeClear(taskEl);

  taskEl.querySelectorAll('.imp-btn-mini').forEach(btn => {
    btn.addEventListener('click', () => {
      taskEl.querySelectorAll('.imp-btn-mini').forEach(b => b.classList.remove('active'));
      btn.classList.add('active'); editState.importance = btn.dataset.imp;
    });
  });

  taskEl.querySelector('#editGroupSelect').addEventListener('change', (e) => {
    editState.groupId = e.target.value;
  });

  taskEl.querySelector('#editTimerSelect').addEventListener('change', (e) => {
    editState.timerDuration = parseInt(e.target.value);
  });

  // Логика повтора
  taskEl.querySelectorAll('.repeat-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      taskEl.querySelectorAll('.repeat-opt-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const repType = btn.dataset.rep;
      const wdPicker = taskEl.querySelector('.weekdays-picker');
      
      if (repType === 'none') { 
        editState.repeat = null; 
        wdPicker.style.display = 'none'; 
      }
      else if (repType === 'daily') { 
        editState.repeat = { type: 'daily' }; 
        wdPicker.style.display = 'none'; 
      }
      else if (repType === 'monthly') { 
        editState.repeat = { type: 'monthly' }; 
        wdPicker.style.display = 'none'; 
      }
      else if (repType === 'weekly') { 
        if (!editState.repeat || editState.repeat.type !== 'weekly') editState.repeat = { type: 'weekly', days: [] };
        wdPicker.style.display = 'flex'; 
      }
    });
  });

  taskEl.querySelectorAll('.weekday-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const day = parseInt(btn.dataset.day);
      if (!editState.repeat) editState.repeat = { type: 'weekly', days: [] };
      if (!editState.repeat.days) editState.repeat.days = [];
      const idx = editState.repeat.days.indexOf(day);
      if (idx > -1) editState.repeat.days.splice(idx, 1);
      else editState.repeat.days.push(day);
      btn.classList.toggle('active');
    });
  });

  taskEl.querySelector('#editTagPicker').addEventListener('click', (e) => {
    const btn = e.target.closest('.tag-picker-btn');
    if (!btn) return;
    const tagId = btn.dataset.tagId;
    const index = editState.tags.indexOf(tagId);
    if (index > -1) {
      editState.tags.splice(index, 1);
    } else {
      if (editState.tags.length >= 3) {
        toast('Можно добавить не более 3-х тегов', 'danger');
        return;
      }
      editState.tags.push(tagId);
    }
    updateTagPickerSelections(taskEl.querySelector('#editTagPicker'), editState.tags);
  });

  const save = () => {
    const newText = input.value.trim();
    if (!newText) { toast('Текст не может быть пустым', 'danger'); input.focus(); return; }
    const noteInput = taskEl.querySelector('#editNoteInput');
    const dateInput = taskEl.querySelector('#editDueDateInput');
    const endDateInput = taskEl.querySelector('#editEndDateInput'); // НОВОЕ
    const startTimeInput = taskEl.querySelector('#editStartTimeInput');
    const endTimeInput = taskEl.querySelector('#editEndTimeInput');
    
    if (noteInput) editState.note = noteInput.value.trim();
    if (dateInput) editState.dueDate = dateInput.value ? new Date(dateInput.value + "T00:00:00").toISOString() : null;
    
    // Сохраняем дату завершения
    if (endDateInput) {
      editState.endDate = endDateInput.value ? new Date(endDateInput.value + "T00:00:00").toISOString() : null;
    }
    if (editState.endDate && editState.dueDate && new Date(editState.endDate) < new Date(editState.dueDate)) {
      toast('Дата завершения не может быть раньше даты начала', 'danger');
      return;
    }
    
    if (editState.repeat && editState.repeat.type === 'weekly' && (!editState.repeat.days || editState.repeat.days.length === 0)) {
      toast('Выберите хотя бы один день недели', 'danger');
      return;
    }

    t.text = newText; 
    t.importance = editState.importance; 
    t.groupId = editState.groupId; 
    t.tags = editState.tags; 
    t.note = editState.note; 
    t.dueDate = editState.dueDate;
    t.endDate = editState.endDate; // НОВОЕ
    const startVal = startTimeInput ? startTimeInput.value : '';
    const endVal = endTimeInput ? endTimeInput.value : '';
    if (startVal && endVal && endVal <= startVal) {
      toast('Время окончания не может быть раньше времени начала', 'danger');
      return;
    }
    // Время есть, а дату убрали — считаем задачу сегодняшней
    if (startVal && !editState.dueDate) editState.dueDate = localMidnightISO(new Date());
    t.startTime = startVal || null;
    t.endTime = endVal || null;
    t.repeat = editState.repeat;
    t.timerDuration = editState.timerDuration;
    render(); toast('Изменения сохранены', 'success');
  };
  const cancel = () => render();

  taskEl.querySelector('.btn-save').addEventListener('click', save);
  taskEl.querySelector('.btn-cancel').addEventListener('click', cancel);
  // Enter/Esc работают из любого поля карточки, а не только из текстового
  taskEl.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); cancel(); return; }
    if (e.key === 'Enter') {
      const tag = (e.target.tagName || '').toUpperCase();
      // в заметке Enter — перенос строки, на кнопках и селектах — штатное действие
      if (tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'SELECT') return;
      e.preventDefault(); save();
    }
  });
}

function showEditSubtaskUI(taskId, subId) {
  const t = state.tasks.find(x => x.id === taskId); if (!t) return;
  const s = t.subtasks.find(x => x.id === subId); if (!s) return;
  const subEl = document.querySelector(`[data-sub-id="${subId}"]`);
  if (!subEl) return;
  const textEl = subEl.querySelector('.subtask-text');
  const actionsEl = subEl.querySelector('.subtask-actions');
  if (!textEl) return;

  textEl.style.display = 'none';
  if (actionsEl) actionsEl.style.display = 'none';

  const editWrap = document.createElement('div');
  editWrap.className = 'subtask-edit';
  editWrap.innerHTML = `<input type="text" class="subtask-edit-input" value="${escapeHtml(s.text)}" maxlength="120">`;
  textEl.parentNode.insertBefore(editWrap, textEl.nextSibling);

  const input = editWrap.querySelector('input');
  input.focus(); input.setSelectionRange(input.value.length, input.value.length);

  const save = () => {
    const newText = input.value.trim();
    if (!newText) { toast('Текст не может быть пустым', 'danger'); input.focus(); return; }
    s.text = newText; render(); toast('Подзадача обновлена', 'success');
  };
  const cancel = () => render();

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
    if (e.key === 'Escape') { e.preventDefault(); cancel(); }
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      if (!document.contains(input)) return;
      const newText = input.value.trim();
      if (newText && newText !== s.text) save();
      else cancel();
    }, 150);
  });
}

function showAddSubtaskUI(taskId) {
  const existing = document.querySelector('.add-subtask');
  if (existing) existing.remove();

  const container = document.querySelector(`.task[data-id="${taskId}"]`);
  if (!container) return;
  
  const taskMain = container.querySelector('.task-main');
  let subtasksEl = container.querySelector('.subtasks');
  
  if (!subtasksEl) {
    subtasksEl = document.createElement('div');
    subtasksEl.className = 'subtasks';
    taskMain.insertAdjacentElement('afterend', subtasksEl);
  }

  const html = `<div class="add-subtask"><input type="text" class="add-subtask-input" placeholder="Текст подзадачи..." maxlength="120"><button type="button" class="add-subtask-btn">Добавить</button></div>`;
  subtasksEl.insertAdjacentHTML('beforeend', html);

  const input = subtasksEl.querySelector('.add-subtask-input');
  const btn = subtasksEl.querySelector('.add-subtask-btn');
  input.focus();

  const submit = () => { const val = input.value.trim(); if (val) addSubtask(taskId, val); else closeAddSubtask(); };
  const closeAddSubtask = () => { const as = subtasksEl.querySelector('.add-subtask'); if (as) as.remove(); if (subtasksEl.children.length === 0) subtasksEl.remove(); };

  btn.addEventListener('click', submit);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
    if (e.key === 'Escape') { e.preventDefault(); closeAddSubtask(); }
  });
}

// ===== АККАУНТ И СИНХРОНИЗАЦИЯ =====
const TOKEN_KEY = 'todo-app-v47-token';
const LOGIN_KEY = 'todo-app-v47-login';
const SYNCED_AT_KEY = 'todo-app-v47-synced-at';
const API_BASE = (location.host === '104.171.138.209') ? '/api' : 'http://104.171.138.209/api';
let syncToken = localStorage.getItem(TOKEN_KEY) || null;
let syncLoginName = localStorage.getItem(LOGIN_KEY) || '';
let pushTimer = null;
let syncing = false; // защита от цикла: pull -> saveState -> push

async function apiCall(method, path, body) {
  const headers = {};
  if (syncToken) headers['Authorization'] = 'Bearer ' + syncToken;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(API_BASE + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  } catch (e) {
    // Сеть недоступна: сервер выключен либо смешанный контент — HTTPS-страница
    // (GitHub Pages) не может обращаться к HTTP-API
    let msg = 'Нет связи с сервером синхронизации';
    if (location.protocol === 'https:') msg += '. С HTTPS-страницы (GitHub Pages) синхронизация недоступна — откройте http://104.171.138.209';
    throw new Error(msg);
  }
  let data = {};
  try { data = await res.json(); } catch (e) { /* пустое тело */ }
  if (res.status === 401 && syncToken) handleUnauthorized();
  if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
  return data;
}

function handleUnauthorized() {
  syncToken = null;
  syncLoginName = '';
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LOGIN_KEY);
  updateSyncUI();
  toast('Сессия истекла — войдите заново', 'danger');
}

function syncTimeText(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `синхронизировано в ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function updateSyncUI() {
  const box = document.getElementById('syncBox');
  const toolbarBtn = document.getElementById('syncNowBtn');
  if (toolbarBtn) toolbarBtn.classList.toggle('logged-out', !(syncToken && syncLoginName));
  if (!box) return;
  const lastSync = Number(localStorage.getItem(SYNCED_AT_KEY) || 0);
  if (syncToken && syncLoginName) {
    box.innerHTML = `
      <div class="sync-account"><i class="fa-regular fa-user"></i><span>${escapeHtml(syncLoginName)}</span></div>
      <div class="sync-status">${lastSync ? syncTimeText(lastSync) : 'ещё не синхронизировано'}</div>
      <div class="sync-actions">
        <button class="mini-btn mini-btn-save" data-action="sync-now">Синхронизировать</button>
        <button class="mini-btn mini-btn-cancel" data-action="sync-logout">Выйти</button>
      </div>`;
  } else {
    box.innerHTML = `
      <div class="sync-row">
        <input type="text" id="syncLoginInput" class="input-text" placeholder="Логин (латиница, 3–32)" autocomplete="username" maxlength="32">
        <input type="password" id="syncPassInput" class="input-text" placeholder="Пароль (минимум 6)" autocomplete="current-password">
      </div>
      <div class="sync-actions">
        <button class="mini-btn mini-btn-save" data-action="sync-login">Войти</button>
        <button class="mini-btn mini-btn-cancel" data-action="sync-register">Создать аккаунт</button>
      </div>`;
  }
}

// Автоотправка изменений с задержкой после каждого сохранения
function schedulePush() {
  if (!syncToken || syncing) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { syncPush({ silent: true }).catch(() => {}); }, 1200);
}

async function syncPush(opts = {}) {
  if (!syncToken) return;
  const res = await apiCall('PUT', '/state', getStateSnapshot());
  localStorage.setItem(SYNCED_AT_KEY, String(res.updated_at || Date.now()));
  if (!opts.silent) toast('Состояние отправлено на сервер', 'success');
  updateSyncUI();
}

// Загружаем состояние с сервера, только если оно новее нашей последней синхронизации
// (чтобы не затирать локальные правки, сделанные офлайн этим же устройством)
async function syncPull(opts = {}) {
  if (!syncToken) return false;
  const data = await apiCall('GET', '/state');
  const lastLocalSync = Number(localStorage.getItem(SYNCED_AT_KEY) || 0);
  if (data.state && data.updated_at && data.updated_at > lastLocalSync + 1000) {
    applyServerState(data.state);
    localStorage.setItem(SYNCED_AT_KEY, String(data.updated_at));
    if (!opts.silent) toast('Данные загружены с сервера', 'success');
    updateSyncUI();
    return true;
  }
  if (!opts.silent) {
    toast(data.state ? 'Локальные данные не старше серверных' : 'На сервере пусто — нечего загружать', 'info');
  }
  return false;
}

function applyServerState(srv) {
  if (!srv || typeof srv !== 'object') return;
  syncing = true;
  try {
    state.tasks = srv.tasks || [];
    state.groups = srv.groups || [];
    state.tags = srv.tags || [];
    if (srv.systemListsConfig) state.systemListsConfig = { ...state.systemListsConfig, ...srv.systemListsConfig };
    state.listVisibility = srv.listVisibility || state.listVisibility;
    state.dealOfDayId = srv.dealOfDayId || null;
    state.sidebarCollapsed = !!srv.sidebarCollapsed;
    state.doneExpanded = !!srv.doneExpanded;
    state.theme = srv.theme || 'dark';
    state.shareEmail = srv.shareEmail || '';
    state.autoFormatDay = !!srv.autoFormatDay;
    applyTheme();
    applySidebarState();
    render();
  } finally {
    syncing = false;
  }
}

async function doSyncAuth(kind) {
  const loginEl = document.getElementById('syncLoginInput');
  const passEl = document.getElementById('syncPassInput');
  const login = loginEl ? loginEl.value.trim() : '';
  const password = passEl ? passEl.value : '';
  if (!login || !password) { toast('Введите логин и пароль', 'danger'); return; }
  try {
    const res = await apiCall('POST', kind === 'register' ? '/register' : '/login', { login, password });
    syncToken = res.token;
    syncLoginName = res.login;
    localStorage.setItem(TOKEN_KEY, syncToken);
    localStorage.setItem(LOGIN_KEY, syncLoginName);
    toast(kind === 'register' ? 'Аккаунт создан' : 'Вы вошли', 'success');
    // первый вход: сервер новее — тянем его; сервер пуст/старее — поднимаем туда локальные данные
    const pulled = await syncPull({ silent: true }).catch(() => false);
    if (!pulled) await syncPush({ silent: true }).catch(() => {});
    updateSyncUI();
  } catch (e) {
    toast(e.message, 'danger');
  }
}

// Одна кнопка: сервер новее — забираем его, иначе — отправляем локальное
async function doSyncNow() {
  if (!syncToken) return;
  try {
    const pulled = await syncPull({ silent: true });
    if (!pulled) await syncPush({ silent: true });
    toast('Синхронизировано', 'success');
  } catch (e) {
    toast(e.message, 'danger');
  }
}

// Кнопка синхронизации в верхней панели: вошли — синхронизируем (иконка крутится),
// не вошли — приглашаем войти в настройках
async function doSyncToolbar() {
  if (!syncToken) {
    toast('Войдите в аккаунт в настройках', 'info');
    openSettings();
    return;
  }
  const icon = document.querySelector('#syncNowBtn i');
  if (icon) icon.classList.add('fa-spin');
  try {
    await doSyncNow();
  } finally {
    if (icon) setTimeout(() => icon.classList.remove('fa-spin'), 500);
  }
}

async function doSyncLogout() {
  try { await apiCall('POST', '/logout'); } catch (e) { /* даже если не вышло — разлогиниваемся локально */ }
  syncToken = null;
  syncLoginName = '';
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LOGIN_KEY);
  localStorage.removeItem(SYNCED_AT_KEY);
  // локальные данные принадлежат аккаунту — не оставляем их на устройстве без авторизации
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

// ===== ДЕЛЕГИРОВАНИЕ СОБЫТИЙ =====
document.addEventListener('click', (e) => {
  if (e.target.matches('#settingsModal.modal-overlay')) { closeSettings(); return; }
  if (e.target.matches('#noteModal.modal-overlay')) { closeNoteModal(); return; }
  if (e.target.matches('#iconModal.modal-overlay')) { closeIconModal(); return; }
  if (e.target.matches('#shareModal.modal-overlay')) { closeShareModal(); return; }

  const sysIcon = e.target.closest('[data-action="edit-system-icon"]');
  if (sysIcon) { e.stopPropagation(); showIconModal(sysIcon.dataset.listId); return; }

  const calAction = e.target.closest('[data-cal-action]');
  if (calAction) {
    e.stopPropagation();
    const action = calAction.dataset.calAction;
    if (action === 'prev-month') calendar.date.setMonth(calendar.date.getMonth() - 1);
    else if (action === 'next-month') calendar.date.setMonth(calendar.date.getMonth() + 1);
    else if (action === 'prev-year') calendar.date.setFullYear(calendar.date.getFullYear() - 1);
    else if (action === 'next-year') calendar.date.setFullYear(calendar.date.getFullYear() + 1);
    else if (action === 'toggle-view') calendar.view = calendar.view === 'days' ? 'months' : 'days';
    else if (action === 'select-month') {
      calendar.date.setMonth(parseInt(calAction.dataset.month));
      calendar.view = 'days';
    }
    else if (action === 'select-day') {
      selectedDate = new Date(calendar.date.getFullYear(), calendar.date.getMonth(), parseInt(calAction.dataset.day));
      const today = new Date();
      const tomorrow = getTomorrowDate();
      if (isSameDay(selectedDate, today)) state.activeGroupId = 'today';
      else if (isSameDay(selectedDate, tomorrow)) state.activeGroupId = 'tomorrow';
      else state.activeGroupId = 'date';
      updateDate();
      calendar.visible = false;
      render();
      if (document.getElementById('timelinePanel').classList.contains('open')) renderTimeline();
    }
    else if (action === 'today') {
      selectedDate = new Date();
      calendar.date = new Date();
      calendar.view = 'days';
      state.activeGroupId = 'today';
      updateDate();
      calendar.visible = false;
      render();
      if (document.getElementById('timelinePanel').classList.contains('open')) renderTimeline();
    }
    renderCalendar();
    return;
  }

  const toggleBtn = document.getElementById('calToggle');
  const pop = document.getElementById('calendarPopover');
  if (calendar.visible && !pop.contains(e.target) && !toggleBtn.contains(e.target)) {
    calendar.visible = false;
    renderCalendar();
  }

  const tagBtn = e.target.closest('#formTagPicker .tag-picker-btn');
  if (tagBtn) {
    const tagId = tagBtn.dataset.tagId;
    const index = state.formTags.indexOf(tagId);
    if (index > -1) {
      state.formTags.splice(index, 1);
    } else {
      if (state.formTags.length >= 3) {
        toast('Можно добавить не более 3-х тегов', 'danger');
        return;
      }
      state.formTags.push(tagId);
    }
    renderFormTagPicker();
    return;
  }

  const action = e.target.closest('[data-action]');
  if (!action) return;
  const type = action.dataset.action;
  const id = action.dataset.id;

  switch(type) {
    case 'open-settings': openSettings(); break;
    case 'close-settings': closeSettings(); break;
    case 'sync-login': doSyncAuth('login'); break;
    case 'sync-register': doSyncAuth('register'); break;
    case 'sync-logout': doSyncLogout(); break;
    case 'sync-now': doSyncNow(); break;
    case 'sync-toolbar': doSyncToolbar(); break;
    case 'open-share': openShareModal(); break;
    case 'copy-share-html': copyShareHtml(); break;
    case 'close-share': closeShareModal(); break;
    case 'cancel-share': closeShareModal(); break;
    case 'send-share': sendShare(); break;
    case 'close-note': closeNoteModal(); break;
    case 'view-note': showNoteModal(id); break;
    case 'save-edit-note': saveEditNote(); break;
    case 'cancel-edit-note': cancelEditNote(); break;
    case 'close-icon-modal': closeIconModal(); break;
    case 'toggle-sidebar':
      state.sidebarCollapsed = !state.sidebarCollapsed;
      applySidebarState();
      break;
    case 'toggle-done': toggleDone(id); break;
    case 'delete-task': deleteTask(id); break;
    case 'set-deal': setDealOfDay(id); break;
    case 'edit-task': showEditTaskUI(id); break;
    case 'toggle-subtask': toggleSubtask(action.dataset.task, action.dataset.sub); break;
    case 'delete-subtask': deleteSubtask(action.dataset.task, action.dataset.sub); break;
    case 'edit-subtask': showEditSubtaskUI(action.dataset.task, action.dataset.sub); break;
    case 'show-add-subtask': showAddSubtaskUI(id); break;
    case 'start-timer': startTimer(id); break;
    case 'stop-timer': stopTimer(); break;
    case 'toggle-pause': togglePause(); break;
    case 'add-time': addTime(300); break;
    case 'select-group': 
      state.activeGroupId = id; 
      if (id === 'inbox') selectedDate = null;
      else if (id === 'today') selectedDate = new Date();
      else if (id === 'tomorrow') selectedDate = getTomorrowDate();
      else if (id === 'scheduled') selectedDate = null;
      else if (id === 'overdue' || id === 'done') selectedDate = null;
      else if (id === 'all') selectedDate = null;
      else selectedDate = null; 
      state.formGroupId = (id !== 'all' && id !== 'inbox' && id !== 'today' && id !== 'tomorrow' && id !== 'scheduled' && id !== 'overdue' && id !== 'done' && id !== 'date') ? id : '';
      updateDate();
      render(); 
      if (document.getElementById('timelinePanel').classList.contains('open')) renderTimeline();
      break;
    case 'add-group-ui': 
      state.addingGroup = true; 
      renderGroupsBar(); 
      setTimeout(() => document.getElementById('newGroupName')?.focus(), 50);
      break;
    case 'cancel-new-group': 
      state.addingGroup = false; 
      renderGroupsBar(); 
      break;
    case 'save-new-group': 
      const newGroupInput = document.getElementById('newGroupName');
      const newGroupColorInput = document.getElementById('newGroupColor');
      if (newGroupInput && newGroupInput.value.trim()) addGroup(newGroupInput.value.trim(), newGroupColorInput ? newGroupColorInput.value : '#2dd4bf');
      else { state.addingGroup = false; renderGroupsBar(); }
      break;
    case 'edit-group': 
      state.editingGroupId = id; 
      renderGroupsBar(); 
      break;
    case 'cancel-edit-group': 
      state.editingGroupId = null; 
      renderGroupsBar(); 
      break;
    case 'save-edit-group': 
      saveEditGroup(id); 
      break;
    case 'delete-group': 
      deleteGroup(id); 
      break;
    case 'add-tag-ui': 
      state.addingTag = true; 
      renderTagsBar(); 
      setTimeout(() => document.getElementById('newTagName')?.focus(), 50);
      break;
    case 'cancel-new-tag': 
      state.addingTag = false; 
      renderTagsBar(); 
      break;
    case 'save-new-tag': 
      const newTagInput = document.getElementById('newTagName');
      const newTagColorInput = document.getElementById('newTagColor');
      if (newTagInput && newTagInput.value.trim()) addTag(newTagInput.value.trim(), newTagColorInput ? newTagColorInput.value : '#2dd4bf');
      else { state.addingTag = false; renderTagsBar(); }
      break;
    case 'edit-tag': 
      state.editingTagId = id; 
      renderTagsBar(); 
      break;
    case 'cancel-edit-tag': 
      state.editingTagId = null; 
      renderTagsBar(); 
      break;
    case 'save-edit-tag': 
      saveEditTag(id); 
      break;
    case 'delete-tag': 
      deleteTag(id); 
      break;
    case 'toggle-done-list':
      state.doneExpanded = !state.doneExpanded;
      render();
      break;
    case 'toggle-visibility':
      const listKey = action.dataset.list;
      state.listVisibility[listKey] = !state.listVisibility[listKey];
      // Если скрыли активный список, переключаемся на "Все дела"
      if (!state.listVisibility[listKey] && state.activeGroupId === listKey) {
        state.activeGroupId = 'all';
      }
      renderVisibilityList();
      render();
      break;
  }
});

// ===== DRAG AND DROP ОБРАБОТЧИКИ =====
document.addEventListener('dragstart', (e) => {
  const taskEl = e.target.closest('.task, .timeline-chip');
  if (!taskEl) return;

  dragData.id = taskEl.dataset.id;
  taskEl.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', dragData.id);
});

document.addEventListener('dragend', (e) => {
  const taskEl = e.target.closest('.task, .timeline-chip');
  if (taskEl) taskEl.classList.remove('dragging');

  document.querySelectorAll('.group-item.drop-target').forEach(el => el.classList.remove('drop-target'));
  document.querySelectorAll('.timeline-hour.drop-target, .timeline-untimed.drop-target').forEach(el => el.classList.remove('drop-target'));
  document.querySelectorAll('.task.drag-over-top, .task.drag-over-bottom').forEach(el => el.classList.remove('drag-over-top', 'drag-over-bottom'));

  dragData.id = null;
});

document.addEventListener('dragover', (e) => {
  if (!dragData.id) return;
  e.preventDefault();

  // Подсветка строк таймлайна как целей перетаскивания
  const tlHover = e.target.closest('.timeline-hour, .timeline-untimed');
  if (tlHover && document.getElementById('timelinePanel').contains(tlHover)) {
    document.querySelectorAll('.timeline-hour.drop-target, .timeline-untimed.drop-target').forEach(el => el.classList.remove('drop-target'));
    tlHover.classList.add('drop-target');
  } else {
    document.querySelectorAll('.timeline-hour.drop-target, .timeline-untimed.drop-target').forEach(el => el.classList.remove('drop-target'));
  }

  const groupItem = e.target.closest('.group-item');
  if (groupItem) {
    document.querySelectorAll('.group-item.drop-target').forEach(el => el.classList.remove('drop-target'));
    groupItem.classList.add('drop-target');
  } else {
    document.querySelectorAll('.group-item.drop-target').forEach(el => el.classList.remove('drop-target'));
  }

  const tasksList = document.getElementById('tasksList');
  if (tasksList.contains(e.target)) {
    const targetTask = e.target.closest('.task:not(.dragging)');
    applyTaskDragOverStyles(targetTask, e.clientY);
  } else {
    document.querySelectorAll('.task.drag-over-top, .task.drag-over-bottom').forEach(el => {
      el.classList.remove('drag-over-top', 'drag-over-bottom');
    });
  }
});

document.addEventListener('drop', (e) => {
  if (!dragData.id) return;
  e.preventDefault();

  // Дроп на таймлайн: строка = назначить время, блок «без времени» = снять время
  const tlTarget = e.target.closest('.timeline-hour, .timeline-untimed');
  if (tlTarget && document.getElementById('timelinePanel').contains(tlTarget)) {
    const task = state.tasks.find(t => t.id === dragData.id);
    if (task) {
      task.dueDate = localMidnightISO(getTimelineDate());
      if (tlTarget.classList.contains('timeline-hour')) {
        task.startTime = tlTarget.dataset.time || null;
        toast(`Задача поставлена на ${tlTarget.dataset.time}`, 'success');
      } else {
        task.startTime = null;
        toast('Задача перемещена в «без времени»', 'info');
      }
      render();
      renderTimeline();
    }
    document.querySelectorAll('.timeline-hour.drop-target, .timeline-untimed.drop-target').forEach(el => el.classList.remove('drop-target'));
    dragData.id = null;
    return;
  }

  const groupItem = e.target.closest('.group-item');
  if (groupItem) {
    const targetGroupId = groupItem.dataset.groupId;
    if (targetGroupId && targetGroupId !== 'all') {
      moveTaskToGroup(dragData.id, targetGroupId);
    }
  } else {
    const tasksList = document.getElementById('tasksList');
    if (tasksList.contains(e.target)) {
      const targetTask = e.target.closest('.task:not(.dragging)');
      if (targetTask) {
        const rect = targetTask.getBoundingClientRect();
        const insertBefore = e.clientY < rect.top + rect.height / 2;
        reorderTasks(dragData.id, targetTask.dataset.id, insertBefore);
      } else {
        const draggedIndex = state.tasks.findIndex(t => t.id === dragData.id);
        if (draggedIndex !== -1) {
          const [draggedTask] = state.tasks.splice(draggedIndex, 1);
          state.tasks.push(draggedTask);
          render();
        }
      }
    }
  }
  
  document.querySelectorAll('.group-item.drop-target').forEach(el => el.classList.remove('drop-target'));
  document.querySelectorAll('.task.drag-over-top, .task.drag-over-bottom').forEach(el => el.classList.remove('drag-over-top', 'drag-over-bottom'));
});

// Обработка выбора иконки и цвета
document.getElementById('iconPickerGrid').addEventListener('click', (e) => {
  const opt = e.target.closest('.icon-option');
  if (!opt) return;
  const icon = opt.dataset.icon;
  const listId = state.editingSystemListId;
  if (listId) {
    state.systemListsConfig[listId].icon = icon;
    showIconModal(listId); 
    renderGroupsBar(); 
  }
});

document.getElementById('iconColorPicker').addEventListener('input', (e) => {
  const listId = state.editingSystemListId;
  if (listId) {
    state.systemListsConfig[listId].color = e.target.value;
    renderGroupsBar();
  }
});

document.getElementById('themeSwitcher').addEventListener('click', (e) => {
  const btn = e.target.closest('.theme-btn');
  if (!btn) return;
  state.theme = btn.dataset.themeVal;
  applyTheme();
});

document.getElementById('calToggle').addEventListener('click', (e) => {
  e.stopPropagation();
  calendar.visible = !calendar.visible;
  if (calendar.visible) {
    calendar.date = selectedDate ? new Date(selectedDate) : new Date();
    calendar.view = 'days';
  }
  renderCalendar();
});

document.getElementById('timelineToggle').addEventListener('click', (e) => {
  e.stopPropagation();
  if (document.getElementById('timelinePanel').classList.contains('open')) closeTimeline();
  else openTimeline();
});
document.getElementById('timelineClose').addEventListener('click', closeTimeline);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && document.activeElement?.id === 'newGroupName') {
    e.preventDefault();
    document.querySelector('[data-action="save-new-group"]')?.click();
  }
  if (e.key === 'Enter' && document.activeElement?.id === 'newTagName') {
    e.preventDefault();
    document.querySelector('[data-action="save-new-tag"]')?.click();
  }
  if (e.key === 'Enter' && document.activeElement?.id.startsWith('editGroupName-')) {
    e.preventDefault();
    const id = document.activeElement.id.split('-').slice(1).join('-');
    saveEditGroup(id);
  }
  if (e.key === 'Enter' && document.activeElement?.id.startsWith('editTagName-')) {
    e.preventDefault();
    const tagId = document.activeElement.id.replace('editTagName-', '');
    saveEditTag(tagId);
  }
  
  if (e.key === 'Escape') {
    if (document.getElementById('timelinePanel').classList.contains('open')) {
      closeTimeline();
    }
    if (document.getElementById('settingsModal').style.display === 'flex') {
      closeSettings();
    }
    if (document.getElementById('noteModal').style.display === 'flex') {
      closeNoteModal();
    }
    if (document.getElementById('iconModal').style.display === 'flex') {
      closeIconModal();
    }
    if (document.getElementById('shareModal').style.display === 'flex') {
      closeShareModal();
    }
  }

  if (e.key !== 'Enter' && e.key !== ' ') return;
  const el = document.activeElement;
  if (!el || !el.matches('[role="checkbox"]')) return;
  e.preventDefault(); el.click();
});

// ===== ФОРМА =====
const addForm = document.getElementById('addForm');
const taskInput = document.getElementById('taskInput');

// Форма раскрывается при входе в любое её поле и НЕ сворачивается при клике вне её:
// закрытие — только «Добавить»/Enter (с сохранением) или «Выйти»/Esc (без сохранения)
addForm.addEventListener('focusin', () => {
  if (!addForm.classList.contains('active')) {
    addForm.classList.add('active');
    prefillDateInput(); // после сброса формы восстанавливаем дату по контексту списка
  }
});

function resetAddForm() {
  taskInput.value = '';
  const noteInput = document.getElementById('taskNoteInput');
  const dateInput = document.getElementById('taskDueDateInput');
  const endDateInput = document.getElementById('taskEndDateInput');
  const startTimeInput = document.getElementById('taskStartTimeInput');
  const endTimeInput = document.getElementById('taskEndTimeInput');
  const timerInput = document.getElementById('taskTimerSelect');
  if (noteInput) noteInput.value = '';
  if (dateInput) dateInput.value = '';
  lastPrefillDateVal = '';
  if (endDateInput) endDateInput.value = '';
  if (startTimeInput) startTimeInput.value = '';
  if (endTimeInput) endTimeInput.value = '';
  if (timerInput) timerInput.value = '1800';
  state.formTags = [];
  state.formTimerDuration = 1800;
  state.formRepeat = null;
  state.formImportance = 'none';
  document.querySelectorAll('.imp-btn').forEach(b => b.classList.remove('active'));
  const noneImp = document.querySelector('.imp-btn[data-imp="none"]');
  if (noneImp) noneImp.classList.add('active');
  document.querySelectorAll('#formRepeatPicker .repeat-opt-btn').forEach(b => b.classList.remove('active'));
  const noRep = document.querySelector('#formRepeatPicker .repeat-opt-btn[data-rep="none"]');
  if (noRep) noRep.classList.add('active');
  document.getElementById('formWeekdaysPicker').style.display = 'none';
  document.querySelectorAll('#formWeekdaysPicker .weekday-btn').forEach(b => b.classList.remove('active'));
  renderFormTagPicker();
}
function collapseAddForm() {
  resetAddForm();
  if (document.activeElement && addForm.contains(document.activeElement)) document.activeElement.blur();
  addForm.classList.remove('active');
}
document.getElementById('formCancelBtn').addEventListener('click', collapseAddForm);
addForm.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { e.preventDefault(); collapseAddForm(); return; }
  if (e.key === 'Enter') {
    const tag = (e.target.tagName || '').toUpperCase();
    // в заметке Enter — перенос строки, на кнопках и селектах — штатное действие
    if (tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'SELECT') return;
    e.preventDefault();
    addForm.requestSubmit();
  }
});

addForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const val = taskInput.value.trim();
  if (!val) return;
  
  const noteInput = document.getElementById('taskNoteInput');
  const dateInput = document.getElementById('taskDueDateInput');
  const endDateInput = document.getElementById('taskEndDateInput'); // НОВОЕ
  const timerInput = document.getElementById('taskTimerSelect');
  const startTimeInput = document.getElementById('taskStartTimeInput');
  const endTimeInput = document.getElementById('taskEndTimeInput');
  
  const noteVal = noteInput ? noteInput.value.trim() : '';
  
  let dueDate = null;
  if (dateInput && dateInput.value) {
    dueDate = new Date(dateInput.value + "T00:00:00").toISOString();
  }
  
  let endDate = null;
  if (endDateInput && endDateInput.value) {
    endDate = new Date(endDateInput.value + "T00:00:00").toISOString();
  }
  if (endDate && dueDate && new Date(endDate) < new Date(dueDate)) {
    toast('Дата завершения не может быть раньше даты начала', 'danger');
    return;
  }

  if (state.formRepeat && state.formRepeat.type === 'weekly' && state.formRepeat.days.length === 0) {
    toast('Выберите хотя бы один день недели', 'danger');
    return;
  }

  const startTimeVal = startTimeInput ? startTimeInput.value : '';
  const endTimeVal = endTimeInput ? endTimeInput.value : '';
  if (startTimeVal && endTimeVal && endTimeVal <= startTimeVal) {
    toast('Время окончания не может быть раньше времени начала', 'danger');
    return;
  }
  // Задача со временем, но без даты — считаем её сегодняшней, чтобы она попала на таймлайн
  if (startTimeVal && !dueDate) dueDate = localMidnightISO(new Date());
  addTask(val, state.formImportance, state.formGroupId, state.formTags, noteVal, dueDate, state.formRepeat, state.formTimerDuration, endDate, startTimeVal, endTimeVal);
  
  // Сброс формы и складывание
  resetAddForm();
  if (document.activeElement && addForm.contains(document.activeElement)) document.activeElement.blur();
  addForm.classList.remove('active');
  // Плавно возвращаем страницу наверх одним движением вместе со сворачиванием формы
  smoothScrollToTop();
});

document.getElementById('taskGroupSelect').addEventListener('change', (e) => {
  state.formGroupId = e.target.value;
});

// Выбор таймера
document.getElementById('taskTimerSelect').addEventListener('change', (e) => {
  state.formTimerDuration = parseInt(e.target.value);
});

// Быстрая очистка полей времени (крестик у поля): общая для формы и редактора задачи
function wireTimeClear(scope) {
  (scope || document).querySelectorAll('.time-input-wrap').forEach(wrap => {
    const input = wrap.querySelector('input[type="time"]');
    const btn = wrap.querySelector('.time-clear-btn');
    if (!input || !btn) return;
    const sync = () => wrap.classList.toggle('has-value', !!input.value);
    input.addEventListener('input', sync);
    btn.addEventListener('click', () => { input.value = ''; sync(); });
    sync();
  });
}
wireTimeClear(document);

// Логика повтора в форме
document.querySelectorAll('#formRepeatPicker .repeat-opt-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('#formRepeatPicker .repeat-opt-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const repType = btn.dataset.rep;
    const wdPicker = document.getElementById('formWeekdaysPicker');
    
    if (repType === 'none') { 
      state.formRepeat = null; 
      wdPicker.style.display = 'none'; 
    }
    else if (repType === 'daily') { 
      state.formRepeat = { type: 'daily' }; 
      wdPicker.style.display = 'none'; 
    }
    else if (repType === 'monthly') { 
      state.formRepeat = { type: 'monthly' }; 
      wdPicker.style.display = 'none'; 
    }
    else if (repType === 'weekly') { 
      if (!state.formRepeat || state.formRepeat.type !== 'weekly') state.formRepeat = { type: 'weekly', days: [] };
      wdPicker.style.display = 'flex'; 
    }
  });
});

// Выбор дней недели в форме
document.querySelectorAll('#formWeekdaysPicker .weekday-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const day = parseInt(btn.dataset.day);
    if (!state.formRepeat) state.formRepeat = { type: 'weekly', days: [] };
    if (!state.formRepeat.days) state.formRepeat.days = [];
    
    const idx = state.formRepeat.days.indexOf(day);
    if (idx > -1) state.formRepeat.days.splice(idx, 1);
    else state.formRepeat.days.push(day);
    
    btn.classList.toggle('active');
  });
});

document.querySelectorAll('.imp-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.imp-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); state.formImportance = btn.dataset.imp;
  });
});

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active'); state.filter = btn.dataset.filter; renderTasks(); updateCounts();
  });
});

// Чекбокс «Автоформатирование списка дел на день» в настройках
document.getElementById('autoFormatCheck').addEventListener('change', (e) => {
  state.autoFormatDay = e.target.checked;
  saveState(); renderTasks(); updateCounts();
});

// ===== СТАРТ =====
loadState();
applyTheme();
updateDate();
render();
applySidebarState();
updateSyncUI();
// если есть сохранённая сессия — подтягиваем свежие данные с сервера (если сервер новее)
if (syncToken) {
  syncPull({ silent: true }).catch(() => {});
}
setInterval(updateDate, 60000);