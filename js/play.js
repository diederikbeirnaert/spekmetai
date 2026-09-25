// Spelerscherm (gsm): meedoen met code + naam, antwoorden geven, score zien.
import { $, $$, ART, AVATARS, esc, shell, toast, confetti, eggAnswerInner } from './common.js';
import {
  configured, db, ref, get, set, onValue, onDisconnect, serverTimestamp,
  useAuth, ensureAnon, serverNow, notConfiguredHtml,
} from './fb.js';

shell('play');
const app = $('#app');
const params = new URLSearchParams(location.search);
const SKEY = 'smai.play';
const PREF = 'smai.me';

let user, code;
let state = {}, current = {}, reveal = null, me = null, players = {};
let hadMe = false, lastKey = '', ticker = null, wakeLock = null;

const session = () => { try { return JSON.parse(sessionStorage.getItem(SKEY)) || {}; } catch { return {}; } };
const saveSession = (s) => { try { sessionStorage.setItem(SKEY, JSON.stringify({ ...session(), ...s })); } catch {} };
const prefs = () => { try { return JSON.parse(localStorage.getItem(PREF)) || {}; } catch { return {}; } };

boot();

async function boot() {
  if (!configured) return void (app.innerHTML = notConfiguredHtml());
  app.innerHTML = `<div class="play-screen"><div class="wobble" style="width:120px">${ART.egg()}</div><p class="muted">Pan opwarmen…</p></div>`;
  useAuth('session');
  user = await ensureAnon();
  const s = session();
  const urlCode = params.get('code');
  if (s.code && (!urlCode || urlCode === s.code)) {
    const p = (await get(ref(db, `games/${s.code}/players/${user.uid}`)).catch(() => null))?.val();
    if (p) return connect(s.code);
  }
  renderJoin(urlCode || '');
}

/* ---------- Meedoen ---------- */
function renderJoin(prefill) {
  const pf = prefs();
  let avatar = pf.avatar || AVATARS[Math.floor(Math.random() * AVATARS.length)];
  app.innerHTML = `<div class="play-screen">
    <div class="wobble" style="width:110px">${ART.egg()}</div>
    <h1 style="margin:0">Doe mee!</h1>
    <form class="card" id="f" style="width:100%;text-align:left">
      <div class="field"><label for="code">Quizcode</label>
        <input class="input" id="code" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" value="${esc(prefill)}"
          style="font-family:var(--font-title);font-size:1.8rem;letter-spacing:8px;text-align:center;font-weight:700" placeholder="······"></div>
      <div class="field"><label for="name">Jouw naam</label>
        <input class="input" id="name" maxlength="20" autocomplete="nickname" value="${esc(pf.name || '')}" placeholder="bv. Spekkie"></div>
      <div class="field"><label>Kies je ontbijt</label>
        <div class="avatar-grid">${AVATARS.map((a) => `<button type="button" class="avatar-btn ${a === avatar ? 'sel' : ''}" data-a="${a}">${a}</button>`).join('')}</div></div>
      <button class="btn bacon big" style="width:100%" id="go">In de pan! 🍳</button>
    </form></div>`;
  $$('.avatar-btn').forEach((b) => b.addEventListener('click', () => {
    $$('.avatar-btn').forEach((x) => x.classList.remove('sel'));
    b.classList.add('sel');
    avatar = b.dataset.a;
  }));
  (prefill ? $('#name') : $('#code')).focus();

  $('#f').addEventListener('submit', async (e) => {
    e.preventDefault();
    const c = $('#code').value.replace(/\D/g, '');
    const name = $('#name').value.trim().replace(/\s+/g, ' ').slice(0, 20);
    if (c.length !== 6) return shakeToast('Een code heeft 6 cijfers');
    if (!name) return shakeToast('Vul je naam in');
    $('#go').disabled = true;
    try {
      const st = (await get(ref(db, `games/${c}/state`))).val();
      if (!st) throw new Error('Deze code bestaat niet 🥚');
      if (st.phase === 'end') throw new Error('Deze quiz is al afgelopen');
      try { localStorage.setItem(PREF, JSON.stringify({ name, avatar })); } catch {}
      const mine = ref(db, `games/${c}/players/${user.uid}`);
      if (!(await get(mine)).exists()) {
        await set(mine, { name, avatar, score: 0, joinedAt: serverTimestamp(), online: true });
      }
      sessionStorage.removeItem(SKEY);
      saveSession({ code: c });
      connect(c);
    } catch (err) {
      $('#go').disabled = false;
      shakeToast(err.message?.includes('PERMISSION') ? 'Kon niet meedoen, probeer opnieuw' : err.message);
    }
  });
}

