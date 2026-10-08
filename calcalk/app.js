/* ============================================================
   КалКалк — трекер калорий и воды
   Одностраничное приложение без зависимостей.
   Данные хранятся локально в браузере (localStorage, ключ calcalk_v1).
   ============================================================ */
'use strict';

/* ---------- База продуктов (ориентировочные значения на 100 г) ---------- */

const FOOD_DB = [
  // Крупы и гарниры
  { name: 'Гречка отварная', kcal: 110, p: 4.2, f: 1.1, c: 21.3 },
  { name: 'Рис отварной', kcal: 116, p: 2.4, f: 0.4, c: 25.0 },
  { name: 'Овсянка на воде', kcal: 88, p: 3.0, f: 1.7, c: 15.0 },
  { name: 'Макароны отварные', kcal: 135, p: 4.5, f: 1.1, c: 26.5 },
  { name: 'Картофель отварной', kcal: 82, p: 2.0, f: 0.4, c: 16.7 },
  { name: 'Картофель фри', kcal: 312, p: 3.4, f: 15.0, c: 41.0 },
  { name: 'Булгур отварной', kcal: 83, p: 3.0, f: 0.2, c: 18.6 },
  { name: 'Киноа отварная', kcal: 120, p: 4.4, f: 1.9, c: 21.3 },
  { name: 'Фасоль отварная', kcal: 123, p: 7.8, f: 0.5, c: 21.2 },
  { name: 'Чечевица отварная', kcal: 116, p: 9.0, f: 0.4, c: 20.1 },
  // Хлеб и выпечка
  { name: 'Хлеб белый', kcal: 266, p: 7.6, f: 3.2, c: 48.6 },
  { name: 'Хлеб цельнозерновой', kcal: 230, p: 8.0, f: 3.5, c: 43.0 },
  // Мясо и птица
  { name: 'Куриная грудка отварная', kcal: 137, p: 29.8, f: 1.8, c: 0.4 },
  { name: 'Куриное бедро запечённое', kcal: 195, p: 22.0, f: 10.9, c: 0 },
  { name: 'Индейка филе отварное', kcal: 135, p: 24.0, f: 2.0, c: 0 },
  { name: 'Говядина отварная', kcal: 220, p: 27.0, f: 8.5, c: 0 },
  { name: 'Свинина запечённая', kcal: 275, p: 23.0, f: 19.5, c: 0 },
  { name: 'Пельмени отварные', kcal: 245, p: 11.9, f: 8.0, c: 29.5 },
  { name: 'Сосиски', kcal: 266, p: 12.0, f: 23.0, c: 2.0 },
  // Рыба и морепродукты
  { name: 'Лосось', kcal: 208, p: 20.1, f: 13.4, c: 0 },
  { name: 'Треска отварная', kcal: 78, p: 17.8, f: 0.7, c: 0 },
  { name: 'Тунец консервированный', kcal: 96, p: 21.0, f: 1.0, c: 0 },
  { name: 'Креветки отварные', kcal: 95, p: 20.0, f: 1.5, c: 0 },
  { name: 'Сельдь', kcal: 158, p: 17.7, f: 8.7, c: 0 },
  // Молочное и яйца
  { name: 'Молоко 2,5%', kcal: 52, p: 2.8, f: 2.5, c: 4.7 },
  { name: 'Кефир 1%', kcal: 40, p: 3.0, f: 1.0, c: 4.0 },
  { name: 'Творог 5%', kcal: 121, p: 17.0, f: 5.0, c: 1.8 },
  { name: 'Творог обезжиренный', kcal: 71, p: 16.5, f: 0.6, c: 1.3 },
  { name: 'Сыр твёрдый', kcal: 364, p: 25.0, f: 30.0, c: 0 },
  { name: 'Йогурт греческий', kcal: 59, p: 10.0, f: 0.4, c: 3.6 },
  { name: 'Сметана 20%', kcal: 204, p: 2.8, f: 20.0, c: 3.4 },
  { name: 'Масло сливочное', kcal: 748, p: 0.8, f: 82.5, c: 0.8 },
  { name: 'Яйцо куриное', kcal: 157, p: 12.7, f: 11.5, c: 0.7 },
  // Овощи
  { name: 'Огурец', kcal: 15, p: 0.8, f: 0.1, c: 2.8 },
  { name: 'Помидор', kcal: 20, p: 1.1, f: 0.2, c: 3.7 },
  { name: 'Морковь', kcal: 35, p: 1.3, f: 0.1, c: 6.9 },
  { name: 'Капуста белокочанная', kcal: 28, p: 1.8, f: 0.1, c: 4.7 },
  { name: 'Брокколи', kcal: 34, p: 2.8, f: 0.4, c: 7.0 },
  { name: 'Авокадо', kcal: 160, p: 2.0, f: 14.7, c: 8.5 },
  { name: 'Салат листовой', kcal: 15, p: 1.4, f: 0.2, c: 1.3 },
  { name: 'Кукуруза консервированная', kcal: 90, p: 3.0, f: 1.2, c: 19.0 },
  // Фрукты и ягоды
  { name: 'Банан', kcal: 89, p: 1.1, f: 0.3, c: 22.8 },
  { name: 'Яблоко', kcal: 52, p: 0.3, f: 0.2, c: 14.0 },
  { name: 'Апельсин', kcal: 43, p: 0.9, f: 0.2, c: 8.1 },
  { name: 'Мандарин', kcal: 53, p: 0.8, f: 0.3, c: 11.5 },
  { name: 'Виноград', kcal: 69, p: 0.6, f: 0.2, c: 16.8 },
  { name: 'Груша', kcal: 47, p: 0.4, f: 0.3, c: 10.9 },
  { name: 'Клубника', kcal: 30, p: 0.7, f: 0.3, c: 7.7 },
  { name: 'Арбуз', kcal: 30, p: 0.6, f: 0.2, c: 7.6 },
  { name: 'Финики', kcal: 292, p: 2.5, f: 0.5, c: 69.0 },
  // Орехи, масла, бобовые
  { name: 'Миндаль', kcal: 579, p: 21.0, f: 49.9, c: 21.6 },
  { name: 'Грецкий орех', kcal: 654, p: 15.2, f: 65.2, c: 13.7 },
  { name: 'Арахисовая паста', kcal: 588, p: 25.1, f: 50.4, c: 20.0 },
  { name: 'Оливковое масло', kcal: 884, p: 0, f: 100, c: 0 },
  { name: 'Масло подсолнечное', kcal: 900, p: 0, f: 99.9, c: 0 },
  { name: 'Тофу', kcal: 76, p: 8.1, f: 4.8, c: 1.9 },
  { name: 'Хумус', kcal: 166, p: 7.9, f: 9.6, c: 14.3 },
  // Сладкое и напитки
  { name: 'Шоколад молочный', kcal: 535, p: 7.6, f: 29.9, c: 59.0 },
  { name: 'Шоколад тёмный 70%', kcal: 598, p: 7.8, f: 42.6, c: 45.9 },
  { name: 'Печенье овсяное', kcal: 437, p: 6.0, f: 15.0, c: 67.0 },
  { name: 'Мороженое сливочное', kcal: 207, p: 3.5, f: 11.0, c: 24.0 },
  { name: 'Мёд', kcal: 304, p: 0.3, f: 0, c: 82.0 },
  { name: 'Сахар', kcal: 387, p: 0, f: 0, c: 100 },
  { name: 'Кола', kcal: 42, p: 0, f: 0, c: 10.6 },
  { name: 'Сок апельсиновый', kcal: 45, p: 0.7, f: 0.2, c: 10.4 },
  { name: 'Кофе чёрный без сахара', kcal: 2, p: 0.1, f: 0, c: 0 },
  { name: 'Чай без сахара', kcal: 1, p: 0, f: 0, c: 0 },
  { name: 'Пиво светлое 4,5%', kcal: 43, p: 0.5, f: 0, c: 3.6 },
  { name: 'Вино красное сухое', kcal: 68, p: 0.1, f: 0, c: 0.3 },
  // Готовые блюда
  { name: 'Пицца пепперони', kcal: 298, p: 13.0, f: 12.0, c: 34.0 },
  { name: 'Ролл Филадельфия', kcal: 210, p: 8.0, f: 9.0, c: 24.0 },
];

