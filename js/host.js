// Host-scherm: maakt een spel aan, stuurt de vragen en rekent de punten uit.
import { $, $$, ART, esc, shell, toast, confetti, mediaHtml, normalize, eggAnswerInner } from './common.js';
import {
  configured, db, ref, get, set, update, remove, onValue, serverTimestamp, query, orderByChild, endAt,
  useAuth, currentUser, isAdmin, serverNow, notConfiguredHtml,
} from './fb.js';

shell('host');
const app = $('#app');
const params = new URLSearchParams(location.search);
const POINTS = { normal: 1000, double: 2000, none: 0 };
const INTRO_MS = 4000;

let quiz, code, state = {}, players = {}, answers = {};
let mediaCache = {}, unsubAnswers = null, ticker = null, introTimer = null, revealing = false, qStart = 0;
let primary = null; // actie van de grote knop / spatiebalk
const shownChips = new Set();

const g = (p = '') => ref(db, `games/${code}${p ? `/${p}` : ''}`);
const cur = () => quiz.questions[state.index];
const optionTexts = (q) => (q.type === 'mc' || q.type === 'tf' ? (q.options || []).map((o) => o.text) : []);
const onlinePlayers = () => Object.entries(players).filter(([, p]) => p.online !== false);
const ranked = () => Object.entries(players).map(([id, p]) => ({ id, ...p })).sort((a, b) => (b.score || 0) - (a.score || 0));

init();

async function init() {
  if (!configured) return void (app.innerHTML = notConfiguredHtml());
  useAuth('local');
  const user = await currentUser();
  if (!(await isAdmin(user))) {
    app.innerHTML = `<div class="card center login-wrap"><div class="wobble">${ART.egg()}</div>
      <h2>Alleen de chef-kok mag hosten</h2><p>Log eerst in als admin.</p><a class="btn" href="admin.html">Naar admin</a></div>`;
    return;
  }
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA', 'BUTTON'].includes(e.target.tagName)) return;
    if ([' ', 'Enter', 'ArrowRight'].includes(e.key) && primary) { e.preventDefault(); runPrimary(); }
  });
  if (params.get('game')) return resume(params.get('game'));
  if (params.get('quiz')) return createGame(params.get('quiz'), user);
  pickQuiz();
}

/* ---------- Quiz kiezen / spel aanmaken ---------- */
async function pickQuiz() {
  const all = (await get(ref(db, 'quizzes'))).val() || {};
  const list = Object.entries(all).sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0));
  app.innerHTML = `<h1>Welke quiz bakken we?</h1><div class="list">${list.map(([id, q]) => `
    <div class="card list-item"><div class="grow"><h3>${esc(q.title)}</h3><span class="muted">${(q.questions || []).length} vragen</span></div>
    <a class="btn bacon" href="host.html?quiz=${encodeURIComponent(id)}">Host 🍳</a></div>`).join('') ||
    `<div class="card">Nog geen quizzen. <a href="admin.html">Maak er een</a>.</div>`}</div>`;
}

async function loadQuiz(id) {
  const q = (await get(ref(db, `quizzes/${id}`))).val();
  if (!q) throw new Error('Quiz niet gevonden');
  q.questions = (q.questions || []).filter(Boolean);
  return { id, ...q };
}

async function createGame(quizId, user) {
  try { quiz = await loadQuiz(quizId); } catch (e) { return void (app.innerHTML = `<div class="card">${esc(e.message)}</div>`); }
  cleanupOld();
  for (let i = 0; i < 20; i++) {
    code = String(100000 + Math.floor(Math.random() * 900000));
    if (!(await get(g('state'))).exists()) break;
  }
  state = { phase: 'lobby', index: -1 };
  await set(g(), { quizId, title: quiz.title, hostUid: user.uid, createdAt: serverTimestamp(), total: quiz.questions.length, state });
  history.replaceState(null, '', `host.html?game=${code}`);
  start();
}

async function resume(c) {
  code = c;
  const game = (await get(g())).val();
  if (!game) return void (app.innerHTML = `<div class="card">Spel ${esc(c)} bestaat niet meer. <a href="host.html">Start een nieuw</a>.</div>`);
  quiz = await loadQuiz(game.quizId);
  state = game.state || { phase: 'lobby', index: -1 };
  start();
}

