// Hitster op het grote scherm: lobby, om de beurt een fragment afspelen, onthullen, winnaar.
// Welk liedje er komt, staat alleen in hitster/runs/{code} (onleesbaar voor spelers).
import { $, $$, ART, esc, shell, toast, confetti, av, setAvatars } from './common.js';
import {
  configured, db, ref, get, set, update, remove, onValue, serverTimestamp, useAuth, currentUser, isStaff, notConfiguredHtml, watchAvatars,
} from './fb.js';
import { resolveSong, isCorrect, sortCards, shuffle, cardHtml, timelineHtml, DEFAULT_TARGET } from './hitster.js?v=2';
import { placementPoints } from './scoreboard.js';

shell('host');
const app = $('#app');
const params = new URLSearchParams(location.search);
let code, deck, state = {}, players = {}, run = null, song = null;
const audio = new Audio();
audio.loop = true;
const g = (p = '') => ref(db, `hgames/${code}${p ? `/${p}` : ''}`);
const runRef = () => ref(db, `hitster/runs/${code}`);
const order = () => Object.entries(players).sort((a, b) => (a[1].joinedAt || 0) - (b[1].joinedAt || 0)).map(([id]) => id);
const cardsOf = (id) => sortCards(players[id]?.cards || []);
const ranked = () => order().map((id) => ({ id, ...players[id], n: cardsOf(id).length })).sort((a, b) => b.n - a.n);

init();

async function init() {
  if (!configured) return void (app.innerHTML = notConfiguredHtml());
  useAuth('local');
  if (!(await isStaff(await currentUser()))) {
    app.innerHTML = `<div class="card center login-wrap"><h2>Alleen voor de chef-kok</h2><a class="btn" href="login.html?next=hhost.html">Inloggen</a></div>`;
    return;
  }
  watchAvatars(setAvatars);
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT') return;
    if ([' ', 'Enter', 'ArrowRight'].includes(e.key)) { e.preventDefault(); $('#next')?.click(); }
  });
  if (params.get('game')) return resume(params.get('game'));
  if (params.get('deck')) return create(params.get('deck'));
  location.replace('admin.html#hitster');
}

async function create(deckId) {
  deck = (await get(ref(db, `hitster/decks/${deckId}`))).val();
  if (!deck?.songs?.length) return void (app.innerHTML = '<div class="card">Dit deck is leeg.</div>');
  for (let i = 0; i < 20; i++) {
    code = String(100000 + Math.floor(Math.random() * 900000));
    if (!(await get(g('state'))).exists()) break;
  }
  state = { phase: 'lobby', target: DEFAULT_TARGET, round: 0, title: deck.title };
  await set(g(), { createdAt: serverTimestamp(), deck: deckId, state });
  run = { deck: deckId, queue: shuffle(deck.songs.map((_, i) => i)), pos: 0 };
  await set(runRef(), run);
  history.replaceState(null, '', `hhost.html?game=${code}`);
  start();
}

async function resume(c) {
  code = c;
  const game = (await get(g())).val();
  if (!game) return void (app.innerHTML = '<div class="card">Dit spel bestaat niet meer.</div>');
  state = game.state;
  run = (await get(runRef())).val();
  deck = (await get(ref(db, `hitster/decks/${game.deck}`))).val();
  start();
}

function start() {
  onValue(g('players'), (s) => { players = s.val() || {}; render(); });
  onValue(g('move'), (s) => { const m = s.val(); if (m && state.phase === 'play' && m.round === state.round) reveal(m); });
  render();
}

const setState = (patch, extra = {}) => { state = { ...state, ...patch }; return update(g(), { state, ...extra }); };
const nextSongIdx = () => run.queue[run.pos];

