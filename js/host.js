// Host-scherm: maakt een spel aan, stuurt de vragen en rekent de punten uit.
// Een Twister-quiz voegt daar aan toe: spinner per vraag, matspelers, jury, FREEZE + SpekVAR, gokjes en rotatie.
import { $, $$, ART, esc, shell, toast, confetti, mediaHtml, normalize, whistle, av, setAvatars } from './common.js';
import {
  configured, db, ref, get, set, update, remove, onValue, serverTimestamp, query, orderByChild, endAt,
  useAuth, currentUser, isStaff, serverNow, notConfiguredHtml, watchAvatars,
} from './fb.js';
import { LIMBS, COLORS, boardSvg, makeSpinner } from './twister.js';
import { mountJuryPanel } from './jurypanel.js';

shell('host');
const app = $('#app');
const params = new URLSearchParams(location.search);
const POINTS = { normal: 1000, double: 2000, none: 0 };
const INTRO_MS = 4000;
const READ_MS = 6000; // leestijd na de Twister-spinner
const MAT_SURVIVE = 150; // bonus per vraag dat je op de mat blijft staan
const BURN_PENALTY = -500; // aangebrand
const BET_PTS = 300; // juist gegokt wie aanbrandt
const CAM_KEY = 'smai.cam';

let quiz, code, state = {}, players = {}, answers = {}, mat = {}, juryPin = '';
let mediaCache = {}, unsubAnswers = null, unsubJury = null, ticker = null, introTimer = null, revealing = false, qStart = 0;
let introToken = 0;
let primary = null; // actie van de grote knop / spatiebalk
const shownChips = new Set();
const cam = { stream: null, video: null };
const snapshots = []; // SpekVAR-foto's voor de bloopers op het einde
let lastSnap = null;
let bonusUid = null; // winnaar van de raadkaart (×1,2 als de quiz dat toelaat)
const BONUS = 1.2;

const g = (p = '') => ref(db, `games/${code}${p ? `/${p}` : ''}`);
const cur = () => quiz.questions[state.index];
const isTw = () => !!quiz?.twister;
const twQ = (q = cur()) => isTw() && q && q.type !== 'info';
const matSpots = () => Math.max(1, quiz.matSpots || 4);
const varOn = () => isTw() && quiz.spekvar !== false; // SpekVAR-webcam kan per quiz uit
const optionTexts = (q) => (q.type === 'mc' || q.type === 'tf' ? (q.options || []).map((o) => o.text) : []);
const onlinePlayers = () => Object.entries(players).filter(([, p]) => p.online !== false);
const ranked = () => Object.entries(players).map(([id, p]) => ({ id, ...p })).sort((a, b) => (b.score || 0) - (a.score || 0));
const matPlayers = () => Object.keys(mat).filter((id) => players[id]).map((id) => ({ id, ...players[id] }));
const who = (id) => (players[id] ? `${av(players[id], id)} ${esc(players[id].name)}` : '?');

init();

async function init() {
  if (!configured) return void (app.innerHTML = notConfiguredHtml());
  useAuth('local');
  const user = await currentUser();
  if (!(await isStaff(user))) {
    app.innerHTML = `<div class="card center login-wrap"><div class="wobble">${ART.egg()}</div>
      <h2>Alleen de chef-kok mag hosten</h2><p>Log eerst in als admin.</p><a class="btn" href="login.html?next=host.html">Inloggen</a></div>`;
    return;
  }
  document.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(e.target.tagName)) return;
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
    <div class="card list-item"><div class="grow"><h3>${q.twister ? '🌀 ' : ''}${esc(q.title)}</h3><span class="muted">${(q.questions || []).length} vragen</span></div>
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
  await set(g(), { quizId, title: quiz.title, hostUid: user.uid, createdAt: serverTimestamp(), total: quiz.questions.length, twister: isTw(), state });
  if (isTw()) {
    juryPin = String(1000 + Math.floor(Math.random() * 9000));
    await set(ref(db, `juryPins/${code}`), juryPin);
  }
  history.replaceState(null, '', `host.html?game=${code}`);
  start();
}

