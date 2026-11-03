'use strict';

// ---------- Хранилище (тот же ключ, что у v1: данные общие, если открыть с того же адреса) ----------
const KEY = 'life-app-v1';
const defaults = () => ({
  settings: { subgroup: 2 },
  tasks: [],      // {id, text, date, done, doneAt}
  homework: [],   // {id, subject, text, due, done}
  notes: {},      // предмет -> текст
  meals: {},      // дата -> {индекс приёма: true}
  water: {},      // дата -> стаканов
  shopping: {},   // "группа:пункт" -> true
  weights: [],    // {date, kg}
  gym: {},        // дата -> {id тренировки -> {индекс упражнения -> {s: [bool], kg}}}
  projects: [],   // {id, name, desc, notes, tasks: [{id, text, due, done}]}
});

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return Object.assign(defaults(), JSON.parse(raw));
  } catch (e) { /* пусто или недоступно */ }
  return defaults();
}

let S = load();

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('Не удалось сохранить данные'); }
}

if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

// ---------- Даты и числа ----------
const DAYS = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const DAYS_IN = ['в понедельник', 'во вторник', 'в среду', 'в четверг', 'в пятницу', 'в субботу', 'в воскресенье'];
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

const pad = n => String(n).padStart(2, '0'); // taste-skill-ignore: часы и даты, не нумерация
const keyOf = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const dow = d => (d.getDay() + 6) % 7; // 0 = Пн
const today = () => keyOf(new Date());
const mondayOf = d => addDays(fromKey(keyOf(d)), -dow(d));
const fmtDate = k => { const d = fromKey(k); return `${d.getDate()} ${MONTHS[d.getMonth()]}`; };
const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const nowMin = () => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); };

function weekOf(d) {
  const diff = Math.round((fromKey(keyOf(d)) - new Date(...WEEK1_MONDAY)) / 864e5);
  return ((Math.floor(diff / 7) % 2) + 2) % 2 + 1;
}

function relDate(k) {
  const now = new Date();
  if (k === keyOf(now)) return 'сегодня';
  if (k === keyOf(addDays(now, 1))) return 'завтра';
  if (k === keyOf(addDays(now, -1))) return 'вчера';
  return `${DAYS_SHORT[dow(fromKey(k))]}, ${fmtDate(k)}`;
}

const NF = new Intl.NumberFormat('ru-RU');
const num = (v, d = 0) => new Intl.NumberFormat('ru-RU', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v);
const plural = (n, [one, few, many]) => {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b === 1) return one;
  if (b >= 2 && b <= 4) return few;
  return many;
};
const WORDS = ['ноль', 'одна', 'две', 'три', 'четыре', 'пять'];

// ---------- Утилиты ----------
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);

const SHORT = {
  [CS]: 'C#', [DM]: 'Дискретка', [MA]: 'Матанализ', [LINAL]: 'Линал', [PHYS]: 'Физика', [TI]: 'Теория инф.',
  [IT]: 'ИТ', [EN]: 'Английский', [HIST]: 'История', [ORG]: 'ОРГ', [PE]: 'Физра',
};
const TYPE_WORD = { 'ЛЕК': 'лекция', 'ПР': 'практика', 'ЛАБ': 'лаба' };

const I = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const ICON = {
  today: I('<path d="M4 10.5 12 4l8 6.5V20H15v-5.5H9V20H4z"/>'),
  study: I('<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H19v13H5.5A1.5 1.5 0 0 0 4 18.5z"/><path d="M4 18.5A1.5 1.5 0 0 0 5.5 20H19v-3"/>'),
  food: I('<path d="M7 4v6.5a2 2 0 0 0 4 0V4M9 12.5V20M17 20V4c-2.2 1.2-3 3.6-3 6.4 0 2.4.9 3.6 3 3.6"/>'),
  gym: I('<path d="M7 7v10M17 7v10M4 9.5v5M20 9.5v5M7 12h10"/>'),
  projects: I('<path d="M4 7.5A1.5 1.5 0 0 1 5.5 6H10l2 2h6.5A1.5 1.5 0 0 1 20 9.5v8a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 17.5z"/>'),
  check: I('<path d="M6 12.5 10 16.5 18 8"/>'),
  x: I('<path d="M7 7l10 10M17 7 7 17"/>'),
  back: I('<path d="M14.5 6l-6 6 6 6"/>'),
  plus: I('<path d="M12 6v12M6 12h12"/>'),
  minus: I('<path d="M6 12h12"/>'),
};
const MARK = '<svg class="mark" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="9" fill="var(--accent-fill)"/><path d="M8.5 10.5l2 2 3.5-4" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 10.5h6.5M10 16h13.5M10 21.5h13.5" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/></svg>';

// ---------- Маршруты и состояние интерфейса ----------
const TABS = [['today', 'Сегодня'], ['study', 'Учёба'], ['food', 'Питание'], ['gym', 'Зал'], ['projects', 'Проекты']];
const ui = { studyWeek: null, studyDay: null, foodDay: null, gymW: null, project: null };

function route() {
  const h = location.hash.slice(1);
  return TABS.some(t => t[0] === h) ? h : 'today';
}

// ---------- Общие куски разметки ----------
function titleRow(h1, sub, right = '', cls = '') {
  return `<div class="title-row"><div class="title-text"><h1 class="${cls}">${h1}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}</div>${right ? `<div class="title-actions">${right}</div>` : ''}</div>`;
}

function panel(span, title, body, { extra = '', cls = '', id = '' } = {}) {
  return `<section class="panel s${span} ${cls}"${id ? ` id="${id}"` : ''}><header><h2>${title}</h2>${extra}</header>${body}</section>`;
}

const chip = (n) => `<span class="count num">${n}</span>`;
const empty = text => `<div class="empty">${text}</div>`;

function item({ done, title, meta = '', end = '', a, id, del, attrs = '', label }) {
  return `<div class="item${done ? ' done' : ''}">
    <button class="tick" data-a="${a}" data-id="${esc(id)}" ${attrs} aria-pressed="${!!done}" aria-label="${esc(label || title)}">${ICON.check}</button>
    <div class="item-body"><div class="item-title">${esc(title)}</div>${meta ? `<div class="item-meta">${meta}</div>` : ''}</div>
    ${end ? `<div class="item-end num">${end}</div>` : ''}
    ${del ? `<button class="icon-btn" data-a="${del}" data-id="${esc(id)}" ${attrs} aria-label="Удалить: ${esc(title)}">${ICON.x}</button>` : ''}
  </div>`;
}

function segmented(items, active, a, label) {
  return `<div class="segmented" role="group" aria-label="${label}">${items.map(([v, text]) =>
    `<button type="button" aria-pressed="${String(v) === String(active)}" data-a="${a}" data-v="${v}">${text}</button>`).join('')}</div>`;
}

function track(value, max) {
  const p = max ? Math.min(100, value / max * 100) : 0;
  return `<div class="track" role="img" aria-label="${num(value)} из ${num(max)}"><span style="width:${p.toFixed(1)}%"></span></div>`;
}

// ---------- Учёба: логика ----------
const bySubgroup = l => !l.sg || l.sg === S.settings.subgroup;

function lessonsFor(date) {
  const d = dow(date);
  if (d === 6) return [];
  return SCHEDULE[weekOf(date)][d].filter(bySubgroup);
}

function lessonStatus(l, isToday) {
  if (!isToday) return '';
  const m = nowMin();
  const [from, to] = SLOTS[l.n].map(toMin);
  if (m >= to) return 'past';
  if (m >= from) return 'now';
  return '';
}