// Монохромные линейные иконки (stroke=currentColor, без заливки) — общий набор
function mealSvg(paths) {
  return '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + paths + '</svg>';
}
const ICONS = {
  leaf: mealSvg('<path d="M13 3C7.5 3 4 6 4 10.2c0 1.2.3 2.2.9 3.1C9.8 14.6 14.6 10.5 13 3z"/><path d="M5 12.5C6.5 9.8 8.8 7.3 11.5 5.6"/>'),
  clipboard: mealSvg('<rect x="3.5" y="3" width="9" height="11" rx="1.5"/><path d="M6 3V1.8h4V3"/><path d="M6 7h4M6 10h4"/>'),
  moon: mealSvg('<path d="M13.5 9.7A6.1 6.1 0 0 1 6.3 2.5a6.1 6.1 0 1 0 7.2 7.2z"/>'),
  sun: mealSvg('<circle cx="8" cy="8" r="2.8"/><path d="M8 1.6v1.5M8 12.9v1.5M1.6 8h1.5M12.9 8h1.5M3.5 3.5l1 1M11.5 11.5l1 1M12.5 3.5l-1 1M4.5 11.5l-1 1"/>'),
  flame: mealSvg('<path d="M8 2c2.4 2.9 4 4.9 4 7.1a4 4 0 0 1-8 0c0-1 .4-2 1.2-2.9.3 1.2 1.4 2 2.3 2C6.7 6.2 7.2 4 8 2z"/>'),
  droplet: mealSvg('<path d="M8 2.2C5.6 5.4 4 7.6 4 9.8a4 4 0 0 0 8 0c0-2.2-1.6-4.4-4-7.6z"/>'),
  macro: mealSvg('<path d="M3 13V8M8 13V3.5M13 13V6.5"/>'),
  bowl: mealSvg('<path d="M2.5 8.5h11a5.5 5.5 0 0 1-11 0z"/><path d="M8 2.8v1.4"/><path d="M4.6 3.8l1 1"/><path d="M11.4 3.8l-1 1"/>'),
  user: mealSvg('<circle cx="8" cy="5.3" r="2.6"/><path d="M2.9 13.6a5.1 5.1 0 0 1 10.2 0"/>'),
  target: mealSvg('<circle cx="8" cy="8" r="5.6"/><circle cx="8" cy="8" r="2"/>'),
  data: mealSvg('<ellipse cx="8" cy="4" rx="4.8" ry="1.9"/><path d="M3.2 4v8c0 1 2.2 1.9 4.8 1.9s4.8-.9 4.8-1.9V4"/>'),
  download: mealSvg('<path d="M8 2.5v7M5 7l3 3 3-3"/><path d="M3 12.8h10"/>'),
  upload: mealSvg('<path d="M8 10.2v-7M5 6l3-3 3 3"/><path d="M3 12.8h10"/>'),
  trash: mealSvg('<path d="M3 4.5h10M6.5 4.5V3.2h3v1.3M4.5 4.5l.7 8.8h5.6l.7-8.8"/>'),
  calc: mealSvg('<rect x="3" y="2.5" width="10" height="11" rx="1.5"/><path d="M5.5 5.5h5M5.5 8.4h2M8.5 8.4h2M5.5 11.3h2M8.5 11.3h2"/>'),
  sync: mealSvg('<path d="M13.2 8A5.2 5.2 0 1 1 11 3.7"/><path d="M11.2 1.6l.2 2.6 2.5-.6"/>'),
  chart: mealSvg('<path d="M3 13.2h10M4.7 13.2V9M8 13.2V5.3M11.3 13.2V7.3"/>'),
  list: mealSvg('<path d="M3 4.3h.8M6 4.3h7M3 8h.8M6 8h7M3 11.7h.8M6 11.7h7"/>'),
  sliders: mealSvg('<path d="M3 5.2h7.3M12.7 5.2h.3M3 11h.3M7.7 11h5.3"/><circle cx="11.5" cy="5.2" r="1.7"/><circle cx="6.2" cy="11" r="1.7"/>'),
  search: mealSvg('<circle cx="7" cy="7" r="4.2"/><path d="M10.3 10.3 13.4 13.4"/>'),
  cross: mealSvg('<path d="M8 1.8v12.4"/><path d="M5.3 4.4h5.4"/><path d="M3 7.3h10"/><path d="M6.1 10.5l3.8 2.4"/>'),
  bottle: mealSvg('<path d="M6.6 2h2.8"/><path d="M6.6 2v2.6c0 .8-.3 1.2-.8 1.8-.6.8-.9 1.5-.9 2.5v2.4c0 1.3 1 2.3 2.3 2.3h1.6c1.3 0 2.3-1 2.3-2.3V8.9c0-1-.3-1.7-.9-2.5-.5-.6-.8-1-.8-1.8V2"/>'),
  check: mealSvg('<path d="M3.2 8.5l3.3 3.4 6.3-7.8"/>'),
  utensils: mealSvg('<path d="M3.1 2.4v3.9c0 1.2 1 2.2 2.2 2.2h.6c1.2 0 2.2-1 2.2-2.2V2.4"/><path d="M5.6 2.4v11.4"/><path d="M10.3 9.9V2.6c1.9.9 3.1 2.8 3.1 5.1v2.2h-3.1z"/><path d="M11.85 9.9v3.9"/>'),
};
function icoWrap(name, cls) {
  return '<span class="ic' + (cls ? ' ' + cls : '') + '" aria-hidden="true">' + ICONS[name] + '</span>';
}
const MEALS = [
  { id: 'breakfast', label: 'Завтрак', icon: '🌅',
    svg: mealSvg('<path d="M3 6.5h8V10a3.5 3.5 0 0 1-3.5 3.5h-1A3.5 3.5 0 0 1 3 10V6.5z"/><path d="M11 7.5h1.2a1.4 1.4 0 0 1 0 2.8H11"/><path d="M5.2 4c0-.8.8-.8.8-1.6"/><path d="M7.6 4c0-.8.8-.8.8-1.6"/>') },
  { id: 'lunch', label: 'Обед', icon: '☀️',
    svg: mealSvg('<path d="M2.5 8.5h11a5.5 5.5 0 0 1-11 0z"/><path d="M8 2.8v1.4"/><path d="M4.6 3.8l1 1"/><path d="M11.4 3.8l-1 1"/>') },
  { id: 'dinner', label: 'Ужин', icon: '🌙',
    svg: mealSvg('<path d="M2.5 10a5.5 5.5 0 0 1 11 0"/><path d="M2 12.8h12"/><path d="M8 3.2v1.2"/>') },
  { id: 'snack', label: 'Перекус', icon: '🍏',
    svg: mealSvg('<circle cx="8" cy="9.8" r="4.3"/><path d="M8 5.5c0-1.6 1.1-2.6 2.6-2.6"/>') },
];

const ACTIVITY = [
  { v: 1.2, label: 'Минимальная (сидячая работа)' },
  { v: 1.375, label: 'Лёгкая (1–3 тренировки в неделю)' },
  { v: 1.55, label: 'Средняя (3–5 тренировок)' },
  { v: 1.725, label: 'Высокая (6–7 тренировок)' },
  { v: 1.9, label: 'Очень высокая (физический труд)' },
];

const AIM = [
  { v: 'lose', label: 'Похудение (−15%)' },
  { v: 'keep', label: 'Поддержание веса' },
  { v: 'gain', label: 'Набор массы (+15%)' },
];

/* ---------- Состояние и хранилище ---------- */

const STORE_KEY = 'calcalk_v1';

const DEFAULTS = {
  calorieGoal: 2100,
  waterGoal: 2500,
  profile: { gender: 'male', age: 30, height: 175, weight: 75, activity: 1.375, aim: 'keep' },
  quick: Array.from({ length: 20 }, () => null), // 20 ячеек частых продуктов, КБЖУ на 100 г
  dbOver: {},     // правки базовых продуктов: { "Имя из базы": {kcal,p,f,c} }
  dbCustom: [],   // свои продукты: [{name,kcal,p,f,c}]
  dbHidden: [],   // скрытые (удалённые) базовые продукты: [имя]
  showFast: true,  // индикатор православных постов в дневнике
};

// базовые продукты с правками пользователя + его собственные
function normalizeDb(over, custom, hidden) {
  const o = {};
  if (over && typeof over === 'object') {
    Object.keys(over).forEach((k) => {
      const v = over[k];
      if (v && typeof v === 'object' && isFinite(+v.kcal)) {
        o[k] = { kcal: +v.kcal || 0, p: +v.p || 0, f: +v.f || 0, c: +v.c || 0 };
      }
    });
  }
  const cu = [];
  if (Array.isArray(custom)) {
    custom.forEach((v) => {
      if (v && v.name && isFinite(+v.kcal)) {
        cu.push({ name: String(v.name).slice(0, 40), kcal: +v.kcal || 0, p: +v.p || 0, f: +v.f || 0, c: +v.c || 0 });
      }
    });
  }
  const hi = Array.isArray(hidden) ? hidden.filter((n) => typeof n === 'string' && FOOD_DB.some((f) => f.name === n)) : [];
  return { dbOver: o, dbCustom: cu, dbHidden: hi };
}