async function resume(c) {
  code = c;
  const game = (await get(g())).val();
  if (!game) return void (app.innerHTML = `<div class="card">Spel ${esc(c)} bestaat niet meer. <a href="host.html">Start een nieuw</a>.</div>`);
  quiz = await loadQuiz(game.quizId);
  state = game.state || { phase: 'lobby', index: -1 };
  if (isTw()) juryPin = (await get(ref(db, `juryPins/${code}`))).val() || '';
  start();
}

function cleanupOld() {
  const q = query(ref(db, 'games'), orderByChild('createdAt'), endAt(Date.now() - 24 * 3600e3));
  get(q).then((s) => s.forEach((c) => {
    remove(c.ref);
    remove(ref(db, `juryPins/${c.key}`));
  })).catch(() => {});
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
  watchAvatars(setAvatars);
  if (quiz.mapBonus) bonusUid = (await get(ref(db, 'raadkaart/reveal/winner')).catch(() => null))?.val() || null;
  await preloadMedia();
  onValue(g('players'), (s) => { players = s.val() || {}; onPlayers(); });
  if (isTw()) {
    onValue(g('mat'), (s) => { mat = s.val() || {}; onPlayers(); });
    const saved = localStorageGet(CAM_KEY);
    if (varOn() && saved) startCamera(saved).catch(() => {});
  }
  const { phase } = state;
  if (phase === 'lobby') return renderLobby();
  if (phase === 'end') return renderEnd();
  if (phase === 'scoreboard') return renderScoreboard();
  renderQuestion();
  if (phase === 'question') {
    qStart = typeof state.startedAt === 'number' ? state.startedAt : serverNow();
    showQuestionContent();
    beginAnswering();
  } else if (phase === 'freeze') {
    showQuestionContent();
    beginAnswering();
    clearInterval(ticker);
    enterFreezeView(false);
  } else if (phase === 'reveal') {
    showQuestionContent();
    const rv = (await get(g('reveal'))).val() || {};
    showReveal(rv);
  } else if (phase === 'intro') {
    showQuestionContent();
    armIntro(false);
  }
}

function localStorageGet(k) { try { return localStorage.getItem(k); } catch { return null; } }
function localStorageSet(k, v) { try { localStorage.setItem(k, v); } catch {} }

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

/* ---------- SpekVAR (webcam) ---------- */
async function startCamera(deviceId) {
  cam.stream?.getTracks().forEach((t) => t.stop());
  cam.stream = await navigator.mediaDevices.getUserMedia({ video: deviceId ? { deviceId: { exact: deviceId } } : true, audio: false });
  cam.video ||= Object.assign(document.createElement('video'), { muted: true, playsInline: true });
  cam.video.srcObject = cam.stream;
  await cam.video.play();
  const id = cam.stream.getVideoTracks()[0]?.getSettings().deviceId;
  if (id) localStorageSet(CAM_KEY, id);
  renderCamControls();
  return true;
}

function snapshot() {
  const v = cam.video;
  if (!v || !v.videoWidth) return null;
  const scale = Math.min(1, 1280 / v.videoWidth);
  const c = document.createElement('canvas');
  c.width = Math.round(v.videoWidth * scale);
  c.height = Math.round(v.videoHeight * scale);
  c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.82);
}

function liveCam() {
  if (!cam.stream) return '';
  return '<video class="var-live" autoplay muted playsinline></video>';
}
function attachLive(root = document) {
  $$('video.var-live', root).forEach((v) => { if (v.srcObject !== cam.stream) { v.srcObject = cam.stream; v.play().catch(() => {}); } });
}

async function renderCamControls() {
  const box = $('#camctl');
  if (!box) return;
  if (!cam.stream) {
    box.innerHTML = `<button class="btn small ghost" id="camon">📸 SpekVAR-camera aanzetten</button>`;
    $('#camon').onclick = () => startCamera(localStorageGet(CAM_KEY)).catch(() => startCamera()).catch((e) => toast(`Camera lukt niet: ${e.message}`, 'bad'));
    return;
  }
  const devices = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
  const curId = cam.stream.getVideoTracks()[0]?.getSettings().deviceId;
  box.innerHTML = `<div class="var-box">${liveCam()}<select class="input" id="camsel">${devices.map((d, i) =>
    `<option value="${esc(d.deviceId)}" ${d.deviceId === curId ? 'selected' : ''}>${esc(d.label || `Camera ${i + 1}`)}</option>`).join('')}</select></div>`;
  attachLive(box);
  $('#camsel').onchange = (e) => startCamera(e.target.value).catch((err) => toast(`Camera lukt niet: ${err.message}`, 'bad'));
}