function lessonRows(lessons, isToday) {
  return lessons.map(l => {
    const [from, to] = SLOTS[l.n];
    const st = lessonStatus(l, isToday);
    return `<div class="lesson ${st}">
      <div class="lesson-time num"><span>${from}</span><span>${to}</span></div>
      <div class="lesson-body">
        <div class="lesson-title">${esc(l.subj)}</div>
        <div class="item-meta">${TYPE_WORD[l.type]} · ${esc(l.room)} · ${esc(l.teacher)}</div>
      </div>
      ${st === 'now' ? '<span class="pill accent">идёт</span>' : ''}
    </div>`;
  }).join('');
}

// Лента дня: пары на оси 08:30–17:10, линия «сейчас»
function dayStrip(lessons, isToday) {
  const start = toMin(SLOTS[1][0]), end = toMin(SLOTS[5][1]), span = end - start;
  const pct = m => ((m - start) / span * 100).toFixed(2) + '%';
  const ticks = SLOTS.slice(1).map(([from]) => `<span class="strip-tick num" style="left:${pct(toMin(from))}">${from}</span>`).join('')
    + `<span class="strip-tick end num" style="left:100%">${SLOTS[5][1]}</span>`;
  const blocks = lessons.map(l => {
    const [from, to] = SLOTS[l.n].map(toMin);
    return `<div class="strip-block ${lessonStatus(l, isToday)}" style="left:${pct(from)};width:${((to - from) / span * 100).toFixed(2)}%" title="${esc(l.subj)} · ${esc(l.teacher)}">
      <b>${esc(SHORT[l.subj] || l.subj)}</b><span>${esc(l.room)}</span><span>${TYPE_WORD[l.type]}</span></div>`;
  }).join('');
  const m = nowMin();
  const nowLine = isToday && m >= start && m <= end
    ? `<div class="strip-now" style="left:${pct(m)}"><span class="num">${pad(Math.floor(m / 60))}:${pad(m % 60)}</span></div>` : '';
  const slots = SLOTS.slice(1).map(([from, to]) => `<div class="strip-slot" style="left:${pct(toMin(from))};width:${((toMin(to) - toMin(from)) / span * 100).toFixed(2)}%"></div>`).join('');
  return `<div class="strip" aria-hidden="true"><div class="strip-lane">${slots}${blocks}${nowLine}</div><div class="strip-axis">${ticks}</div></div>`;
}

// ---------- Питание: логика ----------
function mealsFor(dateKey) {
  const d = dow(fromKey(dateKey));
  const eaten = S.meals[dateKey] || {};
  const list = MENU[d].map((code, i) => ({ i, code, slot: MEAL_SLOTS[i], dish: DISHES[code], done: !!eaten[i] }));
  const total = { kcal: sum(list, x => x.dish.kcal), p: sum(list, x => x.dish.p) };
  const eatenList = list.filter(x => x.done);
  const got = { kcal: sum(eatenList, x => x.dish.kcal), p: sum(eatenList, x => x.dish.p) };
  return { list, total, got, gymDay: d in GYM_DAYS };
}

function mealItems(dateKey, withComp = false) {
  const { list, gymDay } = mealsFor(dateKey);
  return list.map(m => item({
    done: m.done, title: m.dish.name, a: 'meal', id: m.i, attrs: `data-date="${dateKey}" data-i="${m.i}"`,
    label: `${m.slot}: ${m.dish.name}`,
    meta: `<span class="code">${m.code}</span>${m.slot}${m.i === 2 && gymDay ? ', сразу после зала' : ''}${withComp ? ` · ${esc(m.dish.comp)}` : ''}`,
    end: `${m.dish.kcal}<small> ккал</small><br>${m.dish.p}<small> г</small>`,
  })).join('');
}

function planRow(label, got, total, unit) {
  const left = total - got;
  return `<div class="plan">
    <div class="plan-top"><span>${label}</span><span class="num"><b>${num(got)}</b> из ${num(total)} ${unit}</span></div>
    ${track(got, total)}
    <div class="plan-ends num"><span>0</span><span>${left > 0 ? `осталось ${num(left)} ${unit}` : 'план выполнен'}</span></div>
  </div>`;
}

// ---------- Зал: логика ----------
const currentWid = () => ui.gymW || GYM_DAYS[dow(new Date())] || nextGymWorkout().wid;

function gymEntry(dateKey, wid, i, create) {
  if (!create) return S.gym[dateKey]?.[wid]?.[i];
  S.gym[dateKey] ??= {};
  S.gym[dateKey][wid] ??= {};
  const w = WORKOUTS.find(x => x.id === wid);
  S.gym[dateKey][wid][i] ??= { s: Array(w.ex[i].sets).fill(false), kg: '' };
  return S.gym[dateKey][wid][i];
}

function workoutProgress(dateKey, wid) {
  const w = WORKOUTS.find(x => x.id === wid);
  const total = sum(w.ex, e => e.sets);
  const done = w.ex.reduce((a, e, i) => a + (gymEntry(dateKey, wid, i)?.s.filter(Boolean).length || 0), 0);
  const exDone = w.ex.filter((e, i) => gymEntry(dateKey, wid, i)?.s.every(Boolean)).length;
  return { done, total, exDone };
}

// последний записанный вес по названию упражнения (до указанной даты)
function lastWeights(beforeKey) {
  const map = {};
  Object.keys(S.gym).filter(k => k < beforeKey).sort().forEach(k => {
    for (const wid in S.gym[k]) {
      const w = WORKOUTS.find(x => x.id === wid);
      if (!w) continue;
      for (const i in S.gym[k][wid]) {
        const e = S.gym[k][wid][i];
        if (e.kg && w.ex[i]) map[w.ex[i].name] = { kg: e.kg, date: k };
      }
    }
  });
  return map;
}

function nextGymWorkout(from = new Date()) {
  for (let n = 0; n < 7; n++) {
    const d = dow(addDays(from, n));
    if (d in GYM_DAYS) return { wid: GYM_DAYS[d], inDays: n, day: d };
  }
}

const restText = s => s >= 120 ? `${num(s / 60, s % 60 ? 1 : 0)} мин` : `${s} с`;

// ---------- Таймер отдыха ----------
const timer = { end: 0, int: null };

function startRest(sec) {
  timer.end = Date.now() + sec * 1000;
  clearInterval(timer.int);
  timer.int = setInterval(tickRest, 250);
  tickRest();
}

function stopRest() {
  clearInterval(timer.int);
  timer.int = null;
  document.getElementById('timer').hidden = true;
}

function tickRest() {
  const el = document.getElementById('timer');
  const left = Math.max(0, Math.ceil((timer.end - Date.now()) / 1000));
  el.hidden = false;
  if (left === 0) {
    clearInterval(timer.int);
    timer.int = null;
    el.classList.add('done');
    el.innerHTML = '<div class="timer-text"><b>Отдых закончен</b><span>Следующий подход</span></div><button class="btn" data-a="restStop">Ок</button>';
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    setTimeout(() => { if (!timer.int) el.hidden = true; }, 6000);
    return;
  }
  el.classList.remove('done');
  el.innerHTML = `<div class="timer-text"><b class="num">${Math.floor(left / 60)}:${pad(left % 60)}</b><span>Отдых между подходами</span></div>
    <button class="btn" data-a="restAdd">+30 с</button><button class="icon-btn" data-a="restStop" aria-label="Остановить таймер">${ICON.x}</button>`;
}