function getFoodDB() {
  const over = state.settings.dbOver || {};
  const hidden = state.settings.dbHidden || [];
  const base = FOOD_DB
    .filter((f) => !hidden.includes(f.name))
    .map((f) => (over[f.name] ? Object.assign({}, f, over[f.name], { edited: true }) : f));
  const custom = (state.settings.dbCustom || []).map((f) => Object.assign({}, f, { custom: true }));
  return base.concat(custom);
}

// гарантируем массив из 20 корректных ячеек (null или {name,kcal,p,f,c,bg,fg})
function normalizeQuick(arr) {
  const out = [];
  const hex = (v) => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)) ? v : null;
  for (let i = 0; i < 20; i++) {
    const it = Array.isArray(arr) ? arr[i] : null;
    out.push(it && typeof it === 'object' && it.name && +it.kcal >= 0
      ? { name: String(it.name).slice(0, 40), kcal: +it.kcal || 0, p: +it.p || 0, f: +it.f || 0, c: +it.c || 0,
          bg: hex(it.bg), fg: hex(it.fg) }
      : null);
  }
  return out;
}

let state = loadState();
let viewDate = todayISO();
let activeFood = null; // продукт из базы, выбранный в подсказках

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data && typeof data === 'object' && data.days) {
        const s = data.settings || {};
        const db = normalizeDb(s.dbOver, s.dbCustom, s.dbHidden);
        return {
          settings: {
            ...DEFAULTS,
            ...s,
            profile: { ...DEFAULTS.profile, ...(s.profile || {}) },
            quick: normalizeQuick(s.quick),
            dbOver: db.dbOver,
            dbCustom: db.dbCustom,
            dbHidden: db.dbHidden,
          },
          days: data.days,
        };
      }
    }
  } catch (e) { /* повреждённые данные — начинаем с чистого листа */ }
  return { settings: JSON.parse(JSON.stringify(DEFAULTS)), days: {} };
}

function saveState() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state));
  ccSchedulePush();
}

function day(dateISO, create) {
  if (!state.days[dateISO]) {
    if (!create) return null;
    state.days[dateISO] = { foods: [], water: [] };
  }
  return state.days[dateISO];
}

/* ---------- Утилиты ---------- */

const el = (s) => document.querySelector(s);
const num = (input) => { const v = parseFloat(input.value); return isFinite(v) ? v : 0; };
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
const nowTime = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };

function pad(n) { return String(n).padStart(2, '0'); }
function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function todayISO() { return iso(new Date()); }
function fromISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
function shiftISO(s, delta) { const d = fromISO(s); d.setDate(d.getDate() + delta); return iso(d); }

const fmtFull = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
const fmtShort = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
const fmtDayMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function dayTotals(dateISO) {
  const d = state.days[dateISO] || {};
  const t = { kcal: 0, p: 0, f: 0, c: 0, water: 0 };
  (d.foods || []).forEach((x) => {
    t.kcal += +x.kcal || 0; t.p += +x.p || 0; t.f += +x.f || 0; t.c += +x.c || 0;
  });
  (d.water || []).forEach((x) => { t.water += +x.ml || 0; });
  return t;
}

const RING_C = 2 * Math.PI * 60;
function setRing(circle, frac) {
  frac = Math.max(0, Math.min(1, frac || 0));
  circle.style.strokeDasharray = RING_C;
  circle.style.strokeDashoffset = RING_C * (1 - frac);
}

/* ---------- Тост ---------- */