/* ---------- Lobby ---------- */
function pageUrl(page) {
  const dir = location.pathname.replace(/[^/]*$/, '');
  return `${location.origin}${dir}${page}`;
}

function renderLobby() {
  shownChips.clear();
  const url = pageUrl('play.html');
  app.innerHTML = `<div class="host-stage">
    <div class="join-banner slide-up">
      <div class="join-url">Surf naar<br><b>${esc(url.replace(/^https?:\/\//, ''))}</b><br>en vul deze code in:</div>
      <div class="game-code pop-in">${code}</div>
      <div id="qr" class="qr"></div>
    </div>
    ${isTw() ? `<div class="tw-lobby">
      <div class="card tw-info"><b>🌀 Twister-quiz</b> · ${matSpots()} plekken op de mat<br>
        <span class="muted">Klik op een speler om hem op of van de mat te zetten.</span></div>
      <div class="card tw-info"><b>👩‍⚖️ Jury-gsm</b><br>${esc(pageUrl('jury.html').replace(/^https?:\/\//, ''))}<br>
        code <b>${code}</b> · pin <b class="pin">${esc(juryPin)}</b></div>
      ${varOn() ? '<div class="card tw-info" id="camctl"></div>' : ''}
    </div>` : ''}
    <div class="host-bar">
      <span class="pill yolk" id="pcount">0 spelers</span>
      <h2 style="margin:0">${esc(quiz.title)}</h2>
      <button id="next"></button>
    </div>
    <div class="player-cloud" id="cloud"><p class="muted float" id="waiting" style="color:#fff;opacity:.7;font-size:1.3rem">Wachten op hongerige spelers… 🍳</p></div>
  </div>`;
  setPrimary('Start! 🍳', async () => {
    if (!quiz.questions.length) return toast('Deze quiz heeft nog geen vragen', 'bad');
    if (isTw()) await fillMat();
    goQuestion(0);
  });
  renderQr(`${url}?code=${code}`);
  renderCamControls();
  onPlayers();
}

// Vrije matplekken aanvullen met wie het eerst binnenkwam.
async function fillMat() {
  const free = matSpots() - Object.keys(mat).filter((id) => players[id]).length;
  if (free <= 0) return;
  const extra = Object.entries(players).filter(([id]) => !mat[id])
    .sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0)).slice(0, free);
  if (extra.length) await update(g('mat'), Object.fromEntries(extra.map(([id]) => [id, true])));
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
    $('#pcount').textContent = `${list.length} speler${list.length === 1 ? '' : 's'}${isTw() ? ` · 🥓 ${Object.keys(mat).filter((id) => players[id]).length}/${matSpots()} op de mat` : ''}`;
    $('#waiting')?.classList.toggle('hidden', list.length > 0);
    $$('.player-chip', cloud).forEach((c) => { if (!players[c.dataset.id]) { c.remove(); shownChips.delete(c.dataset.id); } });
    for (const [id, p] of list) {
      let chip = cloud.querySelector(`[data-id="${id}"]`);
      if (!chip) {
        chip = document.createElement('div');
        chip.className = 'player-chip pop-in';
        chip.dataset.id = id;
        chip.onclick = (e) => {
          if (e.target.closest('.kick')) {
            if (confirm(`${p.name} verwijderen?`)) { remove(g(`players/${id}`)); remove(g(`mat/${id}`)); }
            return;
          }
          if (!isTw()) return;
          if (mat[id]) remove(g(`mat/${id}`));
          else if (Object.keys(mat).filter((x) => players[x]).length >= matSpots()) toast('De mat is vol', 'bad');
          else set(g(`mat/${id}`), true);
        };
        cloud.append(chip);
        shownChips.add(id);
        // Nieuwe speler + nog plek op de mat → er meteen op.
        if (isTw() && !mat[id] && Object.keys(mat).filter((x) => players[x]).length < matSpots()) set(g(`mat/${id}`), true);
      }
      chip.classList.toggle('off', p.online === false);
      chip.classList.toggle('on-mat', !!mat[id]);
      chip.innerHTML = `${id === bonusUid ? '<span class="mat-badge" title="Raadkaart-winnaar: ×1,2 punten">🗺️</span>' : ''}${mat[id] ? '<span class="mat-badge">🥓</span>' : ''}<span class="av">${av(p, id)}</span>${esc(p.name)}<span class="kick" title="Verwijderen">✕</span>`;
    }
  } else if (state.phase === 'question') {
    updateAnswerCount();
  }
}