function shakeToast(msg) {
  toast(msg, 'bad');
  const f = $('#f');
  f?.classList.remove('shake');
  void f?.offsetWidth;
  f?.classList.add('shake');
}

/* ---------- Verbonden ---------- */
function connect(c) {
  code = c;
  const base = `games/${c}`;
  const online = ref(db, `${base}/players/${user.uid}/online`);
  onValue(ref(db, '.info/connected'), (s) => {
    if (s.val() && hadMe !== 'kicked') { onDisconnect(online).set(false); set(online, true).catch(() => {}); }
  });
  onValue(ref(db, `${base}/state`), (s) => {
    state = s.val() || { phase: 'gone' };
    render();
  });
  onValue(ref(db, `${base}/current`), (s) => { current = s.val() || {}; render(); });
  onValue(ref(db, `${base}/reveal`), (s) => { reveal = s.val(); render(); });
  onValue(ref(db, `${base}/players/${user.uid}`), (s) => {
    me = s.val();
    if (me) hadMe = true;
    else if (hadMe) hadMe = 'kicked';
    render();
  });
  onValue(ref(db, `${base}/players`), (s) => { players = s.val() || {}; updateRank(); });
  keepAwake();
}

function keepAwake() {
  const req = async () => { try { wakeLock = await navigator.wakeLock?.request('screen'); } catch {} };
  req();
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') req(); });
}

const myRank = () => {
  const list = Object.entries(players).sort((a, b) => (b[1].score || 0) - (a[1].score || 0));
  return list.findIndex(([id]) => id === user.uid) + 1;
};
function updateRank() {
  $$('[data-rank]').forEach((el) => { el.textContent = myRank() || '–'; });
  const n = Object.keys(players).length;
  $$('[data-count]').forEach((el) => { el.textContent = `${n} speler${n === 1 ? '' : 's'} in de pan`; });
}

const answered = () => session().answered === `${code}:${state.qkey}`;

function topBar() {
  return `<div class="play-top">
    <span class="pill yolk">${esc(me?.avatar || '')} ${esc(me?.name || '')}</span>
    <span class="pill">🥓 ${me?.score || 0}</span></div>`;
}

function render() {
  if (state.phase === 'gone') return gone();
  if (hadMe === 'kicked') {
    clearInterval(ticker);
    sessionStorage.removeItem(SKEY);
    app.innerHTML = `<div class="play-screen">${ART.crackedEgg}<h2>Je bent uit de pan gehaald</h2>
      <a class="btn" href="play.html">Opnieuw meedoen</a></div>`;
    return;
  }
  if (!me) return;
  const key = [state.phase, state.qkey, answered(), reveal?.qkey, me.last?.q, current.text, current.type].join('|');
  if (key === lastKey) {
    const sc = $('.play-top .pill:last-child');
    if (sc) sc.textContent = `🥓 ${me.score || 0}`;
    return;
  }
  lastKey = key;
  clearInterval(ticker);
  const screens = { lobby, intro, question, reveal: revealScreen, scoreboard, end };
  (screens[state.phase] || lobby)();
  updateRank();
}

function lobby() {
  app.innerHTML = `<div class="play-screen">
    <div class="big-avatar pop-in">${esc(me.avatar)}</div>
    <h1 style="margin:0">Je zit erin, ${esc(me.name)}!</h1>
    <p class="muted">Kijk naar het grote scherm, de quiz begint zo.</p>
    <div class="sizzle" style="width:160px">${ART.bacon(true)}</div>
    <span class="pill" data-count></span>
  </div>`;
}

function intro() {
  const info = current.type === 'info';
  app.innerHTML = `${topBar()}<div class="play-screen">
    <div class="float" style="width:120px">${ART.egg()}</div>
    ${info ? '<h2>Kijk naar het grote scherm 👀</h2>' : `<h2>${esc(current.text || 'Maak je klaar…')}</h2><p class="muted">Maak je klaar…</p>`}
  </div>`;
}