// ---------- «Сегодня» ----------
function viewToday() {
  const now = new Date(); const t = today(); const d = dow(now);
  const lessons = lessonsFor(now);
  const gymWid = GYM_DAYS[d];
  const cook = COOKING[d];
  const meals = mealsFor(t);

  // заголовок собирается из данных дня
  const parts = [lessons.length ? `${WORDS[lessons.length]} ${plural(lessons.length, ['пара', 'пары', 'пар'])}` : 'пар нет'];
  if (gymWid) parts.push('зал');
  if (cook) parts.push('готовка');
  const h1 = `${DAYS[d]}: ${parts.join(', ')}`;

  const m = nowMin();
  const cur = lessons.find(l => lessonStatus(l, true) === 'now');
  const next = lessons.find(l => toMin(SLOTS[l.n][0]) > m);
  let finding;
  if (cur) finding = `Сейчас ${SHORT[cur.subj]} в ${cur.room}, до ${SLOTS[cur.n][1]}`;
  else if (next) finding = `Дальше ${SHORT[next.subj]} в ${SLOTS[next.n][0]}, ${next.room}`;
  else if (lessons.length) finding = `Пары закончились в ${SLOTS[lessons[lessons.length - 1].n][1]}`;
  else {
    const tomorrow = lessonsFor(addDays(now, 1));
    finding = tomorrow.length ? `Завтра первая пара в ${SLOTS[tomorrow[0].n][0]}` : 'Завтра тоже без пар';
  }
  const sub = `${fmtDate(t)}, неделя ${weekOf(now)}. ${finding}.`;

  // задачи: на сегодня и просроченные, плюс выполненные сегодня, домашка до завтра, задачи проектов
  const tasks = S.tasks.filter(x => x.done ? x.doneAt === t : (x.date || t) <= t)
    .sort((a, b) => a.done - b.done || (a.date || '').localeCompare(b.date || ''));
  const tomorrowKey = keyOf(addDays(now, 1));
  const hw = S.homework.filter(h => !h.done && h.due && h.due <= tomorrowKey).sort((a, b) => a.due.localeCompare(b.due));
  const ptasks = [];
  S.projects.forEach(p => p.tasks.forEach(x => { if (!x.done && x.due && x.due <= t) ptasks.push({ p, x }); }));
  const upcoming = S.tasks.filter(x => !x.done && x.date > t).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
  const late = k => k < t ? ' class="late"' : '';
  const openCount = tasks.filter(x => !x.done).length + hw.length + ptasks.length;

  const taskHtml = tasks.map(x => item({ done: x.done, title: x.text, a: 'task', id: x.id, del: 'taskDel',
    meta: !x.done && x.date && x.date < t ? `<span class="late">перенесено с ${relDate(x.date)}</span>` : (x.done ? 'сделано' : 'на сегодня') }))
    .concat(hw.map(h => item({ done: false, title: h.text, a: 'hw', id: h.id,
      meta: `${esc(SHORT[h.subject] || h.subject)}, сдать <span${late(h.due)}>${relDate(h.due)}</span>` })))
    .concat(ptasks.map(({ p, x }) => item({ done: false, title: x.text, a: 'ptask', id: x.id, attrs: `data-p="${p.id}"`,
      meta: `${esc(p.name)}, срок <span${late(x.due)}>${relDate(x.due)}</span>` }))).join('');

  const addTask = `<form class="add" data-f="task">
    <label class="sr" for="task-text">Новая задача</label>
    <input class="input grow" id="task-text" name="text" placeholder="Новая задача" autocomplete="off" required>
    <input class="input date" name="date" type="date" value="${t}" aria-label="Дата задачи">
    <button class="btn round" aria-label="Добавить задачу">${ICON.plus}</button>
  </form>`;

  // тренировка
  let gymBody;
  if (gymWid) {
    const w = WORKOUTS.find(x => x.id === gymWid);
    const pr = workoutProgress(t, gymWid);
    gymBody = `<div class="figure num">${pr.done}<small> из ${pr.total} подходов</small></div>${track(pr.done, pr.total)}
      <ul class="mini">${w.ex.map((e, i) => `<li class="${gymEntry(t, gymWid, i)?.s.every(Boolean) ? 'done' : ''}">${esc(e.name)}</li>`).join('')}</ul>
      <a class="card-link" href="#gym" data-a="openGym" data-v="${gymWid}">Открыть ${w.name.toLowerCase()}</a>`;
  } else {
    const nx = nextGymWorkout(addDays(now, 1));
    const w = WORKOUTS.find(x => x.id === nx.wid);
    gymBody = `<p class="lead">Сегодня отдых. ${w.name} ${nx.inDays === 0 ? 'завтра' : DAYS_IN[nx.day]}.</p>
      <ul class="mini">${w.ex.map(e => `<li>${esc(e.name)} <span class="num">${e.sets} × ${e.reps}</span></li>`).join('')}</ul>
      <a class="card-link" href="#gym" data-a="openGym" data-v="${nx.wid}">Посмотреть программу</a>`;
  }

  // пары
  const lessonsBody = dayStrip(lessons, true) + `<div class="lesson-list">${lessons.length
    ? lessonRows(lessons, true)
    : empty(d === 6 ? 'Воскресенье, пар нет.' : 'Сегодня пар нет.')}</div>`;

  // неделя вперёд: пары, зал и готовка на ближайшие дни, плюс задачи со сроком
  const aheadDays = Math.max(1, 4 - Math.min(tasks.length + hw.length + ptasks.length, 3));
  const ahead = Array.from({ length: aheadDays }, (_, n) => {
    const date = addDays(now, n + 1); const k = keyOf(date); const dd = dow(date);
    const ls = lessonsFor(date);
    const bits = [ls.length ? `<b>${ls.length} ${plural(ls.length, ['пара', 'пары', 'пар'])}</b> с ${SLOTS[ls[0].n][0]}` : 'пар нет'];
    if (GYM_DAYS[dd]) bits.push(WORKOUTS.find(w => w.id === GYM_DAYS[dd]).name.toLowerCase());
    if (COOKING[dd]) bits.push('готовка');
    const due = S.tasks.filter(x => !x.done && x.date === k).length + S.homework.filter(h => !h.done && h.due === k).length
      + sum(S.projects, p => p.tasks.filter(x => !x.done && x.due === k).length);
    if (due) bits.push(`<b>${due} ${plural(due, ['задача', 'задачи', 'задач'])}</b>`);
    return `<div class="ahead-row"><span>${DAYS_SHORT[dd]}, ${date.getDate()}</span><span>${bits.join(', ')}</span></div>`;
  }).join('');

  const water = S.water[t] || 0;
  const cookNote = cook ? `<p class="notice">Вечером ${cook.title.split(' — ')[0].toLowerCase()}, ${cook.forWhat}. <a href="#food">Шаги</a></p>` : '';

  const tiles = `
    <section class="tile s3"><h2 class="tile-label">Пары</h2><div class="tile-value num">${lessons.length}</div>
      <p class="tile-cap">${lessons.length ? `${SLOTS[lessons[0].n][0]}–${SLOTS[lessons[lessons.length - 1].n][1]}` : 'Свободный день'}</p></section>
    <section class="tile s3"><h2 class="tile-label">Калории</h2><div class="tile-value num">${num(meals.got.kcal)}<small> из ${num(meals.total.kcal)}</small></div>
      <p class="tile-cap">${meals.got.kcal < meals.total.kcal ? `осталось ${num(meals.total.kcal - meals.got.kcal)} ккал` : 'план на день выполнен'}</p></section>
    <section class="tile s3"><h2 class="tile-label">Белок</h2><div class="tile-value num">${meals.got.p}<small> из ${meals.total.p} г</small></div>
      <p class="tile-cap">${meals.got.p < meals.total.p ? `осталось ${meals.total.p - meals.got.p} г` : 'белок набран'}</p></section>
    <section class="tile s3 water"><h2 class="tile-label">Вода</h2><div class="tile-value num">${num(water * 0.25, water % 4 === 0 ? 0 : water % 2 === 0 ? 1 : 2)}<small> из 3 л</small></div>
      <div class="tile-cap water-row"><span class="num">${water} ${plural(water, ['стакан', 'стакана', 'стаканов'])}</span>
        <button class="btn round sm" data-a="water" data-v="-1" aria-label="Убрать стакан воды">${ICON.minus}</button>
        <button class="btn round sm" data-a="water" data-v="1" aria-label="Добавить стакан воды">${ICON.plus}</button></div></section>`;

  return titleRow(esc(h1), esc(sub), `<button class="btn primary" data-a="focusTask">Новая задача</button>`, 'greet')
    + `<div class="grid">`
    + tiles
    + panel(9, 'Пары', lessonsBody, { extra: `<span class="meta">${DAYS_SHORT[d]}, неделя ${weekOf(now)}, подгруппа ${S.settings.subgroup}</span>`, cls: 'lessons' })
    + panel(3, 'Тренировка', gymBody, { cls: 'gym-mini' })
    + `<div class="stack s6">`
    + panel(6, 'Задачи', `<div class="items">${taskHtml || empty('На сегодня задач нет.')}</div>` + addTask
      + (upcoming.length ? `<p class="foot">Дальше: ${upcoming.map(x => `${relDate(x.date)}: ${esc(x.text)}`).join('; ')}</p>` : ''),
      { extra: openCount ? chip(openCount) : '', id: 'tasks' })
    + panel(6, 'На неделе', `<div class="ahead">${ahead}</div>`)
    + `</div>`
    + panel(6, 'Питание', cookNote + `<div class="items">${mealItems(t)}</div>`,
      { extra: `<a class="card-link" href="#food">Меню на неделю</a>`, cls: 'stretch' })
    + `</div>`;
}

