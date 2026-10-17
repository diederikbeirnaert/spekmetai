// Hitster op de gsm: meedoen met de code, je tijdlijn bekijken en (als je aan de beurt bent)
// het liedje op de juiste plek leggen.
import { $, $$, ART, AVATARS, esc, shell, toast, confetti, av, setAvatars, getSessionHint, setSessionHint } from './common.js';
import {
  configured, db, ref, get, set, onValue, onDisconnect, serverTimestamp, useAuth, ensureAnon, currentUser, notConfiguredHtml, watchAvatars,
} from './fb.js';
import { timelineHtml, sortCards, cardHtml } from './hitster.js';

shell('play');
const app = $('#app');
const params = new URLSearchParams(location.search);
const SKEY = 'smai.hitster';
let user, member = null, code, state = {}, players = {}, picked = null, sent = '', lastRound = null;

boot();

async function boot() {
  if (!configured) return void (app.innerHTML = notConfiguredHtml());
  app.innerHTML = `<div class="play-screen"><div class="wobble" style="width:120px">${ART.egg()}</div><p class="muted">Platen opwarmen…</p></div>`;
  const hint = getSessionHint();
  useAuth(hint?.role === 'member' ? 'local' : 'session');
  const u = await currentUser();
  if (hint?.role === 'member' && u && !u.isAnonymous) {
    member = (await get(ref(db, `members/${u.uid}`)).catch(() => null))?.val() || null;
    if (!member) setSessionHint(null);
  }
  user = member ? u : await ensureAnon();
  watchAvatars(setAvatars);
  let saved = null;
  try { saved = sessionStorage.getItem(SKEY); } catch {}
  const urlCode = params.get('code');
  const c = urlCode || saved;
  if (c && (await get(ref(db, `hgames/${c}/players/${user.uid}`)).catch(() => null))?.exists()) return connect(c);
  renderJoin(urlCode || '');
}

function renderJoin(prefill) {
  let avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  app.innerHTML = `<div class="play-screen">
    ${member ? `<div class="big-avatar pop-in">${av({ member: true }, user.uid)}</div><h1 style="margin:0">Hoi ${esc(member.name)}!</h1>`
      : `<div class="wobble" style="width:110px">${ART.egg()}</div><h1 style="margin:0">🎵 Hitster</h1>`}
    <form class="card" id="f" style="width:100%;text-align:left">
      <div class="field"><label for="code">Spelcode</label>
        <input class="input" id="code" inputmode="numeric" maxlength="6" autocomplete="off" value="${esc(prefill)}"
          style="font-family:var(--font-title);font-size:1.8rem;letter-spacing:8px;text-align:center;font-weight:700" placeholder="······"></div>
      ${member ? '' : `<div class="field"><label for="name">Jouw naam</label><input class="input" id="name" maxlength="20"></div>
        <div class="field"><label>Kies je ontbijt</label><div class="avatar-grid">${AVATARS.map((a) => `<button type="button" class="avatar-btn ${a === avatar ? 'sel' : ''}" data-a="${a}">${a}</button>`).join('')}</div></div>`}
      <button class="btn bacon big" style="width:100%" id="go">Doe mee! 🎵</button>
    </form></div>`;
  $$('.avatar-btn').forEach((b) => { b.onclick = () => { $$('.avatar-btn').forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); avatar = b.dataset.a; }; });
  $('#f').onsubmit = async (e) => {
    e.preventDefault();
    const c = $('#code').value.replace(/\D/g, '');
    const name = (member ? member.name : $('#name').value).trim().slice(0, 20);
    if (c.length !== 6) return toast('Een code heeft 6 cijfers', 'bad');
    if (!name) return toast('Vul je naam in', 'bad');
    const st = (await get(ref(db, `hgames/${c}/state`)).catch(() => null))?.val();
    if (!st) return toast('Deze code bestaat niet 🥚', 'bad');
    try {
      const rec = { name, avatar: member ? '🍳' : avatar, joinedAt: serverTimestamp(), online: true };
      if (member) rec.member = true;
      await set(ref(db, `hgames/${c}/players/${user.uid}`), rec);
      connect(c);
    } catch { toast('Meedoen lukte niet', 'bad'); }
  };
}

function connect(c) {
  code = c;
  try { sessionStorage.setItem(SKEY, c); } catch {}
  const online = ref(db, `hgames/${c}/players/${user.uid}/online`);
  onValue(ref(db, '.info/connected'), (s) => { if (s.val()) { onDisconnect(online).set(false); set(online, true).catch(() => {}); } });
  onValue(ref(db, `hgames/${c}/state`), (s) => { state = s.val() || { phase: 'gone' }; render(); });
  onValue(ref(db, `hgames/${c}/players`), (s) => { players = s.val() || {}; render(); });
  try { navigator.wakeLock?.request('screen'); } catch {}
}