/* ---------- Vraag ---------- */
async function goQuestion(i) {
  clearTimeout(introTimer);
  clearInterval(ticker);
  unsubJury?.();
  unsubJury = null;
  lastSnap = null;
  if (i >= quiz.questions.length) return goEnd();
  const q = quiz.questions[i];
  revealing = false;
  answers = {};
  const tw = twQ(q);
  const limb = tw ? (q.limb >= 0 && q.limb <= 3 ? +q.limb : Math.floor(Math.random() * 4)) : null;
  await setState(
    { phase: 'intro', index: i, qkey: `q${i}`, type: q.type, startedAt: null, duration: null, limb },
    { current: { type: q.type, text: q.text || '', options: optionTexts(q), time: q.time || 20, points: q.points || 'normal', twister: tw, limb }, reveal: null },
  );
  renderQuestion();
  if (tw) return spinIntro(limb);
  showQuestionContent();
  armIntro(true);
}

function renderQuestion() {
  const q = cur();
  const i = state.index;
  const isVideo = q.media && q.media.kind !== 'image';
  const tw = twQ(q);
  app.innerHTML = `<div class="host-stage">
    <div class="host-bar">
      <span class="pill yolk">${q.type === 'info' ? 'Intermezzo' : `Vraag ${quiz.questions.slice(0, i + 1).filter((x) => x.type !== 'info').length}`} · ${i + 1}/${quiz.questions.length}</span>
      <span class="pill" id="status">Maak je klaar…</span>
      <button id="next"></button>
    </div>
    <div id="qtext">${q.text ? `<div class="host-q slide-up">${esc(q.text)}</div>` : ''}</div>
    <div class="host-mid">
      <div id="left"></div>
      <div class="host-media" id="media"></div>
      <div id="right"></div>
    </div>
    <div id="bottom"></div>
    ${tw ? '<div id="jury"></div>' : ''}
    ${!isVideo && q.type !== 'info' ? '<div class="timer-bar" id="introbar"><div></div></div>' : ''}
  </div>`;
  if (isVideo) $('#media').dataset.video = '1';
  if (tw) $('#qtext').classList.add('hidden');
}

function showQuestionContent() {
  const q = cur();
  $('#qtext')?.classList.remove('hidden');
  $('#media').innerHTML = q.media ? mediaHtml(q.media, { autoplay: true, resolved: resolveSrc(q.media) })
    : twQ(q) ? '' : `<div class="wobble" style="width:min(260px,40vw)">${ART.egg()}</div>`;
  if (twQ(q)) {
    $('#left').innerHTML = limbBadge(state.limb);
    $('#right').innerHTML = matRoster();
    $('#bottom').innerHTML = answerEggs(q);
  }
}

const limbBadge = (l) => (l == null ? '' : `<div class="limb-badge pop-in"><span>${LIMBS[l].icon}</span>${LIMBS[l].name}</div>`);
const matRoster = () => `<div class="mat-roster"><b>🥓 Op de mat</b>${matPlayers().map((p) => `<span>${av(p, p.id)} ${esc(p.name)}</span>`).join('') || '<span>niemand</span>'}</div>`;

// Twister-intro: spatel draait naar het ledemaat, daarna even leestijd voor de vraag.
async function spinIntro(limb) {
  const token = ++introToken;
  $('#introbar')?.remove();
  $('#status').textContent = '🌀 Draaien…';
  $('#media').innerHTML = `<div class="spinner-wrap host-spinner">${boardSvg()}</div>`;
  setPrimary('Overslaan →', () => { introToken++; afterSpin(limb, false); }, 'pan');
  await makeSpinner($('#media'))(limb * 4 + Math.floor(Math.random() * 4));
  if (token !== introToken) return;
  afterSpin(limb, true);
}