let toastTimer = null;
function toast(msg) {
  const t = el('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2200);
}

/* ---------- Тема ---------- */

function applyTheme(t) {
  document.documentElement.dataset.theme = t;
  el('#themeBtn').innerHTML = icoWrap(t === 'dark' ? 'sun' : 'moon');
}

// Переключатель приёма пищи: кнопки с монохромными иконками (вместо <select>)
function buildMealPicker(wrap, input) {
  if (!wrap || !input) return;
  wrap.innerHTML = MEALS.map((m) =>
    '<button type="button" class="mp-btn' + (m.id === input.value ? ' active' : '') + '" data-meal="' + m.id + '" title="' + m.label + '">' +
    m.svg + '<span>' + m.label + '</span></button>'
  ).join('');
  wrap.querySelectorAll('.mp-btn').forEach((b) => {
    b.addEventListener('click', () => {
      input.value = b.dataset.meal;
      wrap.querySelectorAll('.mp-btn').forEach((x) => x.classList.toggle('active', x === b));
    });
  });
}

/* ---------- Дневник ---------- */

// ——— Православные посты (упрощённый устав: мясо/алкоголь) ———
// Пасха по юлианской пасхалии, переведённая в новый стиль (+13 дней в XXI веке)
function easterNS(y) {
  const a = y % 4, b = y % 7, c = y % 19;
  const d = (19 * c + 15) % 30, e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  return new Date(y, month - 1, day + 13);
}
// level: fast — мясо и алкоголь исключаются; nomeat — мясо нельзя, алкоголь можно;
// none — ограничений нет. title — название периода (пусто для обычного дня).
function fastStatus(date) {
  const md = (date.getMonth() + 1) * 100 + date.getDate();
  const dow = date.getDay();
  const E = easterNS(date.getFullYear());
  const u = (x) => Date.UTC(x.getFullYear(), x.getMonth(), x.getDate());
  const n = Math.round((u(date) - u(E)) / 86400000); // дней от Пасхи (может быть отрицательным)
  if (n >= 0 && n <= 6) return { level: 'none', title: 'Светлая седмица' };
  if (n >= 49 && n <= 55) return { level: 'none', title: 'Троицкая седмица' };
  if (n >= -69 && n <= -63) return { level: 'none', title: 'Седмица мытаря и фарисея' };
  if (n >= -55 && n <= -49) return { level: 'nomeat', title: 'Сырная седмица (Масленица)' };
  if (n >= -48 && n <= -1) return { level: 'fast', title: 'Великий пост' };
  if (n >= 57 && md <= 711) return { level: 'fast', title: 'Петров пост' };
  if (md >= 814 && md <= 827) return { level: 'fast', title: 'Успенский пост' };
  if (md >= 1128 || md <= 106) return { level: 'fast', title: 'Рождественский пост' };
  if (md >= 107 && md <= 117) return { level: 'none', title: 'Святки' };
  if (md === 118) return { level: 'fast', title: 'Крещенский сочельник' };
  if (md === 911) return { level: 'fast', title: 'Усекновение главы Иоанна Предтечи' };
  if (md === 927) return { level: 'fast', title: 'Воздвижение Креста Господня' };
  if (dow === 3 || dow === 5) return { level: 'fast', title: dow === 3 ? 'среда' : 'пятница' };
  return { level: 'none', title: '' };
}
function renderFastBanner() {
  const b = el('#fastBanner');
  if (!b) return;
  if (state.settings.showFast === false) { b.hidden = true; return; }
  const st = fastStatus(fromISO(viewDate));
  b.hidden = false;
  b.className = 'card fast-banner ' + st.level;
  const label = st.level === 'fast' ? 'ПОСТ ЕСТЬ' :
                st.level === 'nomeat' ? 'БЕЗ МЯСА' : 'НЕТ ПОСТА';
  b.innerHTML = '<span class="ic fb-ic">' + (st.level === 'none' ? ICONS.bottle : ICONS.cross) + '</span>' +
    '<div class="fb-text"><b>' + label + '</b>' + (st.title ? ' · ' + st.title : '') + '</div>';
}

function renderDiary() {
  const t = dayTotals(viewDate);
  const today = todayISO();
  const goal = state.settings.calorieGoal;
  const wgoal = state.settings.waterGoal;

  // Дата
  let main;
  if (viewDate === today) main = 'Сегодня';
  else if (viewDate === shiftISO(today, -1)) main = 'Вчера';
  else main = fmtDayMonth.format(fromISO(viewDate));
  el('#dateMain').textContent = main;
  el('#dateSub').textContent = fmtFull.format(fromISO(viewDate));
  renderFastBanner();
  el('#nextDay').disabled = viewDate >= today;

  // Кольцо калорий
  el('#kcalNum').textContent = Math.round(t.kcal).toLocaleString('ru-RU');
  el('#kcalCap').textContent = 'из ' + goal.toLocaleString('ru-RU') + ' ккал';
  setRing(el('#kcalRing'), goal ? t.kcal / goal : 0);
  el('#kcalRing').classList.toggle('over', t.kcal > goal);
  const diff = Math.round(goal - t.kcal);
  el('#kcalFoot').textContent = diff >= 0
    ? 'осталось ' + diff.toLocaleString('ru-RU') + ' ккал'
    : 'перебор на ' + (-diff).toLocaleString('ru-RU') + ' ккал';
  el('#kcalFoot').classList.toggle('bad', diff < 0);

  // Кольцо воды
  el('#waterNum').textContent = Math.round(t.water).toLocaleString('ru-RU');
  el('#waterCap').textContent = 'из ' + wgoal.toLocaleString('ru-RU') + ' мл';
  setRing(el('#waterRing'), wgoal ? t.water / wgoal : 0);
  el('#waterFoot').textContent = t.water >= wgoal
    ? 'цель выполнена 🎉 (+' + Math.round(t.water - wgoal).toLocaleString('ru-RU') + ' мл)'
    : 'осталось ' + Math.round(wgoal - t.water).toLocaleString('ru-RU') + ' мл';
  el('#waterFoot').classList.toggle('bad', false);

  // Макронутриенты (целевые Б/Ж/У: 30/30/40% от нормы калорий)
  el('#macrosBox').innerHTML =
    macroRow('Б', t.p, goal * 0.30 / 4, '#7c5cff', 'Белки') +
    macroRow('Ж', t.f, goal * 0.30 / 9, '#f2b32e', 'Жиры') +
    macroRow('У', t.c, goal * 0.40 / 4, '#2fbf71', 'Углеводы');

  // Итоги секций
  el('#kcalTotal').textContent = Math.round(t.kcal).toLocaleString('ru-RU') + ' ккал';
  el('#waterTotal').textContent = Math.round(t.water).toLocaleString('ru-RU') + ' мл';

  renderWaterLog();
  renderMeals();
}

function macroRow(label, val, target, color, title) {
  const pct = target > 0 ? Math.min(100, val / target * 100) : 0;
  return '<div class="macro">' +
    '<span class="macro-l" title="' + title + '" style="color:' + color + '">' + label + '</span>' +
    '<div class="macro-bar"><div class="macro-fill" style="width:' + pct.toFixed(1) + '%;background:' + color + '"></div></div>' +
    '<span class="macro-v">' + Math.round(val) + ' / ' + Math.round(target) + ' г</span>' +
    '</div>';
}

// Лог воды — аккуратный список, по умолчанию свёрнут
let waterLogExpanded = false;
function renderWaterLog() {
  const w = (state.days[viewDate] || {}).water || [];
  const box = el('#waterLog');
  if (!w.length) {
    box.innerHTML = '<span class="empty inline">Записи о выпитой воде появятся здесь.</span>';
    return;
  }
  const total = w.reduce((s, x) => s + (+x.ml || 0), 0);
  let html = '<button type="button" class="water-log-toggle' + (waterLogExpanded ? ' open' : '') + '" data-act="toggle-water-log">' +
    '<i class="chev">▸</i> Записи · ' + w.length + ' · ' + total + ' мл</button>';
  if (waterLogExpanded) {
    html += '<div class="water-rows">' + w.map((x) =>
      '<div class="water-row">' +
        '<span class="water-time">' + escapeHtml(x.time || '') + '</span>' +
        '<span class="water-ml">' + x.ml + ' мл</span>' +
        '<button class="water-del" data-act="water" data-id="' + x.id + '" title="Удалить">×</button>' +
      '</div>'
    ).join('') + '</div>';
  }
  box.innerHTML = html;
}

function renderMeals() {
  const foods = (state.days[viewDate] || {}).foods || [];
  const box = el('#mealList');
  if (!foods.length) {
    box.innerHTML = '<div class="empty">Пока ничего не добавлено.<br>Воспользуйтесь быстрыми кнопками или формой выше</div>';
    return;
  }
  box.innerHTML = MEALS.map((m) => {
    const items = foods.filter((f) => f.meal === m.id);
    if (!items.length) return '';
    const sub = Math.round(items.reduce((s, f) => s + (+f.kcal || 0), 0));
    return '<div class="meal">' +
      '<div class="meal-head">' +
        '<span class="meal-ico">' + m.svg + '</span>' +
        '<span class="meal-label">' + m.label + '</span>' +
        '<span class="meal-sub">' + sub + '</span>' +
        '<span class="meal-spacer"></span>' +
      '</div>' +
      items.map((f) =>
        '<div class="entry">' +
        '<span class="entry-time">' + escapeHtml(f.time || '') + '</span>' +
        '<span class="entry-name">' + escapeHtml(f.name) + (f.g ? ' <small>' + f.g + ' г</small>' : '') + '</span>' +
        '<span class="entry-kcal">' + Math.round(f.kcal) + '</span>' +
        '<button class="del" data-act="food" data-id="' + f.id + '" title="Удалить">×</button>' +
        '</div>'
      ).join('') +
      '</div>';
  }).join('');
}

/* ---------- Вода: действия ---------- */

function addWater(ml) {
  day(viewDate, true).water.push({ id: uid(), ml, time: nowTime() });
  saveState();
  renderDiary();
  toast('+' + ml + ' мл');
}

/* ---------- Еда: форма, подсказки, быстрые кнопки ---------- */

function closeSuggest() {
  el('#suggestBox').classList.remove('open');
}

function renderSuggest() {
  const q = el('#foodName').value.trim().toLowerCase();
  const box = el('#suggestBox');
  if (q.length < 2) { closeSuggest(); box.innerHTML = ''; return; }
  const db = getFoodDB();
  const hits = db.filter((f) => f.name.toLowerCase().includes(q)).slice(0, 8);
  if (!hits.length) {
    box.innerHTML = '<div class="suggest-empty">В базе не найдено — добавьте продукт во вкладке «Продукты» или заполните вручную.</div>';
  } else {
    box.innerHTML = hits.map((f) =>
      '<div class="suggest-item" data-i="' + db.indexOf(f) + '">' +
      '<span>' + escapeHtml(f.name) + '</span><small>' + f.kcal + ' ккал / 100 г</small></div>'
    ).join('');
  }
  box.classList.add('open');
}

function pickFood(item) {
  activeFood = item;
  el('#foodName').value = item.name;
  el('#suggestBox').innerHTML = '';
  closeSuggest();
  if (!el('#foodGrams').value) el('#foodGrams').value = 100;
  // поля КБЖУ всегда показывают значения НА 100 г; на вес умножаем при сохранении
  el('#foodKcal').value = item.kcal;
  el('#foodP').value = item.p;
  el('#foodF').value = item.f;
  el('#foodC').value = item.c;
  el('#foodGrams').focus();
  updateAddBtn();
}

// Кнопка «Добавить в дневник» — акцент (класс ready) только когда форма заполнена:
// есть название и валидная калорийность (на 100 г; 0 допустим).
// «Отмена» видна, когда в форме есть хоть что-то — есть что отменять.
function updateAddBtn() {
  const b = el('#addFoodBtn');
  if (!b) return;
  const name = el('#foodName').value.trim();
  const kcal = parseFloat(el('#foodKcal').value);
  b.classList.toggle('ready', !!name && isFinite(kcal) && kcal >= 0);
  const dirty = ['foodName', 'foodGrams', 'foodKcal', 'foodP', 'foodF', 'foodC'].some((id) => el('#' + id).value !== '');
  const c = el('#cancelFoodBtn');
  if (c) c.hidden = !dirty;
}

// Отмена ввода: очистить форму, погасить кнопку добавления, вернуться к пустому состоянию
function cancelFoodForm() {
  ['foodName', 'foodGrams', 'foodKcal', 'foodP', 'foodF', 'foodC'].forEach((id) => { el('#' + id).value = ''; });
  activeFood = null;
  closeSuggest();
  updateAddBtn();
  el('#foodName').focus();
}

function buildChips() {
  el('#quickChips').innerHTML = state.settings.quick.map((it, i) => {
    if (!it) return '<button type="button" class="chip empty" data-chip="' + i + '" title="Сохранить свой продукт">+</button>';
    const colors = it.bg ? ' style="background:' + it.bg + ';color:' + (it.fg || 'var(--text)') + '"' : '';
    return '<button type="button" class="chip saved' + (it.bg ? ' custom' : '') + '" data-chip="' + i + '" title="' + escapeHtml(it.name) + ' · ' + it.kcal + ' ккал/100 г"' + colors + '>' +
      '<span class="chip-name">' + escapeHtml(it.name) + '</span>' +
      '<span class="chip-sub">' + it.kcal + ' ккал</span>' +
      '<i class="chip-edit" data-edit="' + i + '" title="Изменить">✎</i>' +
    '</button>';
  }).join('');
}

/* ---------- Диалоги быстрых продуктов ---------- */
function qdOverlay(html) {
  const old = document.querySelector('.qd-overlay');
  if (old) old.remove();
  const ov = document.createElement('div');
  ov.className = 'qd-overlay';
  ov.innerHTML = '<div class="card qd-card">' + html + '</div>';
  document.body.appendChild(ov);
  ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
  return ov;
}

// Клик по сохранённому продукту: спросить вес и добавить в дневник
function quickGramsDialog(i) {
  const it = state.settings.quick[i];
  const ov = qdOverlay(
    '<div class="qd-head">' +
      '<span class="qd-plate">' + icoWrap('utensils') + '</span>' +
      '<div class="qd-head-text">' +
        '<div class="qd-name">' + escapeHtml(it.name) + '</div>' +
        '<div class="qd-macros">' + it.kcal + ' ккал / 100 г · Б ' + it.p + ' · Ж ' + it.f + ' · У ' + it.c + '</div>' +
      '</div>' +
    '</div>' +
    '<div class="qd-sec">Вес, г</div>' +
    '<div class="qd-weight">' +
      '<button type="button" class="qd-step" data-step="-10" aria-label="Меньше">−</button>' +
      '<input id="qdGrams" type="number" min="1" step="1" value="100" inputmode="numeric">' +
      '<button type="button" class="qd-step" data-step="10" aria-label="Больше">+</button>' +
    '</div>' +
    '<div class="qd-quick-g">' +
      ['50', '100', '150', '200', '250'].map((g) => '<button type="button" data-g="' + g + '">' + g + '</button>').join('') +
    '</div>' +
    '<div class="qd-sec">Приём пищи</div>' +
    '<div class="meal-picker" id="qdMealPicker"></div>' +
    '<input type="hidden" id="qdMeal" value="' + (el('#foodMeal') ? el('#foodMeal').value : 'lunch') + '">' +
    '<button class="btn primary qd-add" data-act="add">Добавить</button>' +
    '<button type="button" class="qd-cancel" data-act="cancel">Отмена</button>');
  const input = ov.querySelector('#qdGrams');
  buildMealPicker(ov.querySelector('#qdMealPicker'), ov.querySelector('#qdMeal'));
  ov.querySelectorAll('.qd-step').forEach((b) => b.addEventListener('click', () => {
    const v = Math.max(1, Math.round((+input.value || 0) + (+b.dataset.step)));
    input.value = v; input.focus();
  }));
  ov.querySelectorAll('.qd-quick-g button').forEach((b) => b.addEventListener('click', () => {
    input.value = b.dataset.g; input.focus();
  }));
  input.focus(); input.select();
  const add = () => {
    const g = Math.round(+input.value);
    if (!g || g <= 0) { input.focus(); return; }
    const k = g / 100;
    day(viewDate, true).foods.push({
      id: uid(), name: it.name, g: g,
      kcal: Math.round(it.kcal * k),
      p: +((it.p || 0) * k).toFixed(1), f: +((it.f || 0) * k).toFixed(1), c: +((it.c || 0) * k).toFixed(1),
      meal: ov.querySelector('#qdMeal').value, time: nowTime(),
    });
    saveState(); renderDiary(); ov.remove();
    toast('+ ' + it.name + ' · ' + g + ' г · ' + Math.round(it.kcal * k) + ' ккал');
  };
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); add(); }
    if (e.key === 'Escape') { e.preventDefault(); ov.remove(); }
  });
  ov.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'add') add();
    else ov.remove();
  });
}