function question() {
  if (answered()) {
    app.innerHTML = `${topBar()}<div class="play-screen">
      <div class="sizzle" style="width:170px">${ART.bacon(true)}</div>
      <h2>Antwoord zit in de pan! 🍳</h2><p class="muted">Even wachten op de rest…</p></div>`;
    return;
  }
  const opts = current.options || [];
  const long = opts.some((o) => String(o).length > 28);
  app.innerHTML = `${topBar()}
    <div class="timer-bar" style="margin:12px 0"><div id="tb"></div></div>
    <h2 class="center" style="font-size:1.35rem;margin:6px 0 14px">${esc(current.text)}</h2>
    ${current.type === 'open'
      ? `<form id="of" class="card stack" style="width:100%"><input class="input" id="ov" maxlength="80" autocomplete="off" placeholder="Typ je antwoord…" style="font-size:1.3rem">
          <button class="btn bacon big" style="width:100%">Versturen 🍳</button></form>`
      : `<div class="answer-grid ${long ? 'long' : ''}">${opts.map((t, i) =>
          `<button class="egg-btn a${i} ${current.type === 'tf' ? 'tf' : ''}" data-i="${i}">${eggAnswerInner(i, t)}</button>`).join('')}</div>`}`;
  $$('.egg-btn').forEach((b) => b.addEventListener('click', () => answer(+b.dataset.i, b)));
  $('#of')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = $('#ov').value.trim();
    if (v) answer(v);
  });
  $('#ov')?.focus();
  const tb = $('#tb');
  const dur = (state.duration || current.time || 20) * 1000;
  const tick = () => {
    const start = typeof state.startedAt === 'number' ? state.startedAt : serverNow();
    const left = Math.max(0, start + dur - serverNow());
    tb.style.transform = `scaleX(${left / dur})`;
  };
  tick();
  ticker = setInterval(tick, 100);
}

async function answer(v, btn) {
  if (answered()) return;
  const qkey = state.qkey;
  saveSession({ answered: `${code}:${qkey}` });
  navigator.vibrate?.(30);
  if (btn) {
    $$('.egg-btn').forEach((b) => b.classList.add('dim'));
    btn.classList.remove('dim');
    btn.classList.add('picked');
  }
  try {
    await set(ref(db, `games/${code}/answers/${qkey}/${user.uid}`), { v, at: serverTimestamp() });
  } catch {
    toast('Te laat! ⏰', 'bad');
  }
  setTimeout(() => { lastKey = ''; render(); }, 450);
}

function revealScreen() {
  const last = me.last;
  if (!last || last.q !== state.qkey) {
    app.innerHTML = `${topBar()}<div class="play-screen"><div class="wobble" style="width:120px">${ART.egg()}</div><h2>Even rekenen…</h2></div>`;
    return;
  }
  const right = current.type === 'open'
    ? (reveal?.accepted || [])[0]
    : (reveal?.correct || []).map((i) => current.options?.[i]).filter(Boolean).join(' / ');
  if (last.ok) {
    if (last.pts) confetti(14);
    navigator.vibrate?.([40, 60, 40]);
  } else navigator.vibrate?.(200);
  app.innerHTML = `${topBar()}<div class="play-screen">
    ${last.ok ? ART.happyEgg : `<div class="shake">${ART.crackedEgg}</div>`}
    <h1 style="margin:0">${last.ok ? 'Juist! 🎉' : last.answered ? 'Helaas, fout!' : 'Te laat! ⏰'}</h1>
    ${last.ok ? `<div class="points pop-in">+${last.pts || 0}</div>` : right ? `<p>Het juiste antwoord was <b>${esc(right)}</b></p>` : ''}
    ${last.ok && me.streak >= 2 ? `<span class="pill yolk">🔥 ${me.streak} op rij!</span>` : ''}
    <p class="muted">Je staat op plaats <b data-rank></b></p>
  </div>`;
}

function scoreboard() {
  app.innerHTML = `${topBar()}<div class="play-screen">
    <div class="big-avatar float">${esc(me.avatar)}</div>
    <h1 style="margin:0">Plaats <span data-rank></span></h1>
    <p class="points">${me.score || 0} pt</p>
    <p class="muted">Volgende vraag komt eraan…</p></div>`;
}

function end() {
  const r = myRank();
  const medal = ['🥇', '🥈', '🥉'][r - 1];
  if (medal) confetti(50);
  sessionStorage.removeItem(SKEY);
  app.innerHTML = `<div class="play-screen">
    <div class="big-avatar pop-in" style="font-size:5.5rem">${medal || esc(me.avatar)}</div>
    <h1 style="margin:0">${medal ? 'Op het podium!' : `Plaats ${r}`}</h1>
    <p class="points">${me.score || 0} pt</p>
    <p>Bedankt om mee te bakken, ${esc(me.name)}!</p>
    <a class="btn" href="index.html">Naar home</a></div>`;
}

function gone() {
  sessionStorage.removeItem(SKEY);
  app.innerHTML = `<div class="play-screen"><div class="wobble" style="width:120px">${ART.egg()}</div>
    <h2>Deze quiz bestaat niet meer</h2><a class="btn" href="play.html">Andere code</a></div>`;
}