function afterSpin(limb, autoOpen) {
  introToken++;
  $('#status').textContent = `${LIMBS[limb].icon} ${LIMBS[limb].name}!`;
  showQuestionContent();
  setPrimary('Antwoorden openen 🍳', openAnswers);
  if (!autoOpen) return;
  // Leestijd zodat de matspelers de vraag en de kleuren op het scherm kunnen lezen.
  const bar = document.createElement('div');
  bar.className = 'timer-bar';
  bar.id = 'introbar';
  bar.innerHTML = '<div></div>';
  $('.host-stage').append(bar);
  bar.firstChild.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: READ_MS, fill: 'forwards' });
  introTimer = setTimeout(openAnswers, READ_MS);
}

function armIntro(fresh) {
  const q = cur();
  if (q.type === 'info') {
    $('#status').textContent = 'Kijk mee 👀';
    return setPrimary('Volgende →', () => goQuestion(state.index + 1), 'pan');
  }
  if (twQ(q)) {
    $('#status').textContent = `${LIMBS[state.limb]?.icon || ''} ${LIMBS[state.limb]?.name || ''}!`;
    return setPrimary('Antwoorden openen 🍳', openAnswers);
  }
  if (q.media && q.media.kind !== 'image') {
    $('#status').textContent = 'Eerst kijken…';
    return setPrimary('Antwoorden openen 🍳', openAnswers);
  }
  setPrimary('Nu openen', openAnswers, 'pan');
  if (!fresh) return;
  const bar = $('#introbar > div');
  if (bar) bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: INTRO_MS, fill: 'forwards' });
  introTimer = setTimeout(openAnswers, INTRO_MS);
}

async function openAnswers() {
  clearTimeout(introTimer);
  introToken++;
  if (state.phase !== 'intro') return;
  $('#introbar')?.remove();
  const q = cur();
  qStart = serverNow();
  await setState({ phase: 'question', startedAt: serverTimestamp(), duration: q.time || 20 });
  state.startedAt = qStart; // nooit de placeholder opnieuw wegschrijven
  beginAnswering();
}

function beginAnswering() {
  const q = cur();
  const tw = twQ(q);
  $('#status').textContent = tw ? `${LIMBS[state.limb].icon} ${LIMBS[state.limb].name} op je antwoord!` : 'Antwoorden maar!';
  $('#left').innerHTML = `<div class="bubble" id="clock">${q.time || 20}</div>`;
  $('#right').innerHTML = `${tw && cam.stream ? liveCam() : ''}<div class="bubble white"><span id="acount">0</span><small>${tw ? 'gsm-antw.' : 'antwoorden'}</small></div>`;
  attachLive($('#right'));
  $('#bottom').innerHTML = answerEggs(q);
  if (tw) {
    unsubJury?.();
    unsubJury = mountJuryPanel($('#jury'), { code, qkey: state.qkey, matPlayers: matPlayers(), colorCount: optionTexts(q).length });
  }
  setPrimary(tw ? 'FREEZE 🥶' : 'Stop ⏱', tw ? goFreeze : doReveal, 'pan');
  listenAnswers(state.qkey);
  const dur = (state.duration || q.time || 20) * 1000;
  clearInterval(ticker);
  ticker = setInterval(() => {
    const left = Math.max(0, Math.ceil((qStart + dur - serverNow()) / 1000));
    const c = $('#clock');
    if (c) { c.firstChild.textContent = left; c.classList.toggle('urgent', left <= 5); }
    if (left <= 0) (tw ? goFreeze : doReveal)();
  }, 200);
}

async function goFreeze() {
  if (state.phase !== 'question') return;
  clearInterval(ticker);
  await setState({ phase: 'freeze' });
  enterFreezeView(true);
}