// Пустая ячейка или ✎: задать/изменить продукт ячейки
function quickEditDialog(i) {
  const cur = state.settings.quick[i];
  const num = (id, label, val, step) =>
    '<label>' + label + '<input id="' + id + '" type="number" min="0" step="' + step + '" value="' + (val !== undefined && val !== null ? val : '') + '"></label>';
  // стартовые цвета пипеток — текущие стандартные темы (по живому чипу) или свои
  const probe = document.querySelector('.chip.empty') || document.querySelector('.chip');
  const cs = probe ? getComputedStyle(probe) : null;
  const defBg = cs ? rgbToHex(cs.backgroundColor) : '#2b3130';
  const defFg = cs ? rgbToHex(cs.color) : '#e8e6e3';
  const ov = qdOverlay(
    '<h3 class="card-title">✏️ ' + (cur ? 'Изменить продукт' : 'Ячейка ' + (i + 1) + ' из 20') + '</h3>' +
    '<div class="food-grid">' +
      '<label class="span2">Название (на 100 г)<input id="qeName" type="text" maxlength="40" value="' + (cur ? escapeHtml(cur.name) : '') + '"></label>' +
      num('qeKcal', 'Ккал', cur ? cur.kcal : '', '1') +
      num('qeP', 'Белки', cur ? cur.p : '', '0.1') +
      num('qeF', 'Жиры', cur ? cur.f : '', '0.1') +
      num('qeC', 'Углеводы', cur ? cur.c : '', '0.1') +
      '<label>Цвет ячейки<input id="qeBg" type="color" value="' + (cur && cur.bg ? cur.bg : defBg) + '"></label>' +
      '<label>Цвет текста<input id="qeFg" type="color" value="' + (cur && cur.fg ? cur.fg : defFg) + '"></label>' +
      '<label class="span2" style="display:flex;align-items:center;gap:8px;flex-direction:row">' +
        '<input id="qeCustomColors" type="checkbox" ' + (cur && cur.bg ? 'checked' : '') + ' style="width:auto">' +
        'Свои цвета ячейки</label>' +
      '<div class="span2 qe-preview-wrap">Предпросмотр: <div id="qePreview" class="chip saved"><span class="chip-name"></span><span class="chip-sub"></span></div></div>' +
    '</div>' +
    '<div class="btn-row" style="margin-top:12px">' +
      (cur ? '<button class="btn danger" data-act="del">Очистить ячейку</button>' : '') +
      '<button class="btn" data-act="cancel">Отмена</button>' +
      '<button class="btn primary" data-act="save">Сохранить</button>' +
    '</div>');
  const nameIn = ov.querySelector('#qeName');
  const cbColors = ov.querySelector('#qeCustomColors');
  const bgIn = ov.querySelector('#qeBg');
  const fgIn = ov.querySelector('#qeFg');
  [bgIn, fgIn].forEach((inp) => { inp.disabled = !cbColors.checked; });
  cbColors.addEventListener('change', () => {
    bgIn.disabled = !cbColors.checked;
    fgIn.disabled = !cbColors.checked;
    updatePreview();
  });

  // Живой предпросмотр: плитка в диалоге + сама ячейка в сетке перекрашиваются сразу
  function updatePreview() {
    const useColors = cbColors.checked;
    const name = nameIn.value.trim() || 'Продукт';
    const kcal = ov.querySelector('#qeKcal').value || '0';
    const bg = useColors ? bgIn.value : null;
    const fg = useColors ? fgIn.value : null;
    // плитка-образец в диалоге
    const pv = ov.querySelector('#qePreview');
    pv.querySelector('.chip-name').textContent = name;
    pv.querySelector('.chip-sub').textContent = kcal + ' ккал';
    if (bg) {
      pv.style.background = bg;
      pv.style.color = fg || 'var(--text)';
      pv.classList.add('custom');
    } else {
      pv.style.background = '';
      pv.style.color = '';
      pv.classList.remove('custom');
    }
    // и ячейка в сетке позади диалога — сразу видно результат
    const chipEl = document.querySelector('#quickChips .chip[data-chip="' + i + '"]');
    if (chipEl && chipEl.classList.contains('saved')) {
      if (bg) {
        chipEl.style.background = bg;
        chipEl.style.color = fg || 'var(--text)';
        chipEl.classList.add('custom');
      } else {
        chipEl.style.background = '';
        chipEl.style.color = '';
        chipEl.classList.remove('custom');
      }
    }
  }
  [nameIn, ov.querySelector('#qeKcal'), bgIn, fgIn].forEach((inp) => {
    inp.addEventListener('input', updatePreview);
  });
  updatePreview();

  // отмена — вернуть ячейке сохранённые цвета
  const cancelPreview = () => buildChips();
  nameIn.focus();
  const save = () => {
    const name = nameIn.value.trim();
    const kcal = +ov.querySelector('#qeKcal').value;
    if (!name || !(kcal >= 0)) { nameIn.focus(); return; }
    const useColors = cbColors.checked;
    state.settings.quick[i] = {
      name: name,
      kcal: Math.round(kcal),
      p: +(+ov.querySelector('#qeP').value || 0).toFixed(1),
      f: +(+ov.querySelector('#qeF').value || 0).toFixed(1),
      c: +(+ov.querySelector('#qeC').value || 0).toFixed(1),
      bg: useColors ? ov.querySelector('#qeBg').value : null,
      fg: useColors ? ov.querySelector('#qeFg').value : null,
    };
    saveState(); buildChips(); ov.remove();
    toast('Ячейка ' + (i + 1) + ': ' + name);
  };
  nameIn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
    if (e.key === 'Escape') { e.preventDefault(); cancelPreview(); ov.remove(); }
  });
  ov.addEventListener('click', (e) => {
    if (e.target === ov) { cancelPreview(); }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    if (act.dataset.act === 'save') save();
    else if (act.dataset.act === 'del') {
      state.settings.quick[i] = null;
      saveState(); buildChips(); ov.remove();
      toast('Ячейка ' + (i + 1) + ' очищена');
    } else { cancelPreview(); ov.remove(); }
  });
}