// ---------- «Учёба» ----------
function studyMonday(week) {
  const now = new Date();
  let monday = mondayOf(now);
  if (dow(now) === 6) monday = addDays(monday, 7);
  if (weekOf(monday) !== week) monday = addDays(monday, 7);
  return monday;
}

function weekMatrix(week, monday) {
  const t = today();
  const days = SCHEDULE[week].map(list => list.filter(bySubgroup));
  const maxSlot = Math.max(4, ...days.flat().map(l => l.n));
  let html = `<div class="week" role="table" aria-label="Расписание, неделя ${week}"><div class="wk-corner" role="columnheader"></div>`;
  days.forEach((_, i) => {
    const k = keyOf(addDays(monday, i));
    html += `<div class="wk-day${k === t ? ' today' : ''}" role="columnheader"><b>${DAYS_SHORT[i]}</b> <span class="num">${addDays(monday, i).getDate()}</span></div>`;
  });
  for (let n = 1; n <= maxSlot; n++) {
    html += `<div class="wk-time num" role="rowheader"><span>${SLOTS[n][0]}</span><span>${SLOTS[n][1]}</span></div>`;
    days.forEach((list, i) => {
      const l = list.find(x => x.n === n);
      const isToday = keyOf(addDays(monday, i)) === t;
      html += l ? `<div class="wk-cell ${lessonStatus(l, isToday)}${isToday ? ' today' : ''}" role="cell" title="${esc(l.subj)} · ${esc(l.teacher)}">
          <b>${esc(SHORT[l.subj])}</b><span>${esc(l.room)}</span><span>${TYPE_WORD[l.type]}</span></div>`
        : `<div class="wk-free${isToday ? ' today' : ''}" role="cell"></div>`;
    });
  }
  return html + '</div>';
}

// кто ведёт каждый предмет у этой подгруппы (из расписания обеих недель)
function teachersList() {
  const by = {};
  [1, 2].forEach(w => SCHEDULE[w].flat().filter(bySubgroup).forEach(l => {
    (by[l.subj] ??= new Set()).add(l.teacher);
  }));
  return `<div class="ledger flush">${SUBJECTS.filter(s => by[s]).map(s => `<div class="ledger-row">
    <span>${esc(SHORT[s])}</span><span class="right">${[...by[s]].map(esc).join(', ')}</span></div>`).join('')}</div>`;
}

function viewStudy() {
  const now = new Date();
  const week = ui.studyWeek ?? weekOf(now);
  const monday = studyMonday(week);
  const day = ui.studyDay ?? (dow(now) === 6 ? 0 : dow(now));
  const date = addDays(monday, day);
  const isToday = keyOf(date) === today();
  const lessons = SCHEDULE[week][day].filter(bySubgroup);
  const weekCount = SCHEDULE[week].flat().filter(bySubgroup).length;

  const t = today();
  const hw = [...S.homework].sort((a, b) => a.done - b.done || (a.due || '9').localeCompare(b.due || '9'));
  const openHw = hw.filter(h => !h.done).length;
  const hwHtml = hw.map(h => item({ done: h.done, title: h.text, a: 'hw', id: h.id, del: 'hwDel',
    meta: `${esc(SHORT[h.subject] || h.subject)}${h.due ? `, сдать <span${!h.done && h.due < t ? ' class="late"' : ''}>${relDate(h.due)}</span>` : ''}` })).join('');

  const hwForm = `<form class="add wrap" data-f="hw">
    <label class="sr" for="hw-subject">Предмет</label>
    <select class="input grow" id="hw-subject" name="subject">${SUBJECTS.map(s => `<option value="${esc(s)}">${esc(SHORT[s])}: ${esc(s)}</option>`).join('')}</select>
    <label class="sr" for="hw-text">Что задали</label>
    <input class="input grow" id="hw-text" name="text" placeholder="Что задали" autocomplete="off" required>
    <input class="input date" name="due" type="date" value="${keyOf(addDays(now, 1))}" aria-label="Срок сдачи">
    <button class="btn round" aria-label="Добавить домашку">${ICON.plus}</button>
  </form>`;

  const notes = SUBJECTS.map(s => `<details class="fold">
    <summary><span>${esc(SHORT[s])}</span><span class="meta">${S.notes[s] ? `${S.notes[s].trim().split(/\s+/).length} сл.` : esc(s)}</span></summary>
    <textarea class="input" data-bind="note" data-k="${esc(s)}" aria-label="Заметки: ${esc(s)}" placeholder="Темы, ссылки, что спросить">${esc(S.notes[s] || '')}</textarea>
  </details>`).join('');

  const nextLesson = lessonsFor(now).find(l => toMin(SLOTS[l.n][0]) > nowMin());
  const sub = `26-ИСбо-2, подгруппа ${S.settings.subgroup}. Сейчас неделя ${weekOf(now)}${nextLesson ? `, дальше ${SHORT[nextLesson.subj]} в ${SLOTS[nextLesson.n][0]}` : ''}.`;

  const dayChips = `<div class="days" role="group" aria-label="День недели">${DAYS_SHORT.slice(0, 6).map((n, i) =>
    `<button type="button" aria-pressed="${i === day}" data-a="studyDay" data-v="${i}">${n}<small class="num">${addDays(monday, i).getDate()}</small></button>`).join('')}</div>`;

  return titleRow('Учёба', esc(sub), segmented([[1, 'Неделя 1'], [2, 'Неделя 2']], week, 'studyWeek', 'Неделя'))
    + `<div class="grid">`
    + panel(12, `Неделя ${week}, с ${fmtDate(keyOf(monday))} по ${fmtDate(keyOf(addDays(monday, 5)))}`,
      weekMatrix(week, monday)
      + `<div class="phone-only">${dayChips}<h3 class="day-title">${DAYS[day]}, ${fmtDate(keyOf(date))}</h3>${lessons.length ? lessonRows(lessons, isToday) : empty('Пар нет.')}</div>`,
      { extra: `<span class="meta num">${weekCount} ${plural(weekCount, ['пара', 'пары', 'пар'])} за неделю</span>` })
    + `<div class="stack s6">`
    + panel(6, 'Домашка', `<div class="items">${hwHtml || empty('Пока ничего не задано.')}</div>` + hwForm,
      { extra: openHw ? chip(openHw) : '' })
    + panel(6, 'Преподаватели', teachersList())
    + `</div>`
    + panel(6, 'Заметки по предметам', `<div class="folds">${notes}</div>`, { cls: 'stretch' })
    + `</div>`;
}