function cleanupOld() {
  const q = query(ref(db, 'games'), orderByChild('createdAt'), endAt(Date.now() - 24 * 3600e3));
  get(q).then((s) => s.forEach((c) => { remove(c.ref); })).catch(() => {});
}

async function preloadMedia() {
  const ids = quiz.questions.map((q) => q.media?.kind === 'image' && q.media.src?.startsWith('db:') && q.media.src.slice(3)).filter(Boolean);
  await Promise.all(ids.map(async (id) => {
    mediaCache[id] = (await get(ref(db, `media/${id}/data`))).val();
    new Image().src = mediaCache[id] || '';
  }));
}
const resolveSrc = (m) => (m?.src?.startsWith('db:') ? mediaCache[m.src.slice(3)] : m?.src);

async function start() {
  await preloadMedia();
  onValue(g('players'), (s) => { players = s.val() || {}; onPlayers(); });
  const { phase } = state;
  if (phase === 'lobby') return renderLobby();
  if (phase === 'end') return renderEnd();
  if (phase === 'scoreboard') return renderScoreboard();
  renderQuestion();
  if (phase === 'question') {
    qStart = typeof state.startedAt === 'number' ? state.startedAt : serverNow();
    beginAnswering(false);
  } else if (phase === 'reveal') {
    const rv = (await get(g('reveal'))).val() || {};
    showReveal(rv);
  } else if (phase === 'intro') {
    armIntro();
  }
}

function setState(patch, extra = {}) {
  state = { ...state, ...patch };
  return update(g(), { state, ...extra });
}

// Eén actie tegelijk, zodat dubbelklikken geen vraag overslaat.
let busy = false;
async function runPrimary() {
  if (busy || !primary) return;
  busy = true;
  const b = $('#next');
  if (b) b.disabled = true;
  try { await primary(); } catch (e) { toast(`Oeps: ${e.message}`, 'bad'); console.error(e); }
  finally { busy = false; if ($('#next')) $('#next').disabled = false; }
}

function setPrimary(label, fn, cls = 'bacon') {
  primary = fn;
  const b = $('#next');
  if (!b) return;
  b.onclick = runPrimary;
  b.className = `btn big ${cls}`;
  b.innerHTML = label || '';
  b.classList.toggle('hidden', !fn);
}

/* ---------- Lobby ---------- */
function joinUrl() {
  const dir = location.pathname.replace(/[^/]*$/, '');
  return `${location.origin}${dir}play.html`;
}

function renderLobby() {
  shownChips.clear();
  const url = joinUrl();
  app.innerHTML = `<div class="host-stage">
    <div class="join-banner slide-up">
      <div class="join-url">Surf naar<br><b>${esc(url.replace(/^https?:\/\//, ''))}</b><br>en vul deze code in:</div>
      <div class="game-code pop-in">${code}</div>
      <div id="qr" class="qr"></div>
    </div>
    <div class="host-bar">
      <span class="pill yolk" id="pcount">0 spelers</span>
      <h2 style="margin:0">${esc(quiz.title)}</h2>
      <button id="next"></button>
    </div>
    <div class="player-cloud" id="cloud"><p class="muted float" id="waiting" style="color:#fff;opacity:.7;font-size:1.3rem">Wachten op hongerige spelers… 🍳</p></div>
  </div>`;
  setPrimary('Start! 🍳', () => {
    if (!quiz.questions.length) return toast('Deze quiz heeft nog geen vragen', 'bad');
    goQuestion(0);
  });
  renderQr(`${url}?code=${code}`);
  onPlayers();
}

function renderQr(text) {
  const draw = () => {
    const qr = window.qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    const el = $('#qr');
    if (el) el.innerHTML = qr.createSvgTag({ cellSize: 5, margin: 2, scalable: true });
  };
  if (window.qrcode) return draw();
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js';
  s.onload = draw;
  document.head.append(s);
}