// rgb(43, 49, 48) → #2b3130 (для стартовых значений пипеток)
function rgbToHex(rgb) {
  const m = /(\d+)[, ]+(\d+)[, ]+(\d+)/.exec(rgb || '');
  if (!m) return '#2b3130';
  return '#' + [1, 2, 3].map((j) => (+m[j]).toString(16).padStart(2, '0')).join('');
}

/* ---------- История ---------- */

function renderHistory() {
  const box = el('#historyBox');
  const today = todayISO();
  const rows = [];
  for (let i = 0; i < 14; i++) {
    const d = shiftISO(today, -i);
    const t = dayTotals(d);
    if (i === 0 || t.kcal > 0 || t.water > 0) rows.push({ d, t });
  }

  if (rows.length === 1 && rows[0].t.kcal === 0 && rows[0].t.water === 0) {
    box.innerHTML = '<div class="empty">История появится после первых записей</div>';
    return;
  }

  const kg = state.settings.calorieGoal;
  const wg = state.settings.waterGoal;
  const last7 = rows.slice(0, 7).filter((r) => r.t.kcal > 0 || r.t.water > 0);
  const kAvg = last7.length ? Math.round(last7.reduce((s, r) => s + r.t.kcal, 0) / last7.length) : 0;
  const wAvg = last7.length ? Math.round(last7.reduce((s, r) => s + r.t.water, 0) / last7.length) : 0;

  const label = (d) =>
    d === today ? 'Сегодня' : d === shiftISO(today, -1) ? 'Вчера' : fmtShort.format(fromISO(d));

  box.innerHTML =
    '<div class="h-summary">В среднем за ' + last7.length + ' дн.: ' +
    '<b class="kcal">' + kAvg.toLocaleString('ru-RU') + ' ккал</b> · ' +
    '<b class="water">' + wAvg.toLocaleString('ru-RU') + ' мл</b> воды</div>' +
    rows.map((r) =>
      '<div class="h-row' + (r.d === viewDate ? ' cur' : '') + '" data-date="' + r.d + '">' +
      '<span class="h-date">' + label(r.d) + '</span>' +
      '<div class="h-metric">' +
        '<span class="h-num kcal' + (r.t.kcal > kg ? ' bad' : '') + '">' + Math.round(r.t.kcal).toLocaleString('ru-RU') + '</span>' +
        '<div class="h-bar"><div class="h-fill kcal" style="width:' + Math.min(100, kg ? r.t.kcal / kg * 100 : 0).toFixed(1) + '%"></div></div>' +
      '</div>' +
      '<div class="h-metric">' +
        '<span class="h-num water">' + Math.round(r.t.water).toLocaleString('ru-RU') + '</span>' +
        '<div class="h-bar"><div class="h-fill water" style="width:' + Math.min(100, wg ? r.t.water / wg * 100 : 0).toFixed(1) + '%"></div></div>' +
      '</div>' +
      '</div>'
    ).join('');
}

/* ---------- Настройки ---------- */

function renderSettings() {
  const s = state.settings;
  el('#inGender').value = s.profile.gender;
  el('#inAge').value = s.profile.age;
  el('#inHeight').value = s.profile.height;
  el('#inWeight').value = s.profile.weight;
  el('#inActivity').value = String(s.profile.activity);
  el('#inAim').value = s.profile.aim;
  el('#inKcalGoal').value = s.calorieGoal;
  el('#inWaterGoal').value = s.waterGoal;
  el('#inFastBanner').checked = s.showFast !== false;
}

function readProfile() {
  const age = +el('#inAge').value;
  const height = +el('#inHeight').value;
  const weight = +el('#inWeight').value;
  if (!(age >= 10 && age <= 100) || !(height >= 120 && height <= 230) || !(weight >= 30 && weight <= 300)) {
    return null;
  }
  return {
    gender: el('#inGender').value,
    age, height, weight,
    activity: +el('#inActivity').value,
    aim: el('#inAim').value,
  };
}

function calcTargetKcal(p) {
  // Миффлин — Сан Жеор
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.gender === 'female' ? -161 : 5);
  const aimFactor = p.aim === 'lose' ? 0.85 : p.aim === 'gain' ? 1.15 : 1;
  return bmr * p.activity * aimFactor;
}

/* ---------- Вкладки ---------- */

function activateTab(name) {
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.view').forEach((v) => v.classList.toggle('hidden', v.id !== 'view-' + name));
  if (name === 'diary') renderDiary();
  if (name === 'history') renderHistory();
  if (name === 'products') renderProducts();
  if (name === 'settings') renderSettings();
}

/* ---------- База продуктов: просмотр, правка, пополнение ---------- */
function renderProducts() {
  const q = (el('#dbSearch').value || '').trim().toLowerCase();
  const db = getFoodDB();
  const list = q ? db.filter((f) => f.name.toLowerCase().includes(q)) : db;
  el('#dbList').innerHTML = list.length
    ? list.map((f) => {
        const i = db.indexOf(f);
        const badge = f.custom
          ? '<span class="db-badge custom">custom</span>'
          : (f.edited ? '<span class="db-badge edited">edited</span>' : '');
        return '<div class="db-row">' +
          '<span class="db-name">' + escapeHtml(f.name) + badge + '</span>' +
          '<span class="db-kbzhu">' + f.kcal + ' kcal · P ' + f.p + ' / F ' + f.f + ' / C ' + f.c + '</span>' +
          '<button type="button" class="db-edit" data-i="' + i + '" title="Edit">✎</button>' +
        '</div>';
      }).join('')
    : '<div class="empty">Nothing found 🔍</div>';
}

// Диалог правки/добавления продукта (на 100 г). idx = индекс в getFoodDB() или null для нового
function dbEditDialog(idx) {
  const db = getFoodDB();
  const cur = idx !== null && idx !== undefined ? db[idx] : null;
  const isCustom = !!(cur && cur.custom);
  const origName = cur ? cur.name : '';
  const num = (id, label, val, step) =>
    '<label>' + label + '<input id="' + id + '" type="number" min="0" step="' + step + '" value="' + (val !== undefined && val !== null ? val : '') + '"></label>';
  const ov = qdOverlay(
    '<h3 class="card-title">' + (cur ? '✏️ ' + escapeHtml(cur.name) : '➕ Новый продукт') + '</h3>' +
    '<div class="food-grid">' +
      '<label class="span2">Название<input id="dbeName" type="text" maxlength="40" value="' + (cur ? escapeHtml(cur.name) : '') + '"></label>' +
      num('dbeKcal', 'Ккал', cur ? cur.kcal : '', '1') +
      num('dbeP', 'Белки', cur ? cur.p : '', '0.1') +
      num('dbeF', 'Жиры', cur ? cur.f : '', '0.1') +
      num('dbeC', 'Углеводы', cur ? cur.c : '', '0.1') +
    '</div>' +
    '<div class="btn-row" style="margin-top:12px">' +
      (cur && !isCustom && state.settings.dbOver[origName] ? '<button class="btn" data-act="reset">Сбросить правку</button>' : '') +
      '<button class="btn danger" data-act="del">Удалить</button>' +
      '<button class="btn" data-act="clear">Очистить</button>' +
      '<button class="btn" data-act="cancel">Отмена</button>' +
      '<button class="btn primary" data-act="save">Сохранить</button>' +
    '</div>');
  const nameIn = ov.querySelector('#dbeName');
  nameIn.focus();
  const save = () => {
    const name = nameIn.value.trim();
    const kcal = +ov.querySelector('#dbeKcal').value;
    if (!name || !(kcal >= 0)) { nameIn.focus(); return; }
    const vals = {
      kcal: Math.round(kcal),
      p: +(+ov.querySelector('#dbeP').value || 0).toFixed(1),
      f: +(+ov.querySelector('#dbeF').value || 0).toFixed(1),
      c: +(+ov.querySelector('#dbeC').value || 0).toFixed(1),
    };
    if (cur && isCustom) {
      // правка своего продукта
      const row = state.settings.dbCustom.find((x) => x.name === origName);
      if (row) { row.name = name; Object.assign(row, vals); }
    } else if (cur) {
      // правка базового продукта: под оригинальным именем (ключ правки не меняется)
      state.settings.dbOver[origName] = vals;
    } else {
      // новый продукт
      if (getFoodDB().some((f) => f.name.toLowerCase() === name.toLowerCase())) {
        toast('Такой продукт уже есть в базе'); return;
      }
      state.settings.dbCustom.push(Object.assign({ name: name }, vals));
    }
    saveState(); renderProducts(); ov.remove();
    toast('База обновлена: ' + name);
  };
  nameIn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); save(); }
    if (e.key === 'Escape') { e.preventDefault(); ov.remove(); }
  });
  ov.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]');
    if (e.target === ov) { ov.remove(); return; }
    if (!act) return;
    if (act.dataset.act === 'save') save();
    else if (act.dataset.act === 'clear') {
      // очистить поля карточки для ввода заново
      ['dbeName', 'dbeKcal', 'dbeP', 'dbeF', 'dbeC'].forEach((id) => { ov.querySelector('#' + id).value = ''; });
      nameIn.focus();
    }
    else if (act.dataset.act === 'del') {
      if (isCustom) {
        state.settings.dbCustom = state.settings.dbCustom.filter((x) => x.name !== origName);
        saveState(); renderProducts(); ov.remove();
        toast('Продукт удалён из базы');
      } else {
        // базовый продукт — убираем из базы насовсем (без восстановления)
        state.settings.dbHidden = (state.settings.dbHidden || []).concat([origName]);
        delete state.settings.dbOver[origName]; // правка больше не нужна
        saveState(); renderProducts(); ov.remove();
        toast('«' + origName + '» удалён из базы');
      }
    } else if (act.dataset.act === 'reset') {
      delete state.settings.dbOver[origName];
      saveState(); renderProducts(); ov.remove();
      toast('Правка сброшена — значения из базовой базы');
    } else ov.remove();
  });
}