// ---------- «Питание» ----------
function viewFood() {
  const now = new Date(); const t = today();
  const day = ui.foodDay ?? dow(now);
  const dateKey = keyOf(addDays(mondayOf(now), day));
  const isToday = dateKey === t;
  const m = mealsFor(dateKey);
  const todayMeals = mealsFor(t);

  const sub = `Цель ${FOOD_TARGET.kcal} ккал и ${FOOD_TARGET.p} г белка в день. Сегодня съедено ${num(todayMeals.got.kcal)} из ${num(todayMeals.total.kcal)} ккал.`;
  const dayPick = `<div class="days seven" role="group" aria-label="День меню">${DAYS_SHORT.map((n, i) =>
    `<button type="button" aria-pressed="${i === day}" data-a="foodDay" data-v="${i}">${n}${i in GYM_DAYS ? '<small>зал</small>' : '<small>&nbsp;</small>'}</button>`).join('')}</div>`;

  const cook = COOKING[day];
  const dayNotes = [
    m.gymDay ? 'День зала: Экспоненту выпить сразу после тренировки.' : '',
    cook ? `Вечером ${cook.title.split(' — ')[0].toLowerCase()}, ${cook.forWhat}.` : '',
    day === 5 ? 'Свободный ужин — с мясом или рыбой, без картошки фри и сладкой газировки.' : '',
  ].filter(Boolean);

  // вес
  const ws = [...S.weights].sort((a, b) => a.date.localeCompare(b.date));
  const avg = (from, to) => { const xs = ws.filter(w => w.date > from && w.date <= to).map(w => +w.kg); return xs.length ? sum(xs, x => x) / xs.length : null; };
  const a1 = avg(keyOf(addDays(now, -7)), t);
  const a0 = avg(keyOf(addDays(now, -14)), keyOf(addDays(now, -7)));
  const a1r = a1 != null ? Math.round(a1 * 10) / 10 : null, a0r = a0 != null ? Math.round(a0 * 10) / 10 : null;
  const diff = a1r != null && a0r != null ? Math.round((a1r - a0r) * 10) / 10 : null;
  const diffText = diff == null ? '<span class="dash">—</span>' : `<span class="${diff < 0 ? 'pos' : diff > 0 ? 'neg' : ''}">${diff > 0 ? '+' : diff < 0 ? '−' : ''}${num(Math.abs(diff), 1)}</span>`;
  const weightBody = `<div class="kpis">
      <div><div class="tile-label">Среднее за 7 дней</div><div class="kpi-v num">${a1r != null ? num(a1r, 1) : '<span class="dash">—</span>'}<small> кг</small></div></div>
      <div><div class="tile-label">К прошлым 7 дням</div><div class="kpi-v num">${diffText}<small> кг</small></div></div>
    </div>
    <div class="chart-card">${ws.length >= 2 ? '<div id="weight-chart" class="chart"></div>' : '<p class="item-meta">График появится после двух записей. Взвешивайся утром натощак 3 раза в неделю.</p>'}</div>
    <form class="add" data-f="weight">
      <label class="sr" for="w-kg">Вес, кг</label>
      <input class="input grow" id="w-kg" name="kg" type="number" step="0.1" min="30" max="250" inputmode="decimal" placeholder="Вес, кг" required>
      <input class="input date" name="date" type="date" value="${t}" aria-label="Дата взвешивания">
      <button class="btn round" aria-label="Записать вес">${ICON.plus}</button>
    </form>
    ${ws.length ? `<div class="ledger">${ws.slice(-4).reverse().map(w => `<div class="ledger-row"><span>${relDate(w.date)}</span><span class="num">${num(w.kg, 1)} кг</span>
      <button class="icon-btn" data-a="weightDel" data-id="${w.date}" aria-label="Удалить запись ${relDate(w.date)}">${ICON.x}</button></div>`).join('')}</div>` : ''}`;

  const shopDone = Object.values(S.shopping).filter(Boolean).length;
  const shopTotal = sum(SHOPPING, g => g.items.length);
  const shopping = `<div class="shop">${SHOPPING.map((g, gi) => `<div class="shop-group"><h3>${g.group}</h3>${g.items.map((it, ii) => {
    const k = `${gi}:${ii}`;
    return `<button type="button" class="check-line${S.shopping[k] ? ' done' : ''}" data-a="shop" data-id="${k}" aria-pressed="${!!S.shopping[k]}"><span class="tick small">${ICON.check}</span>${esc(it)}</button>`;
  }).join('')}</div>`).join('')}</div>
    <button class="card-link" data-a="shopReset">Снять все отметки</button>`;

  const cooking = [6, 2].map(d => {
    const c = COOKING[d];
    return `<details class="fold"${dow(now) === d ? ' open' : ''}><summary><span>${c.title}</span><span class="meta">${c.forWhat}</span></summary>
      <ol class="steps">${c.steps.map(s => `<li>${esc(s)}</li>`).join('')}</ol></details>`;
  }).join('') + `<ul class="notes-list">${COOKING_TIPS.map(s => `<li>${esc(s)}</li>`).join('')}</ul>`;

  const dishes = `<div class="dishes">${Object.entries(DISHES).map(([code, x]) => `<div class="dish">
    <span class="code">${code}</span><div><b>${esc(x.name)}</b><p>${esc(x.comp)}</p></div><span class="num">${x.kcal}<small> ккал</small><br>${x.p}<small> г</small></span></div>`).join('')}</div>`;

  return titleRow('Питание', esc(sub), '')
    + dayPick
    + `<div class="grid">`
    + panel(9, `${DAYS[day]}${isToday ? ', сегодня' : ''}`,
      `<div class="items">${mealItems(dateKey, true)}</div>`,
      { extra: `<span class="meta num">${num(m.total.kcal)} ккал · ${m.total.p} г белка</span>`, cls: 'stretch' })
    + panel(3, 'Итог дня', planRow('Калории', m.got.kcal, m.total.kcal, 'ккал') + planRow('Белок', m.got.p, m.total.p, 'г')
      + `<div class="well"><div class="well-row"><span>Калории в день</span><span class="num">${FOOD_TARGET.kcal}</span></div>
        <div class="well-row"><span>Белок</span><span class="num">${FOOD_TARGET.p} г</span></div>
        <div class="well-row"><span>Жиры</span><span class="num">${FOOD_TARGET.f} г</span></div>
        <div class="well-row"><span>Углеводы</span><span class="num">${FOOD_TARGET.c} г</span></div>
        <div class="well-row"><span>Вода</span><span class="num">2,5–3 л</span></div></div>`
      + (dayNotes.length ? `<ul class="notes-list">${dayNotes.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''), { cls: 'stretch' })
    + panel(6, 'Вес', weightBody, { cls: 'stretch' })
    + panel(6, 'Готовка', cooking, { cls: 'stretch' })
    + panel(6, 'Покупки на неделю', shopping, { extra: `<span class="count num">${shopDone} из ${shopTotal}</span>`, cls: 'stretch' })
    + panel(6, 'Правила', `<ul class="rules">${FOOD_RULES.map(s => `<li>${esc(s)}</li>`).join('')}</ul>`, { cls: 'stretch' })
    + panel(12, 'Блюда', dishes + `<ul class="notes-list cols">${FOOD_NOTES.map(s => `<li>${esc(s)}</li>`).join('')}</ul>`)
    + `</div>`;
}

function drawWeightChart() {
  const el = document.getElementById('weight-chart');
  if (!el || !window.Charts) return;
  const ws = [...S.weights].sort((a, b) => a.date.localeCompare(b.date)).slice(-20);
  const short = k => { const d = fromKey(k); return `${d.getDate()}.${pad(d.getMonth() + 1)}`; };
  Charts.line(el, {
    labels: ws.map(w => short(w.date)),
    series: [{ name: 'Вес, кг', values: ws.map(w => +w.kg) }],
    format: Charts.fmt.dec(1), height: 160,
    // вес меняется на доли килограмма: шкала от реального минимума, а не от нуля
    min: Math.floor(Math.min(...ws.map(w => +w.kg)) - 1),
  });
}

// три тренировки текущей недели: сделано, сегодня или впереди
function weekWorkouts() {
  const mon = mondayOf(new Date()); const t = today();
  return `<div class="ledger flush">${WORKOUTS.map(w => {
    const k = keyOf(addDays(mon, w.day));
    const pr = workoutProgress(k, w.id);
    const state = pr.done ? `${pr.done} из ${pr.total}` : k > t ? 'впереди' : k === t ? 'сегодня' : 'пропущена';
    return `<div class="ledger-row"><span>${DAYS_SHORT[w.day]}, ${fromKey(k).getDate()}</span><span class="right"><b>${w.name}</b> · <span class="${state === 'пропущена' ? 'late' : ''}">${state}</span></span></div>`;
  }).join('')}</div>`;
}

// ---------- «Зал» ----------
function viewGym() {
  const now = new Date(); const t = today();
  const wid = currentWid();
  const w = WORKOUTS.find(x => x.id === wid);
  const last = lastWeights(t);
  const pr = workoutProgress(t, wid);
  const planned = GYM_DAYS[dow(now)];
  const nx = nextGymWorkout(addDays(now, 1));

  const sub = planned
    ? `Сегодня ${WORKOUTS.find(x => x.id === planned).name.toLowerCase()}. Сделано ${pr.done} из ${pr.total} подходов.`
    : `Сегодня отдых. Дальше ${WORKOUTS.find(x => x.id === nx.wid).name.toLowerCase()} ${nx.inDays === 0 ? 'завтра' : DAYS_IN[nx.day]}.`;

  const ex = w.ex.map((e, i) => {
    const entry = gymEntry(t, wid, i);
    const sets = entry?.s || Array(e.sets).fill(false);
    const prev = last[e.name];
    return `<div class="ex${sets.every(Boolean) ? ' done' : ''}">
      <div class="ex-name"><b>${esc(e.name)}</b>
        <span class="item-meta num">${e.sets} × ${e.reps}, отдых ${restText(e.rest)}${prev ? ` · в прошлый раз ${esc(prev.kg)} кг` : ''}</span></div>
      <div class="ex-ctrl">
        <div class="sets" role="group" aria-label="Подходы: ${esc(e.name)}">${sets.map((s, j) =>
          `<button type="button" class="set num" aria-pressed="${s}" data-a="set" data-i="${i}" data-j="${j}" aria-label="Подход ${j + 1}">${j + 1}</button>`).join('')}</div>
        <label class="kg"><span class="sr">Рабочий вес, кг: ${esc(e.name)}</span>
          <input class="input num" type="number" step="0.5" min="0" inputmode="decimal" data-bind="kg" data-i="${i}" value="${esc(entry?.kg || '')}" placeholder="${prev ? esc(prev.kg) : '—'}"><span>кг</span></label>
      </div>
    </div>`;
  }).join('');

  const history = Object.keys(S.gym).sort().reverse().flatMap(k => Object.keys(S.gym[k]).map(id => ({ k, id })))
    .map(x => ({ ...x, ...workoutProgress(x.k, x.id) })).filter(x => x.done > 0).slice(0, 6);
  const historyHtml = history.length ? `<div class="ledger">${history.map(x => `<div class="ledger-row"><span>${relDate(x.k)}</span>
    <span>${WORKOUTS.find(y => y.id === x.id).name}</span><span class="num">${x.done} из ${x.total}</span></div>`).join('')}</div>`
    : `<p class="item-meta">Записей пока нет. Отметь первый подход, и тренировка появится здесь.</p>`;

  const info = GYM_INFO.map(g => `<details class="fold"><summary><span>${g.title}</span></summary>
    <ul class="notes-list">${g.items.map(s => `<li>${esc(s)}</li>`).join('')}</ul></details>`).join('');

  return titleRow('Зал', esc(sub), segmented(WORKOUTS.map(x => [x.id, `${x.name.replace('Тренировка ', 'Т')}, ${DAYS_SHORT[x.day]}`]), wid, 'gymW', 'Тренировка'))
    + `<div class="grid">`
    + panel(9, `${w.name}${planned === wid ? ', сегодня' : `, ${DAYS_SHORT[w.day].toLowerCase()}`}`, `<div class="exs">${ex}</div>`,
      { extra: `<span class="meta num">${w.ex.length} упражнений · ${pr.total} подходов</span>` })
    + panel(3, 'Сделано за сегодня', `<div class="figure num">${pr.done}<small> из ${pr.total}</small></div>${track(pr.done, pr.total)}
      <p class="item-meta num">Упражнений закончено: ${pr.exDone} из ${w.ex.length}.</p>
      <h3 class="sub-h">Рабочие веса</h3>
      <div class="ledger flush">${w.ex.map((e, i) => {
        const kg = gymEntry(t, wid, i)?.kg || last[e.name]?.kg;
        return `<div class="ledger-row"><span class="grow-name" title="${esc(e.name)}">${esc(e.name)}</span><span class="num">${kg ? `${esc(kg)} кг` : '<span class="dash">—</span>'}</span></div>`;
      }).join('')}</div>
      <ul class="notes-list"><li>Номер подхода запускает отдых.</li><li>Каждые 1–2 недели добавляй вес или повторы.</li><li>Техника ломается, значит вес велик: сбрось его.</li></ul>`, { cls: 'stretch' })
    + panel(6, 'Перед тренировкой', `<div class="folds">${info}</div>`, { cls: 'stretch' })
    + panel(6, 'Эта неделя', weekWorkouts() + `<h3 class="sub-h">История</h3>` + historyHtml, { cls: 'stretch' })
    + `</div>`;
}

// ---------- «Проекты» ----------
function viewProjects() {
  if (ui.project) {
    const p = S.projects.find(x => x.id === ui.project);
    if (p) return viewProject(p);
    ui.project = null;
  }
  const t = today();
  const open = sum(S.projects, p => p.tasks.filter(x => !x.done).length);
  const list = S.projects.map(p => {
    const o = p.tasks.filter(x => !x.done).length;
    const d = p.tasks.length - o;
    return `<button type="button" class="item link" data-a="openProject" data-id="${p.id}">
      <div class="item-body"><div class="item-title">${esc(p.name)}</div><div class="item-meta">${p.desc ? esc(p.desc.split('\n')[0]) : 'Без описания'}</div></div>
      <div class="item-end num">${o} в работе<br><small>${d} готово</small></div></button>`;
  }).join('');
  const due = [];
  S.projects.forEach(p => p.tasks.forEach(x => { if (!x.done && x.due) due.push({ p, x }); }));
  due.sort((a, b) => a.x.due.localeCompare(b.x.due));
  const dueHtml = due.length ? `<div class="ledger">${due.slice(0, 6).map(({ p, x }) => `<div class="ledger-row stack">
      <span>${esc(x.text)}<small>${esc(p.name)}</small></span><span${x.due < t ? ' class="late"' : ''}>${relDate(x.due)}</span></div>`).join('')}</div>`
    : empty('Задач со сроком нет. Срок можно поставить при добавлении задачи.');

  const sub = S.projects.length ? `${S.projects.length} ${plural(S.projects.length, ['проект', 'проекта', 'проектов'])}, ${open} ${plural(open, ['задача', 'задачи', 'задач'])} в работе.` : 'Сайты, боты и всё своё.';
  return titleRow('Проекты', esc(sub), `<button class="btn primary" data-a="focusProject">Новый проект</button>`)
    + `<div class="grid">`
    + panel(9, 'Все проекты', `<div class="items">${list || empty('Проектов пока нет. Начни с названия.')}</div>
      <form class="add" data-f="project"><label class="sr" for="p-name">Название проекта</label>
      <input class="input grow" id="p-name" name="name" placeholder="Название проекта" autocomplete="off" required>
      <button class="btn round" aria-label="Создать проект">${ICON.plus}</button></form>`, { extra: S.projects.length ? chip(S.projects.length) : '', cls: 'stretch' })
    + panel(3, 'Ближайшие сроки', dueHtml, { cls: 'stretch' })
    + `</div>`;
}

function viewProject(p) {
  const t = today();
  const tasks = [...p.tasks].sort((a, b) => a.done - b.done || (a.due || '9').localeCompare(b.due || '9'));
  const open = p.tasks.filter(x => !x.done);
  const nextDue = open.filter(x => x.due).sort((a, b) => a.due.localeCompare(b.due))[0];
  const tasksHtml = tasks.map(x => item({ done: x.done, title: x.text, a: 'ptask', id: x.id, del: 'ptaskDel', attrs: `data-p="${p.id}"`,
    meta: x.due ? `срок <span${!x.done && x.due < t ? ' class="late"' : ''}>${relDate(x.due)}</span>` : 'без срока' })).join('');
  const sub = `${open.length} ${plural(open.length, ['задача', 'задачи', 'задач'])} в работе${nextDue ? `, ближайший срок ${relDate(nextDue.due)}` : ''}.`;
  return `<button class="back" data-a="closeProject">${ICON.back}Проекты</button>`
    + titleRow(esc(p.name), esc(sub), `<button class="btn" data-a="renameProject" data-id="${p.id}">Переименовать</button>`)
    + `<div class="grid">`
    + panel(9, 'Задачи', `<div class="items">${tasksHtml || empty('Задач пока нет.')}</div>
      <form class="add" data-f="ptask" data-id="${p.id}"><label class="sr" for="pt-text">Новая задача</label>
      <input class="input grow" id="pt-text" name="text" placeholder="Новая задача" autocomplete="off" required>
      <input class="input date" name="due" type="date" aria-label="Срок, можно не ставить">
      <button class="btn round" aria-label="Добавить задачу">${ICON.plus}</button></form>`, { extra: open.length ? chip(open.length) : '', cls: 'stretch' })
    + panel(3, 'О проекте', `<textarea class="input" data-bind="pdesc" data-id="${p.id}" aria-label="Описание проекта" placeholder="Что это и зачем">${esc(p.desc || '')}</textarea>
      <p class="item-meta">Задачи со сроком сами появятся на экране «Сегодня» в свой день.</p>`)
    + panel(12, 'Заметки', `<textarea class="input tall" data-bind="pnotes" data-id="${p.id}" aria-label="Заметки проекта" placeholder="Идеи, ссылки, мысли">${esc(p.notes || '')}</textarea>`)
    + `<section class="danger s12"><div><h2>Удалить проект</h2><p class="item-meta">Удалятся все задачи и заметки «${esc(p.name)}». Вернуть их можно только из резервной копии.</p></div>
      <button class="btn negative" data-a="delProject" data-id="${p.id}">Удалить «${esc(p.name)}»</button></section>`
    + `</div>`;
}

// ---------- Оболочка ----------
const VIEWS = { today: viewToday, study: viewStudy, food: viewFood, gym: viewGym, projects: viewProjects };
const TITLES = { today: 'Сегодня', study: 'Учёба', food: 'Питание', gym: 'Зал', projects: 'Проекты' };

function renderShell() {
  const nav = TABS.map(([id, label]) => `<a class="nav-item" href="#${id}" data-tab="${id}">${ICON[id]}<span>${label}</span></a>`).join('');
  document.getElementById('sidebar').innerHTML = `
    <div class="brand">${MARK}<div><b>Распорядок</b><span>Илья · 26-ИСбо-2</span></div></div>
    <nav aria-label="Разделы">${nav}</nav>`;
  document.getElementById('tabbar').innerHTML = nav;
}

function markNav(r) {
  document.querySelectorAll('[data-tab]').forEach(a => {
    if (a.dataset.tab === r) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
}

// Смена экрана с анимацией: экран собирается по блокам сверху вниз,
// строки внутри блоков догоняют каскадом. fwd/back — лёгкий сдвиг в сторону вкладки, fade — без сдвига.
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
const ROWS = '.item, .lesson, .ex, .strip-block, .wk-cell, .wk-day, .ledger-row, .dish, .ahead-row, .check-line, .fold, .plan, .well-row, .mini li, .rules li';
let enterTimer = null;

function enter(dir) {
  const main = document.getElementById('main');
  main.classList.remove('enter');
  const blocks = [...main.querySelectorAll(':scope > *, :scope > .grid > *, :scope > .grid > .stack > *')]
    .filter(el => !el.classList.contains('grid') && !el.classList.contains('stack'));
  blocks.forEach((el, i) => {
    el.classList.add('rise');
    el.style.setProperty('--i', Math.min(i, 9));
    [...el.querySelectorAll(ROWS)].slice(0, 12).forEach((r, j) => { r.classList.add('rise-row'); r.style.setProperty('--j', j); });
  });
  main.style.setProperty('--dx', dir === 'fwd' ? '12px' : dir === 'back' ? '-12px' : '0px');
  void main.offsetWidth; // перезапуск анимаций
  main.classList.add('enter');
  clearTimeout(enterTimer);
  enterTimer = setTimeout(() => main.classList.remove('enter'), 1800);
}

function animated(dir, update) {
  update();
  if (!reduceMotion.matches) enter(dir);
}

function switchTo(r) {
  const from = TABS.findIndex(t => t[0] === lastRoute), to = TABS.findIndex(t => t[0] === r);
  if (r !== 'projects') ui.project = null;
  markNav(r); // подсветка вкладки — сразу, до перерисовки
  animated(to >= from ? 'fwd' : 'back', () => { render(); scrollTo(0, 0); });
}

let lastRoute = null;
function render() {
  const r = route();
  const main = document.getElementById('main');
  const open = r === lastRoute ? new Set([...main.querySelectorAll('details[open] > summary')].map(s => s.textContent)) : new Set();
  main.innerHTML = VIEWS[r]();
  if (open.size) main.querySelectorAll('details > summary').forEach(s => { if (open.has(s.textContent)) s.parentElement.open = true; });
  lastRoute = r;
  markNav(r);
  document.getElementById('topbar-title').textContent = TITLES[r];
  document.title = r === 'today' ? 'Распорядок' : `${TITLES[r]} · Распорядок`;
  drawWeightChart();
}

// ---------- Тосты и отмена ----------
let toastTimer = null, undoFn = null;
function toast(msg, undo) {
  const el = document.getElementById('toast');
  undoFn = undo || null;
  el.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button class="btn" data-a="undo">Вернуть</button>' : ''}`;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; undoFn = null; }, 4000);
}