function enterFreezeView(fresh) {
  $('#status').textContent = '🥶 FREEZE! Jury, aan jou.';
  if ($('#clock')) { $('#clock').firstChild.textContent = '0'; $('#clock').classList.remove('urgent'); }
  if (fresh) {
    whistle();
    lastSnap = varOn() ? snapshot() : null;
    if (lastSnap) snapshots.push({ src: lastSnap, q: state.index + 1 });
    const o = document.createElement('div');
    o.className = 'freeze-overlay';
    o.innerHTML = '<span>FREEZE! 🥶</span>';
    document.body.append(o);
    setTimeout(() => o.remove(), 1500);
  }
  if (lastSnap) $('#media').innerHTML = `<figure class="var-shot pop-in"><img src="${lastSnap}" alt="SpekVAR"><figcaption>📸 SpekVAR</figcaption></figure>`;
  setPrimary('Onthul ✔', doReveal);
}

function answerEggs(q, rv) {
  if (q.type === 'open') {
    return `<div class="center"><span class="pill yolk" style="font-size:1.3rem">✍️ Typ je antwoord op je gsm</span></div>`;
  }
  const tw = twQ(q);
  return `<div class="host-answers ${tw ? 'compact' : ''}">${optionTexts(q).map((t, i) => {
    const right = rv && rv.correct?.includes(i);
    const cls = rv ? (right ? 'right' : 'wrong') : '';
    return `<div class="host-answer a${i} ${cls} slide-up" style="animation-delay:${i * 0.08}s">
      <span class="strip">${ART.bacon()}</span><span class="yolk">${ART.answer[i]}</span>
      <span>${tw ? `<small class="tw-color">${COLORS[i].name}</small>` : ''}${esc(t)}</span>
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
  if (twQ()) return; // matspelers hebben de volle tijd nodig
  const online = onlinePlayers();
  if (state.phase === 'question' && online.length && online.every(([id]) => answers[id])) doReveal();
}

/* ---------- Onthullen & punten ---------- */
async function doReveal() {
  if (revealing || !['question', 'freeze'].includes(state.phase)) return;
  revealing = true;
  clearInterval(ticker);
  unsubAnswers?.();
  unsubAnswers = null;
  unsubJury?.();
  unsubJury = null;
  const q = cur();
  const tw = twQ(q);
  const qkey = state.qkey;
  const [aSnap, sSnap, jSnap, bSnap] = await Promise.all([
    get(g(`answers/${qkey}`)), get(g('state/startedAt')),
    tw ? get(g(`jury/${qkey}`)) : null, tw ? get(g(`bets/${qkey}`)) : null,
  ]);
  const ans = aSnap.val() || {};
  const jury = jSnap?.val() || {};
  const bets = bSnap?.val() || {};
  const startedAt = typeof sSnap.val() === 'number' ? sSnap.val() : qStart;
  const durMs = (state.duration || 20) * 1000;
  const base = POINTS[q.points || 'normal'];
  const correct = q.type === 'open' ? [] : (q.options || []).map((o, i) => (o.correct ? i : -1)).filter((i) => i >= 0);
  const accepted = (q.answers || []).map(normalize).filter(Boolean);

  const onMat = tw ? matPlayers().map((p) => p.id) : [];
  const picks = jury.picks || {};
  const order = (jury.order || []).filter((id) => onMat.includes(id) && picks[id] != null);
  const burned = Object.fromEntries(onMat.filter((id) => jury.burned?.[id]).map((id) => [id, true]));
  const anyBurned = Object.keys(burned).length > 0;

  const counts = {};
  const openCounts = {};
  const upd = {};
  const perf = {}; // prestatie deze vraag, voor de rotatie
  for (const [id, p] of Object.entries(players)) {
    let ok = false;
    let pts = 0;
    let answered = false;
    const last = { q: qkey };
    if (onMat.includes(id)) {
      // Matspeler: kleur via de jury, snelheid = volgorde van neerzetten.
      const pick = picks[id];
      answered = pick != null;
      last.mat = true;
      if (answered) { last.pick = pick; counts[pick] = (counts[pick] || 0) + 1; }
      if (burned[id]) {
        last.burned = true;
        pts = BURN_PENALTY;
      } else {
        ok = answered && correct.includes(pick);
        if (ok && base) {
          const pos = order.indexOf(id);
          pts = Math.round(base * (1 - (0.5 * Math.max(0, pos)) / Math.max(1, onMat.length - 1)));
        }
        pts += MAT_SURVIVE;
      }
    } else {
      const a = ans[id];
      answered = !!a;
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
      if (ok && base) {
        const t = Math.min(1, Math.max(0, (a.at - startedAt) / durMs));
        pts = Math.round(base * (1 - t / 2)) + Math.min((p.streak || 0), 5) * 50;
      }
      perf[id] = { ok, at: a?.at ?? 9e15 }; // niet geantwoord = het traagst
      if (tw && bets[id]) {
        const bet = bets[id];
        last.bet = bet;
        last.betOk = bet === 'none' ? !anyBurned : !!burned[bet];
        if (last.betOk) { pts += BET_PTS; last.betPts = BET_PTS; }
      }
    }
    if (id === bonusUid && pts > 0) {
      pts = Math.round(pts * BONUS);
      last.bonus = true;
    }
    const streak = ok ? (p.streak || 0) + 1 : 0;
    Object.assign(last, { ok, pts, answered });
    upd[`players/${id}/score`] = (p.score || 0) + pts;
    upd[`players/${id}/streak`] = streak;
    upd[`players/${id}/last`] = last;
  }

  const rv = {
    qkey, correct, accepted: q.answers || [],
    counts: optionTexts(q).map((_, i) => counts[i] || 0),
    open: Object.values(openCounts).sort((a, b) => b.n - a.n).slice(0, 14),
  };
  if (tw) Object.assign(rv, rotateMat({ onMat, picks, order, burned, correct, perf }));
  if (tw) rv.betCount = Object.keys(bets).length;
  state = { ...state, phase: 'reveal', startedAt };
  if (tw) upd.mat = rv.nextMat.length ? Object.fromEntries(rv.nextMat.map((id) => [id, true])) : null;
  await update(g(), { ...upd, state, reveal: rv });
  showReveal(rv);
}