/* ---------- Инициализация и обработчики ---------- */

function init() {
  // Селекты
  el('#inActivity').innerHTML = ACTIVITY.map((a) => '<option value="' + a.v + '">' + a.label + '</option>').join('');
  el('#inAim').innerHTML = AIM.map((a) => '<option value="' + a.v + '">' + a.label + '</option>').join('');

  // Монохромные иконки в статичной разметке: <span class="ic" data-ico="имя"></span>
  document.querySelectorAll('[data-ico]').forEach((s) => {
    if (ICONS[s.dataset.ico]) s.innerHTML = ICONS[s.dataset.ico];
  });

  // Кнопка синхронизации в карточке аккаунта
  var ccSyncBtn = document.getElementById('ccSyncBtn');
  if (ccSyncBtn) ccSyncBtn.addEventListener('click', ccSyncNow);

  // Приём пищи по умолчанию — по времени суток; переключатель с монохромными иконками
  const h = new Date().getHours();
  el('#foodMeal').value = h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snack';
  buildMealPicker(el('#mealPicker'), el('#foodMeal'));

  // Вкладки
  document.querySelectorAll('.tab').forEach((t) =>
    t.addEventListener('click', () => activateTab(t.dataset.tab)));

  // База продуктов: поиск, добавление, правка
  el('#dbSearch').addEventListener('input', renderProducts);
  el('#dbAddBtn').addEventListener('click', () => dbEditDialog(null));
  el('#dbList').addEventListener('click', (e) => {
    const b = e.target.closest('.db-edit');
    if (b) dbEditDialog(+b.dataset.i);
  });

  // Тема
  applyTheme(document.documentElement.dataset.theme || 'light');
  el('#themeBtn').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    state.settings.theme = next;
    saveState();
    applyTheme(next);
  });

  // Навигация по датам
  el('#prevDay').addEventListener('click', () => { viewDate = shiftISO(viewDate, -1); renderDiary(); });
  el('#nextDay').addEventListener('click', () => {
    if (viewDate < todayISO()) { viewDate = shiftISO(viewDate, 1); renderDiary(); }
  });

  // Вода
  // вода в кнопках быстрых объёмов: уровень пропорционален значению, волнистая поверхность
  document.querySelectorAll('.water-quick').forEach((b) => {
    const lvl = +b.dataset.ml >= 500 ? 64 : +b.dataset.ml >= 330 ? 46 : 30;
    const w = document.createElement('span');
    w.className = 'wq-water';
    w.style.setProperty('--lvl', lvl + '%');
    w.innerHTML = '<svg class="wq-wave" viewBox="0 0 120 8" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="M0 8 V4 Q7.5 0 15 4 T30 4 T45 4 T60 4 T75 4 T90 4 T105 4 T120 4 V8 Z"/>' +
      '<path class="wq-crest" d="M0 4 Q7.5 0 15 4 T30 4 T45 4 T60 4 T75 4 T90 4 T105 4 T120 4" fill="none"/>' +
      '</svg><span class="wq-body"></span>';
    b.appendChild(w);
  });
  document.querySelectorAll('.water-quick').forEach((b) =>
    b.addEventListener('click', () => addWater(+b.dataset.ml)));
  el('#waterForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const v = parseFloat(el('#waterInput').value);
    if (v > 0) { addWater(Math.round(v)); el('#waterInput').value = ''; }
  });

  // Быстрые продукты (20 своих ячеек): клик — добавить с весом, ✎ — изменить, пустая — заполнить
  buildChips();
  el('#quickChips').addEventListener('click', (e) => {
    const edit = e.target.closest('.chip-edit');
    if (edit) { quickEditDialog(+edit.dataset.edit); return; }
    const b = e.target.closest('.chip');
    if (!b) return;
    const i = +b.dataset.chip;
    if (state.settings.quick[i]) quickGramsDialog(i);
    else quickEditDialog(i);
  });

  // Подсказки по базе
  el('#foodName').addEventListener('input', () => { activeFood = null; renderSuggest(); });
  el('#foodForm').addEventListener('input', updateAddBtn);
  el('#cancelFoodBtn').addEventListener('click', cancelFoodForm);
  updateAddBtn();
  el('#suggestBox').addEventListener('click', (e) => {
    const it = e.target.closest('.suggest-item');
    if (it) pickFood(getFoodDB()[+it.dataset.i]);
  });
  el('#foodGrams').addEventListener('input', () => {}); // граммы не пересчитывают поля — умножение при сохранении

  // Добавление еды вручную
  el('#foodForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = el('#foodName').value.trim();
    const kcal100 = parseFloat(el('#foodKcal').value); // калории НА 100 г
    if (!name) { toast('Укажите название продукта'); el('#foodName').focus(); return; }
    if (!isFinite(kcal100) || kcal100 < 0) { toast('Укажите калорийность (на 100 г)'); el('#foodKcal').focus(); return; }
    const g = parseFloat(el('#foodGrams').value);
    const hasG = isFinite(g) && g > 0;
    const k = hasG ? g / 100 : 1; // без веса — считаем, что введено итоговое значение на порцию
    const p100 = num(el('#foodP')), f100 = num(el('#foodF')), c100 = num(el('#foodC'));
    // новый продукт — автоматически сохраняем в базу «Продукты» (значения на 100 г)
    const inBase = getFoodDB().some((f) => f.name.toLowerCase() === name.toLowerCase());
    if (!inBase) {
      state.settings.dbCustom.push({
        name: name,
        kcal: Math.round(kcal100),
        p: +(p100 || 0).toFixed(1), f: +(f100 || 0).toFixed(1), c: +(c100 || 0).toFixed(1),
      });
    }
    const totalKcal = Math.round(kcal100 * k * 10) / 10;
    day(viewDate, true).foods.push({
      id: uid(),
      name,
      g: hasG ? Math.round(g) : null,
      kcal: totalKcal,
      p: +(p100 * k).toFixed(1), f: +(f100 * k).toFixed(1), c: +(c100 * k).toFixed(1),
      meal: el('#foodMeal').value, time: nowTime(),
    });
    saveState();
    renderDiary();
    toast('Добавлено: ' + name + (hasG ? ' · ' + Math.round(g) + ' г' : '') + ' · ' + Math.round(totalKcal) + ' ккал' + (!inBase ? ' · сохранён в базе' : ''));
    ['foodName', 'foodGrams', 'foodKcal', 'foodP', 'foodF', 'foodC'].forEach((id) => { el('#' + id).value = ''; });
    activeFood = null;
    closeSuggest();
    updateAddBtn();
  });

  // Удаление записей и закрытие подсказок (делегирование)
  document.addEventListener('click', (e) => {
    // сворачивание/разворачивание лога воды — до общего блока: он делает return для любых [data-act]
    const wlToggle = e.target.closest('[data-act="toggle-water-log"]');
    if (wlToggle) {
      waterLogExpanded = !waterLogExpanded;
      renderWaterLog();
      return;
    }
    const act = e.target.closest('[data-act]');
    if (act) {
      const d = state.days[viewDate];
      if (!d) return;
      if (act.dataset.act === 'food') d.foods = d.foods.filter((f) => f.id !== act.dataset.id);
      else if (act.dataset.act === 'water') d.water = d.water.filter((w) => w.id !== act.dataset.id);
      saveState();
      renderDiary();
      return;
    }
    if (!e.target.closest('.food-name-wrap')) closeSuggest();
  });

  // История: переход к дню
  el('#historyBox').addEventListener('click', (e) => {
    const r = e.target.closest('.h-row');
    if (!r) return;
    viewDate = r.dataset.date;
    activateTab('diary');
  });

  // Профиль: автосохранение
  ['inGender', 'inAge', 'inHeight', 'inWeight', 'inActivity', 'inAim'].forEach((id) =>
    el('#' + id).addEventListener('change', () => {
      const p = readProfile();
      if (p) { state.settings.profile = p; saveState(); }
    }));

  // Цели
  el('#inKcalGoal').addEventListener('change', () => {
    const v = +el('#inKcalGoal').value;
    if (v >= 500 && v <= 8000) {
      state.settings.calorieGoal = Math.round(v);
      saveState(); renderDiary();
      toast('Цель по калориям обновлена');
    } else {
      toast('Введите значение от 500 до 8000 ккал');
      renderSettings();
    }
  });

  el('#inFastBanner').addEventListener('change', () => {
    state.settings.showFast = el('#inFastBanner').checked;
    saveState(); renderDiary();
  });
  el('#inWaterGoal').addEventListener('change', () => {
    const v = +el('#inWaterGoal').value;
    if (v >= 500 && v <= 8000) {
      state.settings.waterGoal = Math.round(v);
      saveState(); renderDiary();
      toast('Цель по воде обновлена');
    } else {
      toast('Введите значение от 500 до 8000 мл');
      renderSettings();
    }
  });

  // Автоматический расчёт целей
  el('#calcKcal').addEventListener('click', () => {
    const p = readProfile();
    if (!p) { toast('Заполните профиль: возраст, рост, вес'); return; }
    state.settings.profile = p;
    const goal = Math.round(calcTargetKcal(p) / 10) * 10;
    state.settings.calorieGoal = goal;
    saveState(); renderSettings(); renderDiary();
    toast('Норма по профилю: ' + goal.toLocaleString('ru-RU') + ' ккал/день');
  });

  el('#calcWater').addEventListener('click', () => {
    const p = readProfile();
    if (!p) { toast('Заполните профиль: возраст, рост, вес'); return; }
    state.settings.profile = p;
    const goal = Math.round((p.weight * 30) / 50) * 50;
    state.settings.waterGoal = goal;
    saveState(); renderSettings(); renderDiary();
    toast('Норма воды: ' + goal.toLocaleString('ru-RU') + ' мл/день');
  });

  // Экспорт / импорт / сброс
  el('#exportBtn').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'calcalk-' + todayISO() + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    toast('Файл с данными сохранён');
  });

  el('#importBtn').addEventListener('click', () => el('#importFile').click());
  el('#importFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || typeof data !== 'object' || !data.days || !data.settings) throw new Error('bad format');
      state = {
        settings: {
          ...DEFAULTS, ...data.settings,
          profile: { ...DEFAULTS.profile, ...(data.settings.profile || {}) },
        },
        days: data.days,
      };
      saveState();
      if (state.settings.theme) applyTheme(state.settings.theme);
      viewDate = todayISO();
      renderDiary();
      renderSettings();
      toast('Данные импортированы');
    } catch (err) {
      toast('Не удалось прочитать файл: ожидается резервная копия КалКалк');
    }
  });

  el('#resetBtn').addEventListener('click', () => {
    if (!confirm('Удалить все записи и настройки? Действие необратимо.')) return;
    localStorage.removeItem(STORE_KEY);
    state = loadState();
    viewDate = todayISO();
    renderDiary();
    renderSettings();
    toast('Все данные удалены');
  });

  // Первый показ
  renderDiary();

  // Синхронизация с общим аккаунтом TODOCITY
  ccStartupSync();
}