const me = () => players[user.uid] || {};
const myCards = () => sortCards(me().cards || []);

function render() {
  if (state.phase === 'gone') return void (app.innerHTML = '<div class="play-screen"><h2>Dit spel bestaat niet meer</h2><a class="btn" href="hitster.html">Andere code</a></div>');
  const top = `<div class="play-top"><span class="pill yolk">${av(me(), user.uid)} ${esc(me().name || '')}</span>
    ${state.lastRound && state.phase !== 'end' ? '<span class="pill" style="background:var(--bacon);color:#fff">🏁 Laatste ronde</span>' : ''}
    <span class="pill">🃏 ${myCards().length}/${state.target || 10}</span></div>`;
  if (state.phase === 'lobby') {
    app.innerHTML = `${top}<div class="play-screen"><div class="big-avatar pop-in">${av(me(), user.uid)}</div><h1 style="margin:0">Je zit erin!</h1>
      <p class="muted">Kijk naar het grote scherm, Hitster begint zo. 🎵</p></div>`;
    return;
  }
  if (state.phase === 'end') {
    const r = Object.entries(players).sort((a, b) => (b[1].cards || []).length - (a[1].cards || []).length);
    const pos = r.findIndex(([id]) => id === user.uid) + 1;
    if (pos === 1) confetti(50);
    app.innerHTML = `${top}<div class="play-screen"><div class="big-avatar pop-in">${['🥇', '🥈', '🥉'][pos - 1] || av(me(), user.uid)}</div>
      <h1 style="margin:0">${pos === 1 ? 'Gewonnen!' : `Plaats ${pos}`}</h1><p>${myCards().length} kaartjes in je tijdlijn</p>
      <div class="hs-phone">${timelineHtml(myCards())}</div></div>`;
    return;
  }
  if (state.round !== lastRound) { picked = null; lastRound = state.round; } // nieuwe beurt: keuze wissen
  const mine = state.turn === user.uid;
  const turnP = players[state.turn] || {};
  const rv = state.phase === 'reveal' ? state.reveal : null;
  const key = `${state.round}`;
  if (rv) {
    app.innerHTML = `${top}<div class="hs-phone">
      <p class="center" style="margin:6px 0">${mine ? (rv.ok ? '🎉 Juist! Het kaartje is van jou.' : '😬 Helaas, verkeerde plek.') : `${esc(turnP.name || '')} legde het ${rv.ok ? 'juist ✔' : 'fout ✘'}`}</p>
      <div class="center">${cardHtml(rv, 'big')}</div>
      <h3>Jouw tijdlijn</h3>${timelineHtml(myCards(), { highlight: mine && rv.ok ? rv : null })}</div>`;
    if (mine && rv.ok && sent === key) { confetti(25); sent = `${key}-done`; }
    return;
  }
  if (!mine) {
    app.innerHTML = `${top}<div class="hs-phone"><div class="center"><div class="big-avatar float">${av(turnP, state.turn)}</div>
      <h2 style="margin:4px 0">${esc(turnP.name || '')} is aan de beurt 🎵</h2><p class="muted" style="margin:0">Luister mee… en roep maar!</p></div>
      <h3>Jouw tijdlijn</h3>${timelineHtml(myCards())}</div>`;
    return;
  }
  if (sent === key) {
    app.innerHTML = `${top}<div class="play-screen"><div class="sizzle" style="width:150px">${ART.bacon(true)}</div><h2>Kaartje gelegd!</h2><p class="muted">Kijk naar het grote scherm…</p></div>`;
    return;
  }
  app.innerHTML = `${top}<div class="hs-phone">
    <h2 class="center" style="margin:6px 0">🎵 Jij bent aan de beurt!</h2>
    <p class="center muted" style="margin:0 0 8px">Luister naar het liedje en tik waar het in je tijdlijn hoort: ouder of nieuwer?</p>
    ${timelineHtml(myCards(), { gaps: true, picked })}
    <button class="btn bacon big hs-confirm" id="go" ${picked == null ? 'disabled' : ''}>Leg hier 🃏</button></div>`;
  $$('.hs-gap').forEach((b) => { b.onclick = () => { picked = +b.dataset.slot; navigator.vibrate?.(20); render(); }; });
  $('#go').onclick = async () => {
    if (picked == null) return;
    try {
      await set(ref(db, `hgames/${code}/move`), { uid: user.uid, slot: picked, round: state.round });
      sent = key;
      picked = null;
      render();
    } catch { toast('Leggen lukte niet. Probeer opnieuw.', 'bad'); }
  };
}