// Rotatie: aangebrand = sowieso van de mat. Is niemand aangebrand, dan gaat de traagste foute
// eraf, maar alleen als er iemand kan invallen. Vrije plekken gaan naar de beste gsm-speler(s).
function rotateMat({ onMat, picks, order, burned, correct, perf }) {
  const out = onMat.filter((id) => burned[id]);
  const candidates = Object.keys(perf)
    .filter((id) => players[id]?.online !== false)
    .sort((a, b) => (perf[b].ok - perf[a].ok) || (perf[a].at - perf[b].at) || ((players[b].score || 0) - (players[a].score || 0)));
  if (!out.length) {
    const wrong = onMat.filter((id) => !correct.includes(picks[id]));
    // Wie niets neerzette is het traagst; daarna de laatste in de volgorde.
    const slowest = wrong.sort((a, b) => (order.indexOf(a) === -1 ? 1e9 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 1e9 : order.indexOf(b))).at(-1);
    if (slowest && candidates.length) out.push(slowest);
  }
  const staying = onMat.filter((id) => !out.includes(id));
  const into = candidates.slice(0, Math.max(0, matSpots() - staying.length));
  return { matOut: out, matIn: into, nextMat: [...staying, ...into] };
}

function showReveal(rv) {
  const q = cur();
  const tw = twQ(q);
  $('#status').textContent = 'En het juiste antwoord is…';
  $('#left').innerHTML = tw ? limbBadge(state.limb) : '';
  $('#right').innerHTML = '';
  if ($('#jury')) $('#jury').innerHTML = '';
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
  if (tw && lastSnap) media.innerHTML = `<figure class="var-shot"><img src="${lastSnap}" alt="SpekVAR"><figcaption>📸 SpekVAR</figcaption></figure>`;
  else if (media.dataset.video) $('#bottom').insertAdjacentHTML('beforebegin', `<div>${chart}</div>`);
  else media.innerHTML = chart;
  $('#bottom').innerHTML = (tw ? matResults(rv) : '') + answerEggs(q, rv);
  const last = state.index >= quiz.questions.length - 1;
  setPrimary(last ? 'Naar het podium 🏆' : 'Tussenstand →', last ? goEnd : goScoreboard);
}