/* ===== СИНХРОНИЗАЦИЯ (единый аккаунт с TODOCITY, слот calcalk на сервере) ===== */
var CC_TOKEN_KEY = 'todo-app-v47-token';
var CC_LOGIN_KEY = 'todo-app-v47-login';
var CC_SYNCED_AT = 'calcalk-synced-at';
var CC_API_BASE = (location.host === '104.171.138.209') ? '/api' : 'http://104.171.138.209/api';
var ccPushTimer = null;
var ccSyncing = false;

function ccToken() {
  try { return localStorage.getItem(CC_TOKEN_KEY) || null; } catch (e) { return null; }
}

function ccApi(method, path, body) {
  var headers = {};
  var t = ccToken();
  if (t) headers.Authorization = 'Bearer ' + t;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return fetch(CC_API_BASE + path, {
    method: method, headers: headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  }).then(function (res) {
    return res.json().catch(function () { return {}; }).then(function (data) {
      if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
      return data;
    });
  });
}

// Автоотправка через 1.2с после каждого сохранения (как в TODOCITY)
function ccSchedulePush() {
  if (!ccToken() || ccSyncing) return;
  clearTimeout(ccPushTimer);
  ccPushTimer = setTimeout(function () { ccPush().catch(function () {}); }, 1200);
}

function ccPush() {
  if (!ccToken()) return Promise.resolve();
  return ccApi('PUT', '/state?app=calcalk', state).then(function (res) {
    try { localStorage.setItem(CC_SYNCED_AT, String(res.updated_at || Date.now())); } catch (e) {}
    ccRenderAccount();
  });
}

function ccPull(silent) {
  if (!ccToken()) return Promise.resolve(false);
  return ccApi('GET', '/state?app=calcalk').then(function (data) {
    var last = 0;
    try { last = Number(localStorage.getItem(CC_SYNCED_AT) || 0); } catch (e) {}
    if (data.state && data.updated_at && data.updated_at > last + 1000) {
      ccApply(data.state);
      try { localStorage.setItem(CC_SYNCED_AT, String(data.updated_at)); } catch (e) {}
      if (!silent) toast('Данные загружены с сервера');
      return true;
    }
    if (!silent) toast(data.state ? 'Локальные данные не старше серверных' : 'На сервере пусто — отправим эти данные');
    return false;
  });
}

function ccApply(srv) {
  if (!srv || typeof srv !== 'object' || !srv.days) return;
  ccSyncing = true;
  try {
    state = {
      settings: {
        ...DEFAULTS,
        ...(srv.settings || {}),
        profile: { ...DEFAULTS.profile, ...((srv.settings || {}).profile || {}) },
        quick: normalizeQuick((srv.settings || {}).quick)
      },
      days: srv.days
    };
    var dbSrv = normalizeDb((srv.settings || {}).dbOver, (srv.settings || {}).dbCustom, (srv.settings || {}).dbHidden);
    state.settings.dbOver = dbSrv.dbOver;
    state.settings.dbCustom = dbSrv.dbCustom;
    state.settings.dbHidden = dbSrv.dbHidden;
    saveState(); // флаг ccSyncing не даст тут же отправить обратно
    applyTheme(state.settings.theme || 'light');
    viewDate = todayISO();
    renderDiary();
    renderSettings();
    if (!document.getElementById('view-history').classList.contains('hidden')) renderHistory();
  } finally {
    setTimeout(function () { ccSyncing = false; }, 100);
  }
}

// Старт: сервер новее — тянем его; иначе — поднимаем туда локальные данные
function ccStartupSync() {
  ccRenderAccount();
  if (!ccToken()) return;
  ccPull(true).then(function (pulled) {
    if (!pulled) return ccPush().catch(function () {});
  }).catch(function () { /* офлайн — работаем локально */ });
}

// Кнопка «Синхронизировать» в карточке аккаунта настроек
function ccSyncNow() {
  if (!ccToken()) { toast('Войдите в аккаунт в TODOCITY'); return; }
  ccPull(false).then(function (pulled) {
    if (!pulled) return ccPush();
  }).catch(function (e) { toast('Ошибка синхронизации: ' + e.message); });
}

function ccRenderAccount() {
  var card = document.getElementById('accountCard');
  if (!card) return;
  var login = null, token = null;
  try {
    login = localStorage.getItem(CC_LOGIN_KEY);
    token = localStorage.getItem(CC_TOKEN_KEY);
  } catch (e) {}
  if (!login || !token) { card.style.display = 'none'; return; }
  card.style.display = '';
  document.getElementById('accountName').textContent = login;
  var at = 0;
  try { at = Number(localStorage.getItem(CC_SYNCED_AT) || 0); } catch (e) {}
  var status = document.getElementById('accountSyncStatus');
  if (status) {
    status.textContent = at
      ? 'синхронизировано в ' + new Date(at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
      : 'ещё не синхронизировано';
  }
}

init();