/* ---------- Weergave ---------- */
function render() {
  if (state.phase === 'lobby') return lobby();
  if (state.phase === 'end') return end();
  const id = state.turn;
  const p = players[id] || {};
  const rv = state.phase === 'reveal' ? state.reveal : null;
  app.innerHTML = `<div class="host-stage hs-stage">
    <div class="host-bar"><span class="pill yolk">🎵 Hitster · beurt ${state.round}</span>
      ${state.lastRound ? '<span class="pill" style="background:var(--bacon);color:#fff">🏁 Laatste ronde!</span>' : ''}
      <span class="pill">${av(p, id)} ${esc(p.name || '')} is aan de beurt</span><button id="next" class="btn big"></button></div>
    <div class="hs-center">
      ${rv ? `<div class="hs-reveal pop-in ${rv.ok ? 'ok' : 'bad'}">${cardHtml(rv)}<div class="hs-verdict">${rv.ok ? '✔ Juist gelegd!' : '✘ Fout gelegd…'}</div></div>`
        : `<div class="hs-record ${audio.paused ? '' : 'spin'}"><div class="hs-label">${ART.egg(false)}</div></div>
           <p class="hs-hint">${esc(p.name || '')}, leg dit liedje in je tijdlijn op je gsm!</p>`}
    </div>
    <div class="hs-board">${timelineHtml(cardsOf(id), { highlight: rv?.ok ? rv : null })}</div>
    <div class="hs-scores">${ranked().map((r) => `<span class="sb-chip ${r.id === id ? 'me' : ''}">${av(r, r.id)} ${esc(r.name)} <b>${r.n}/${state.target}</b></span>`).join('')}</div>
  </div>`;
  const b = $('#next');
  if (rv) { b.textContent = 'Volgende beurt →'; b.onclick = nextTurn; }
  else if (audio.paused) { b.textContent = '▶ Afspelen'; b.onclick = () => { audio.play().catch(() => {}); render(); }; }
  else { b.textContent = '⏭ Overslaan'; b.className = 'btn big pan'; b.onclick = () => { if (confirm('Deze beurt overslaan?')) nextTurn(); }; }
}

function lobby() {
  const url = `${location.origin}${location.pathname.replace(/[^/]*$/, '')}hitster.html`;
  app.innerHTML = `<div class="host-stage">
    <div class="join-banner slide-up">
      <div class="join-url">🎵 <b>Hitster</b> · ${esc(state.title || '')}<br>Surf naar <b>${esc(url.replace(/^https?:\/\//, ''))}</b><br>en vul deze code in:</div>
      <div class="game-code pop-in">${code}</div>
    </div>
    <div class="host-bar">
      <span class="pill yolk">${order().length} spelers</span>
      <label class="pill">Winnen met <input id="target" type="number" min="2" max="30" value="${state.target}" style="width:56px;margin:0 6px;border-radius:8px;border:0;padding:2px 6px"> kaartjes</label>
      <button id="next" class="btn big bacon">Start! 🎵</button>
    </div>
    <div class="player-cloud">${order().map((id) => `<div class="player-chip pop-in"><span class="av">${av(players[id], id)}</span>${esc(players[id].name)}</div>`).join('')
      || '<p class="muted float" style="color:#fff;opacity:.7;font-size:1.3rem">Wachten op spelers…</p>'}</div>
  </div>`;
  $('#target').onchange = (e) => setState({ target: Math.max(2, Math.min(30, +e.target.value || DEFAULT_TARGET)) });
  $('#next').onclick = startGame;
}

/* ---------- Spelverloop ---------- */
async function startGame() {
  const ids = order();
  if (ids.length < 1) return toast('Er zijn nog geen spelers', 'bad');
  // Iedereen start met één kaartje.
  const upd = {};
  for (const id of ids) {
    while (run.pos < run.queue.length - 1 && deck.songs[run.queue[run.pos]].nopreview) run.pos++;
    const s = deck.songs[run.queue[run.pos++]];
    upd[`players/${id}/cards`] = [{ title: s.title, artist: s.artist, year: s.year, cover: s.cover || '' }];
  }
  await update(g(), upd);
  await update(runRef(), { pos: run.pos });
  await turn(ids[0], 1);
}

// Volgend liedje mét fragment. Liedjes zonder fragment worden overgeslagen en in het deck gemarkeerd,
// zodat ze ook in volgende spellen niet meer opduiken.
async function nextPlayable() {
  let fails = 0;
  while (run.pos < run.queue.length) {
    const idx = nextSongIdx();
    const s = deck.songs[idx];
    if (!s.nopreview) {
      try {
        const r = await resolveSong(s);
        if (r.preview) {
          if (!s.preview) update(ref(db, `hitster/decks/${run.deck}/songs/${idx}`), { preview: r.preview, cover: r.cover || '' }).catch(() => {});
          return r;
        }
        deck.songs[idx] = { ...s, nopreview: true };
        update(ref(db, `hitster/decks/${run.deck}/songs/${idx}`), { nopreview: true }).catch(() => {});
      } catch {
        // Catalogus even onbereikbaar: niet markeren, kort wachten en opnieuw proberen.
        if (++fails < 3) { await new Promise((r) => setTimeout(r, 2000)); continue; }
        fails = 0;
      }
    }
    run.pos++;
    await update(runRef(), { pos: run.pos });
  }
  return null;
}