function onPlayers() {
  if (state.phase === 'lobby') {
    const cloud = $('#cloud');
    if (!cloud) return;
    const list = Object.entries(players).sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0));
    $('#pcount').textContent = `${list.length} speler${list.length === 1 ? '' : 's'}`;
    $('#waiting')?.classList.toggle('hidden', list.length > 0);
    $$('.player-chip', cloud).forEach((c) => { if (!players[c.dataset.id]) { c.remove(); shownChips.delete(c.dataset.id); } });
    for (const [id, p] of list) {
      let chip = cloud.querySelector(`[data-id="${id}"]`);
      if (!chip) {
        chip = document.createElement('button');
        chip.className = 'player-chip pop-in';
        chip.dataset.id = id;
        chip.title = 'Klik om te verwijderen';
        chip.onclick = () => { if (confirm(`${p.name} verwijderen?`)) remove(g(`players/${id}`)); };
        cloud.append(chip);
        shownChips.add(id);
      }
      chip.classList.toggle('off', p.online === false);
      chip.innerHTML = `<span class="av">${esc(p.avatar)}</span>${esc(p.name)}`;
    }
  } else if (state.phase === 'question') {
    updateAnswerCount();
  }
}

/* ---------- Vraag ---------- */
async function goQuestion(i) {
  clearTimeout(introTimer);
  clearInterval(ticker);
  if (i >= quiz.questions.length) return goEnd();
  const q = quiz.questions[i];
  revealing = false;
  answers = {};
  await setState(
    { phase: 'intro', index: i, qkey: `q${i}`, type: q.type, startedAt: null, duration: null },
    { current: { type: q.type, text: q.text || '', options: optionTexts(q), time: q.time || 20, points: q.points || 'normal' }, reveal: null },
  );
  renderQuestion();
  armIntro();
}

function renderQuestion() {
  const q = cur();
  const i = state.index;
  const isVideo = q.media && q.media.kind !== 'image';
  app.innerHTML = `<div class="host-stage">
    <div class="host-bar">
      <span class="pill yolk">${q.type === 'info' ? 'Intermezzo' : `Vraag ${quiz.questions.slice(0, i + 1).filter((x) => x.type !== 'info').length}`} · ${i + 1}/${quiz.questions.length}</span>
      <span class="pill" id="status">Maak je klaar…</span>
      <button id="next"></button>
    </div>
    ${q.text ? `<div class="host-q slide-up">${esc(q.text)}</div>` : ''}
    <div class="host-mid">
      <div id="left"></div>
      <div class="host-media" id="media">${q.media ? mediaHtml(q.media, { autoplay: true, resolved: resolveSrc(q.media) })
        : `<div class="wobble" style="width:min(260px,40vw)">${ART.egg()}</div>`}</div>
      <div id="right"></div>
    </div>
    <div id="bottom"></div>
    ${!isVideo && q.type !== 'info' ? '<div class="timer-bar" id="introbar"><div></div></div>' : ''}
  </div>`;
  if (isVideo) $('#media').dataset.video = '1';
}

function armIntro() {
  const q = cur();
  if (q.type === 'info') {
    $('#status').textContent = 'Kijk mee 👀';
    return setPrimary('Volgende →', () => goQuestion(state.index + 1), 'pan');
  }
  if (q.media && q.media.kind !== 'image') {
    $('#status').textContent = 'Eerst kijken…';
    return setPrimary('Antwoorden openen 🍳', openAnswers);
  }
  setPrimary('Nu openen', openAnswers, 'pan');
  const bar = $('#introbar > div');
  if (bar) bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: INTRO_MS, fill: 'forwards' });
  introTimer = setTimeout(openAnswers, INTRO_MS);
}

async function openAnswers() {
  clearTimeout(introTimer);
  if (state.phase !== 'intro') return;
  $('#introbar')?.remove();
  const q = cur();
  qStart = serverNow();
  await setState({ phase: 'question', startedAt: serverTimestamp(), duration: q.time || 20 });
  state.startedAt = qStart; // nooit de placeholder opnieuw wegschrijven
  beginAnswering(true);
}