function removeWithUndo(arr, pred, label) {
  const i = arr.findIndex(pred);
  if (i < 0) return;
  const [it] = arr.splice(i, 1);
  save(); render();
  toast(label, () => { arr.splice(i, 0, it); save(); render(); });
}

// ---------- Действия ----------
const findProject = id => S.projects.find(p => p.id === id);
const focusField = id => { const el = document.getElementById(id); if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.focus({ preventScroll: true }); } };

const ACTIONS = {
  task(el) { const x = S.tasks.find(t => t.id === el.dataset.id); x.done = !x.done; x.doneAt = x.done ? today() : null; },
  taskDel(el) { removeWithUndo(S.tasks, t => t.id === el.dataset.id, 'Задача удалена'); return false; },
  hw(el) { const h = S.homework.find(x => x.id === el.dataset.id); h.done = !h.done; },
  hwDel(el) { removeWithUndo(S.homework, x => x.id === el.dataset.id, 'Домашка удалена'); return false; },
  ptask(el) { const x = findProject(el.dataset.p).tasks.find(t => t.id === el.dataset.id); x.done = !x.done; },
  ptaskDel(el) { removeWithUndo(findProject(el.dataset.p).tasks, t => t.id === el.dataset.id, 'Задача удалена'); return false; },
  meal(el) { const m = S.meals[el.dataset.date] ??= {}; m[el.dataset.i] = !m[el.dataset.i]; },
  water(el) { S.water[today()] = Math.max(0, (S.water[today()] || 0) + +el.dataset.v); },
  shop(el) { S.shopping[el.dataset.id] = !S.shopping[el.dataset.id]; },
  shopReset() { if (!confirm('Снять все отметки в списке покупок?')) return false; S.shopping = {}; },
  weightDel(el) { removeWithUndo(S.weights, w => w.date === el.dataset.id, 'Запись веса удалена'); return false; },
  set(el) {
    const wid = currentWid(); const i = +el.dataset.i, j = +el.dataset.j;
    const e = gymEntry(today(), wid, i, true);
    e.s[j] = !e.s[j];
    if (e.s[j]) startRest(WORKOUTS.find(w => w.id === wid).ex[i].rest);
  },
  restAdd() { timer.end += 30000; tickRest(); return false; },
  restStop() { stopRest(); return false; },
  studyWeek(el) { ui.studyWeek = +el.dataset.v; return 'fade'; },
  studyDay(el) { ui.studyDay = +el.dataset.v; return 'fade'; },
  foodDay(el) { ui.foodDay = +el.dataset.v; return 'fade'; },
  gymW(el) { ui.gymW = el.dataset.v; return 'fade'; },
  openGym(el) { ui.gymW = el.dataset.v; history.pushState(null, '', '#gym'); switchTo('gym'); return false; },
  openProject(el) { ui.project = el.dataset.id; animated('fwd', () => { render(); scrollTo(0, 0); }); return false; },
  closeProject() { ui.project = null; animated('back', () => { render(); scrollTo(0, 0); }); return false; },
  focusTask() { focusField('task-text'); return false; },
  focusProject() { focusField('p-name'); return false; },
  renameProject(el) {
    const p = findProject(el.dataset.id);
    const name = prompt('Новое название', p.name);
    if (!name || !name.trim()) return false;
    p.name = name.trim();
  },
  delProject(el) {
    const p = findProject(el.dataset.id);
    if (!confirm(`Удалить проект «${p.name}» со всеми задачами и заметками?`)) return false;
    S.projects = S.projects.filter(x => x.id !== p.id);
    ui.project = null;
  },
  undo() { const f = undoFn; undoFn = null; document.getElementById('toast').hidden = true; f?.(); return false; },
};