async function turn(id, round) {
  song = await nextPlayable();
  if (!song) return finish('Het deck is op!');
  audio.pause();
  audio.src = song.preview;
  await remove(g('move'));
  await setState({ phase: 'play', turn: id, round, reveal: null });
  audio.play().catch(() => {});
  render();
}

async function reveal(m) {
  const cards = cardsOf(m.uid);
  const ok = isCorrect(cards, m.slot, song.year);
  const card = { title: song.title, artist: song.artist, year: song.year, cover: song.cover || '' };
  const upd = {};
  if (ok) upd[`players/${m.uid}/cards`] = sortCards([...cards, card]);
  run.pos++;
  await update(runRef(), { pos: run.pos });
  await setState({ phase: 'reveal', reveal: { ...card, ok, slot: m.slot } }, upd);
  audio.pause();
  if (ok) confetti(30);
  render();
}

async function nextTurn() {
  audio.pause();
  if (state.phase === 'play') { run.pos++; await update(runRef(), { pos: run.pos }); } // overgeslagen liedje
  const ids = order();
  const i = ids.indexOf(state.turn);
  // Wie het doel haalt, wint pas als de ronde is uitgespeeld: iedereen krijgt evenveel beurten.
  if (ranked()[0]?.n >= state.target) {
    if (i === ids.length - 1 || i < 0) {
      const r = ranked();
      return finish(r[1]?.n === r[0].n ? 'Gelijkspel op kop! 🤝' : null);
    }
    if (!state.lastRound) await setState({ lastRound: true });
  }
  const nextId = ids[(i + 1) % ids.length];
  await turn(nextId, state.round + 1);
}

async function finish(reason) {
  audio.pause();
  await setState({ phase: 'end', reason: reason || null });
  render();
}

function end() {
  const r = ranked();
  const step = (p, n) => (p ? `<div class="step p${n}"><div class="who"><span class="av">${av(p, p.id)}</span>${esc(p.name)}<small>${p.n} kaartjes</small></div><div class="block">${n}</div></div>` : `<div class="step p${n}"></div>`);
  app.innerHTML = `<div class="host-stage">
    <div class="host-bar"><span class="pill yolk">🏆 Hitster</span><h2 style="margin:0">${esc(state.reason || 'We hebben een winnaar!')}</h2><span></span></div>
    <div class="podium">${step(r[1], 2)}${step(r[0], 1)}${step(r[2], 3)}</div>
    <div class="card sb-award" id="award"></div>
    <div class="row" style="justify-content:center"><a class="btn ghost" href="admin.html#hitster">Terug naar admin</a></div></div>`;
  setTimeout(() => confetti(70), 1800);
  award();
}

// Punten naar het weekendscorebord (alleen weekendgangers): plaats volgens aantal kaartjes.
async function award() {
  const box = $('#award');
  const members = ranked().filter((p) => p.member).map((p) => ({ uid: p.id, name: p.name, score: p.n }));
  if (!members.length) return void (box.innerHTML = '<p class="muted" style="margin:0">Geen weekendgangers, dus geen punten voor het scorebord.</p>');
  const entry = ref(db, `scoreboard/entries/hitster-${code}`);
  const done = (await get(entry).catch(() => null))?.exists();
  const pts = placementPoints(members);
  box.innerHTML = `<h3 style="margin:0 0 8px">🏆 Weekendscorebord</h3><div class="sb-chips">${members.map((m) => `<span class="sb-chip">${av({ member: true }, m.uid)} ${esc(m.name)} <b>+${pts[m.uid]}</b></span>`).join('')}</div>
    <div class="row" style="margin-top:12px">${done ? '<span class="pill" style="background:var(--ok)">✔ Telt al mee</span>' : '<button class="btn bacon" id="awardbtn">🏆 Punten naar het weekendscorebord</button>'}</div>`;
  $('#awardbtn')?.addEventListener('click', async () => {
    const test = (await get(ref(db, 'scoreboard/config/test')).catch(() => null))?.val() === true;
    await set(entry, { title: `🎵 Hitster: ${state.title || ''}`.slice(0, 80), kind: 'game', at: Date.now(), points: pts,
      names: Object.fromEntries(members.map((m) => [m.uid, m.name])), ...(test ? { test: true } : {}) });
    toast('Punten staan op het scorebord 🏆', 'ok');
    award();
  });
}