function matResults(rv) {
  const rows = Object.entries(players).filter(([, p]) => p.last?.q === rv.qkey && p.last.mat).map(([id, p]) => {
    const l = p.last;
    const icon = l.burned ? '🔥' : l.ok ? '✔' : '✘';
    return `<span class="mat-res ${l.burned ? 'burned' : l.ok ? 'ok' : 'bad'} pop-in">
      ${l.pick != null ? `<i class="tw-dot" style="background:${COLORS[l.pick].hex}"></i>` : '<i class="tw-dot none"></i>'}
      ${who(id)} <b>${icon} ${l.pts > 0 ? '+' : ''}${l.pts}</b></span>`;
  }).join('');
  const bettors = Object.values(players).filter((p) => p.last?.q === rv.qkey && p.last.bet);
  const betLine = bettors.length ? `<span class="mat-res bet">🔮 ${bettors.filter((p) => p.last.betOk).length}/${bettors.length} juist gegokt</span>` : '';
  const moves = [...(rv.matOut || []).map((id) => `<span class="mat-move out">⬇️ ${who(id)} gaat van de mat</span>`),
    ...(rv.matIn || []).map((id) => `<span class="mat-move in">⬆️ ${who(id)} gaat de mat op</span>`)].join('');
  return `<div class="mat-results">${rows}${betLine}</div>${moves ? `<div class="mat-results">${moves}</div>` : ''}`;
}

/* ---------- Tussenstand & podium ---------- */
async function goScoreboard() {
  await setState({ phase: 'scoreboard' });
  renderScoreboard();
}

function renderScoreboard() {
  const top = ranked().slice(0, isTw() ? 8 : 5);
  app.innerHTML = `<div class="host-stage">
    <div class="host-bar"><span class="pill yolk">Tussenstand</span><h2 style="margin:0">Wie ligt er bovenaan in de pan?</h2><button id="next"></button></div>
    <div class="scoreboard">${top.map((p, i) => `
      <div class="score-row slide-up" style="animation-delay:${i * 0.12}s">
        <span class="rank">${i + 1}</span><span style="font-size:1.8rem">${av(p, p.id)}</span>${esc(p.name)}
        ${isTw() && mat[p.id] ? '<span class="mat-badge" title="Volgende vraag op de mat">🥓</span>' : ''}
        ${p.id === bonusUid ? '<span class="mat-badge" title="Raadkaart-winnaar: ×1,2 punten">🗺️×1,2</span>' : ''}
        <span class="sc">${p.score || 0}${p.last?.pts ? `<span class="delta ${p.last.pts < 0 ? 'neg' : ''}">${p.last.pts > 0 ? '+' : ''}${p.last.pts}</span>` : ''}</span>
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
      <div class="who"><span class="av">${av(p, p.id)}</span>${esc(p.name)}<small>${p.score || 0} pt</small></div>
      <div class="block">${n}</div></div>` : `<div class="step p${n}"></div>`);
  app.innerHTML = `<div class="host-stage">
    <div class="host-bar"><span class="pill yolk">🏆 Eindstand</span><h2 style="margin:0">${esc(quiz.title)}</h2><button id="next"></button></div>
    <div class="podium">${step(r[1], 2)}${step(r[0], 1)}${step(r[2], 3)}</div>
    ${r.length > 3 ? `<div class="scoreboard" style="max-width:600px">${r.slice(3, 10).map((p, i) => `
      <div class="score-row" style="font-size:1.1rem;padding:8px 16px"><span class="rank" style="width:34px;height:34px">${i + 4}</span>${av(p, p.id)} ${esc(p.name)}<span class="sc">${p.score || 0}</span></div>`).join('')}</div>` : ''}
    ${snapshots.length ? `<h2 class="center" style="margin-top:20px">📸 SpekVAR-bloopers</h2>
      <div class="bloopers">${snapshots.map((s, i) => `<figure class="var-shot pop-in" style="animation-delay:${3 + i * 0.3}s"><img src="${s.src}" alt=""><figcaption>Vraag ${s.q}</figcaption></figure>`).join('')}</div>` : ''}
    <div class="row" style="justify-content:center"><a class="btn ghost" href="admin.html">Terug naar admin</a><a class="btn" href="host.html">Nieuwe quiz</a></div>
  </div>`;
  setPrimary(null, null);
  setTimeout(() => confetti(70), 2400);
}