document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (!el || el.tagName === 'INPUT') return;
  const fn = ACTIONS[el.dataset.a];
  if (!fn) return;
  if (el.tagName === 'A') e.preventDefault();
  const res = fn(el, e);
  if (res === false) return;
  if (res === 'fade') { animated('fade', render); return; }
  if (res !== 'ui') save();
  render();
});

// вкладки: без ожидания hashchange — подсветка и экран сразу по нажатию
document.addEventListener('click', e => {
  const a = e.target.closest('a[data-tab]');
  if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
  e.preventDefault();
  if (a.dataset.tab === route() && !ui.project) { scrollTo({ top: 0, behavior: 'smooth' }); return; }
  history.pushState(null, '', '#' + a.dataset.tab);
  switchTo(a.dataset.tab);
});

const FORMS = {
  task(f, d) { S.tasks.push({ id: uid(), text: d.text.trim(), date: d.date || today(), done: false, doneAt: null }); },
  hw(f, d) { S.homework.push({ id: uid(), subject: d.subject, text: d.text.trim(), due: d.due || null, done: false }); },
  project(f, d) { const p = { id: uid(), name: d.name.trim(), desc: '', notes: '', tasks: [] }; S.projects.push(p); ui.project = p.id; },
  ptask(f, d) { findProject(f.dataset.id).tasks.push({ id: uid(), text: d.text.trim(), due: d.due || null, done: false }); },
  weight(f, d) {
    const kg = parseFloat(String(d.kg).replace(',', '.'));
    if (!kg) return false;
    const date = d.date || today();
    S.weights = S.weights.filter(w => w.date !== date);
    S.weights.push({ date, kg: Math.round(kg * 10) / 10 });
  },
};