function beginAnswering() {
  const q = cur();
  $('#status').textContent = 'Antwoorden maar!';
  $('#left').innerHTML = `<div class="bubble" id="clock">${q.time || 20}</div>`;
  $('#right').innerHTML = `<div class="bubble white"><span id="acount">0</span><small>antwoorden</small></div>`;
  $('#bottom').innerHTML = answerEggs(q);
  setPrimary('Stop ⏱', doReveal, 'pan');
  listenAnswers(state.qkey);
  const dur = (state.duration || q.time || 20) * 1000;
  clearInterval(ticker);
  ticker = setInterval(() => {
    const left = Math.max(0, Math.ceil((qStart + dur - serverNow()) / 1000));
    const c = $('#clock');
    if (c) { c.firstChild.textContent = left; c.classList.toggle('urgent', left <= 5); }
    if (left <= 0) doReveal();
  }, 200);
}

function answerEggs(q, rv) {
  if (q.type === 'open') {
    return `<div class="center"><span class="pill yolk" style="font-size:1.3rem">✍️ Typ je antwoord op je gsm</span></div>`;
  }
  return `<div class="host-answers">${optionTexts(q).map((t, i) => {
    const right = rv && rv.correct?.includes(i);
    const cls = rv ? (right ? 'right' : 'wrong') : '';
    return `<div class="host-answer a${i} ${cls} slide-up" style="animation-delay:${i * 0.08}s">
      <span class="strip">${ART.bacon()}</span><span class="yolk">${ART.answer[i]}</span><span>${esc(t)}</span>
      ${rv ? `<span class="count">${rv.counts?.[i] || 0}</span>` : ''}${right ? `<span class="check">${ART.check}</span>` : ''}</div>`;
  }).join('')}</div>`;
}

function listenAnswers(qkey) {
  unsubAnswers?.();
  unsubAnswers = onValue(g(`answers/${qkey}`), (s) => {
    answers = s.val() || {};
    updateAnswerCount();
  });
}

function updateAnswerCount() {
  const n = Object.keys(answers).filter((id) => players[id]).length;
  const el = $('#acount');
  if (el) el.textContent = n;
  const online = onlinePlayers();
  if (state.phase === 'question' && online.length && online.every(([id]) => answers[id])) doReveal();
}

/* ---------- Onthullen & punten ---------- */
async function doReveal() {
  if (revealing || state.phase !== 'question') return;
  revealing = true;
  clearInterval(ticker);
  unsubAnswers?.();
  unsubAnswers = null;
  const q = cur();
  const qkey = state.qkey;
  const [aSnap, sSnap] = await Promise.all([get(g(`answers/${qkey}`)), get(g('state/startedAt'))]);
  const ans = aSnap.val() || {};
  const startedAt = typeof sSnap.val() === 'number' ? sSnap.val() : qStart;
  const durMs = (state.duration || 20) * 1000;
  const base = POINTS[q.points || 'normal'];
  const correct = q.type === 'open' ? [] : (q.options || []).map((o, i) => (o.correct ? i : -1)).filter((i) => i >= 0);
  const accepted = (q.answers || []).map(normalize).filter(Boolean);

  const counts = {};
  const openCounts = {};
  const upd = {};
  for (const [id, p] of Object.entries(players)) {
    const a = ans[id];
    let ok = false;
    let pts = 0;
    if (a) {
      if (q.type === 'open') {
        const n = normalize(a.v);
        ok = accepted.includes(n);
        if (n) openCounts[n] = openCounts[n] || { text: String(a.v).trim().slice(0, 40), n: 0, ok };
        if (n) openCounts[n].n++;
      } else {
        ok = correct.includes(a.v);
        counts[a.v] = (counts[a.v] || 0) + 1;
      }
    }
    const streak = ok ? (p.streak || 0) + 1 : 0;
    if (ok && base) {
      const t = Math.min(1, Math.max(0, (a.at - startedAt) / durMs));
      pts = Math.round(base * (1 - t / 2)) + Math.min(streak - 1, 5) * 50;
    }
    upd[`players/${id}/score`] = (p.score || 0) + pts;
    upd[`players/${id}/streak`] = streak;
    upd[`players/${id}/last`] = { q: qkey, ok, pts, answered: !!a };
  }
  const rv = {
    qkey, correct, accepted: q.answers || [],
    counts: optionTexts(q).map((_, i) => counts[i] || 0),
    open: Object.values(openCounts).sort((a, b) => b.n - a.n).slice(0, 14),
  };
  state = { ...state, phase: 'reveal', startedAt };
  await update(g(), { ...upd, state, reveal: rv });
  showReveal(rv);
}