document.addEventListener('submit', e => {
  const f = e.target;
  const fn = FORMS[f.dataset.f];
  if (!fn) return;
  e.preventDefault();
  const d = Object.fromEntries(new FormData(f));
  if (d.text !== undefined && !d.text.trim()) return;
  if (fn(f, d) === false) return;
  save(); render();
  const again = document.querySelector(`form[data-f="${f.dataset.f}"] input[name="text"]`);
  if (again && f.dataset.f !== 'project') again.focus({ preventScroll: true });
});

// поля, которые сохраняются при вводе без перерисовки
let bindTimer = null;
document.addEventListener('input', e => {
  const el = e.target;
  const b = el.dataset.bind;
  if (!b) return;
  if (b === 'note') S.notes[el.dataset.k] = el.value;
  else if (b === 'pdesc') findProject(el.dataset.id).desc = el.value;
  else if (b === 'pnotes') findProject(el.dataset.id).notes = el.value;
  else if (b === 'kg') gymEntry(today(), currentWid(), +el.dataset.i, true).kg = el.value;
  clearTimeout(bindTimer);
  bindTimer = setTimeout(save, 300);
});

// кнопка «назад» и обычные ссылки вида #food
window.addEventListener('hashchange', () => switchTo(route()));

const idle = () => !document.activeElement?.matches('input, textarea, select');
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && idle()) render(); });
setInterval(() => { if (['today', 'study'].includes(route()) && idle()) render(); }, 60000);
let resizeTimer = null;
window.addEventListener('resize', () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(drawWeightChart, 150); });
if (document.fonts) document.fonts.ready.then(drawWeightChart);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

renderShell();
animated('fade', render);