function showReveal(rv) {
  const q = cur();
  $('#status').textContent = 'En het juiste antwoord is…';
  $('#left').innerHTML = '';
  $('#right').innerHTML = '';
  const media = $('#media');
  const chart = q.type === 'open'
    ? `<div class="stack center" style="width:100%">
        <div class="host-q" style="background:var(--ok);color:#fff">✔ ${esc((q.answers || [])[0] || '')}</div>
        <div class="open-answers">${(rv.open || []).map((o) => `<span class="pop-in ${o.ok ? 'right' : ''}">${esc(o.text)} × ${o.n}</span>`).join('')}</div></div>`
    : `<div class="chart">${(rv.counts || []).map((n, i) => {
        const max = Math.max(1, ...rv.counts);
        return `<div class="col"><span class="num" style="color:#fff">${n}</span>
          <div class="bar" style="height:${Math.max(4, (n / max) * 85)}%;background:var(--a${i});animation-delay:${i * 0.1}s;${rv.correct.includes(i) ? '' : 'opacity:.45'}"></div></div>`;
      }).join('')}</div>`;
  if (media.dataset.video) $('#bottom').insertAdjacentHTML('beforebegin', `<div>${chart}</div>`);
  else media.innerHTML = chart;
  $('#bottom').innerHTML = answerEggs(q, rv);
  const last = state.index >= quiz.questions.length - 1;
  setPrimary(last ? 'Naar het podium 🏆' : 'Tussenstand →', last ? goEnd : goScoreboard);
}

/* ---------- Tussenstand & podium ---------- */
async function goScoreboard() {
  await setState({ phase: 'scoreboard' });
  renderScoreboard();
}

function renderScoreboard() {
  const top = ranked().slice(0, 5);
  app.innerHTML = `<div class="host-stage">
    <div class="host-bar"><span class="pill yolk">Tussenstand</span><h2 style="margin:0">Wie ligt er bovenaan in de pan?</h2><button id="next"></button></div>
    <div class="scoreboard">${top.map((p, i) => `
      <div class="score-row slide-up" style="animation-delay:${i * 0.12}s">
        <span class="rank">${i + 1}</span><span style="font-size:1.8rem">${esc(p.avatar)}</span>${esc(p.name)}
        <span class="sc">${p.score || 0}${p.last?.pts ? `<span class="delta">+${p.last.pts}</span>` : ''}</span>
        ${p.streak >= 3 ? '<span title="Reeks">🔥</span>' : ''}
      </div>`).join('') || '<p class="center">Nog niemand…</p>'}
    </div></div>`;
  setPrimary('Volgende vraag →', () => goQuestion(state.index + 1));
}

async function goEnd() {
  clearInterval(ticker);
  clearTimeout(introTimer);
  await setState({ phase: 'end' });
  renderEnd();
}

function renderEnd() {
  const r = ranked();
  const step = (p, n) => (p ? `<div class="step p${n}">
      <div class="who"><span class="av">${esc(p.avatar)}</span>${esc(p.name)}<small>${p.score || 0} pt</small></div>
      <div class="block">${n}</div></div>` : `<div class="step p${n}"></div>`);
  app.innerHTML = `<div class="host-stage">
    <div class="host-bar"><span class="pill yolk">🏆 Eindstand</span><h2 style="margin:0">${esc(quiz.title)}</h2><button id="next"></button></div>
    <div class="podium">${step(r[1], 2)}${step(r[0], 1)}${step(r[2], 3)}</div>
    ${r.length > 3 ? `<div class="scoreboard" style="max-width:600px">${r.slice(3, 10).map((p, i) => `
      <div class="score-row" style="font-size:1.1rem;padding:8px 16px"><span class="rank" style="width:34px;height:34px">${i + 4}</span>${esc(p.avatar)} ${esc(p.name)}<span class="sc">${p.score || 0}</span></div>`).join('')}</div>` : ''}
    <div class="row" style="justify-content:center"><a class="btn ghost" href="admin.html">Terug naar admin</a><a class="btn" href="host.html">Nieuwe quiz</a></div>
  </div>`;
  setPrimary(null, null);
  setTimeout(() => confetti(70), 2400);
}
