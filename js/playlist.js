// Weekendplaylist: liedjes zoeken en toevoegen (max 15), spekjes geven, laten aanbranden (max 5),
// en een live ranking: hoe meer spekjes, hoe hoger in de lijst.
import { $, $$, ART, esc, shell, toast, av, setAvatars, setSessionHint } from './common.js';
import {
  configured, db, ref, get, set, update, onValue, serverTimestamp, useAuth, currentUser, notConfiguredHtml, watchAvatars, isAdmin,
} from './fb.js';
import { MAX_SONGS, MAX_DOWNS, SONG_SLOTS, DOWN_SLOTS, searchSongs, rankSongs, djRanking } from './songs.js?v=3';

shell('playlist');
const app = $('#app');
let user, member = null, admin = false;
let songs = {}, votes = {}, mine = {}, downs = {}, config = {}, names = {};
let results = null, searchCtl = null, searchTimer = null, searching = false, searchError = '';
let queued = false, firstRender = true;

// Eén gedeelde speler voor de fragmenten van 30 seconden.
const audio = new Audio();
let playing = '';
audio.addEventListener('ended', () => { playing = ''; markPlaying(); });

init();

async function init() {
  if (!configured) return void (app.innerHTML = notConfiguredHtml());
  app.innerHTML = `<div class="play-screen"><div class="wobble" style="width:120px">${ART.egg()}</div><p class="muted">Platen opwarmen…</p></div>`;
  useAuth('local');
  user = await currentUser();
  member = user && !user.isAnonymous ? (await get(ref(db, `members/${user.uid}`)).catch(() => null))?.val() : null;
  admin = !member && (await isAdmin(user)); // de admin kijkt mee en kan liedjes verwijderen
  if (!member && !admin) {
    app.innerHTML = `<div class="login-wrap slide-up"><div class="float" style="width:130px;margin:auto">${ART.egg()}</div>
      <h1>De weekendplaylist</h1><p>Log in als weekendganger om liedjes toe te voegen en spekjes uit te delen.</p>
      <a class="btn bacon big" href="login.html?next=playlist.html">Inloggen</a></div>`;
    return;
  }
  if (member) {
    setSessionHint({ role: 'member', name: member.name, username: member.username });
    set(ref(db, `playlist/names/${user.uid}`), member.name).catch(() => {}); // zodat anderen zien wie een spekje gaf
  }
  watchAvatars((a) => { setAvatars(a); });
  renderShell();

  const watch = (path, fn) => onValue(ref(db, path), (s) => { fn(s.val() || {}); queueRender(); }, () => {});
  watch('playlist/songs', (v) => { songs = v; });
  watch('playlist/votes', (v) => { votes = v; });
  watch('playlist/config', (v) => { config = v; });
  watch('playlist/names', (v) => { names = v; });
  if (member) {
    watch(`playlist/mine/${user.uid}`, (v) => { mine = v; });
    watch(`playlist/downs/${user.uid}`, (v) => { downs = v; });
  }
}

/* ---------- Afgeleide gegevens ---------- */
const ranked = () => rankSongs(songs, votes);
// Een slot is vrij als het leeg is of naar een liedje wijst dat niet (meer) van jou is.
const freeSongSlot = () => SONG_SLOTS.find((s) => !mine[s] || songs[mine[s]]?.by !== user.uid);
const mySongCount = () => Object.values(songs).filter((s) => s.by === user.uid).length;
const downActive = (d) => downs[d] && votes[downs[d]]?.[user.uid] === d;
const freeDownSlot = () => DOWN_SLOTS.find((d) => !downActive(d));
const myDownCount = () => DOWN_SLOTS.filter(downActive).length;
const nameOf = (uid) => names[uid] || Object.values(songs).find((s) => s.by === uid)?.byName || 'Weekendganger';
const showAdders = () => !config.hideAdders || admin;

/* ---------- Opbouw ---------- */
// De uitleg staat open bij je eerste bezoek. Daarna is hij ingeklapt, tenzij je hem zelf openzet.
const HOW_KEY = 'smai.playlist.how';
const howOpen = () => { try { return localStorage.getItem(HOW_KEY) !== '0'; } catch { return true; } };
const howSeen = () => { try { if (localStorage.getItem(HOW_KEY) === null) localStorage.setItem(HOW_KEY, '0'); } catch {} };
function renderShell() {
  app.innerHTML = `
    <div class="pl-head slide-up">
      <h1 style="margin:0">🎵 De weekendplaylist</h1>
      <p class="lead" style="margin:6px 0 0">Dit wordt dé playlist van ons weekend, en <b>jullie bepalen samen wat er gedraaid wordt</b>.
        Voeg je favoriete liedjes toe en stem op die van de anderen: hoe meer spekjes een liedje krijgt, hoe hoger het in de playlist komt.</p>
    </div>
    <details class="card pl-how" id="how" ${howOpen() ? 'open' : ''}>
      <summary><span>📖 Hoe werkt het?</span><small class="muted">tik om te openen of te sluiten</small></summary>
      <div class="pl-steps">
        <div class="pl-step"><span class="pl-stepicon">🔍</span><b>1. Zoek en voeg toe</b>
          <p>Typ een titel of artiest in de zoekbalk en tik op <b>+ Toevoegen</b>. Je mag <b>maximaal ${MAX_SONGS} liedjes</b> toevoegen. Staat een liedje er al in, dan kan het geen tweede keer.</p></div>
        <div class="pl-step"><span class="pl-stepicon">▶️</span><b>2. Luister</b>
          <p>Tik op de <b>hoes</b> van een liedje om een fragment van 30 seconden te horen. Tik nog eens om te stoppen.</p></div>
        <div class="pl-step"><span class="pl-stepicon">🥓</span><b>3. Geef spekjes</b>
          <p>Vind je een liedje van iemand anders goed? Geef het een <b>spekje</b>. Dat mag zo vaak je wil, één per liedje. Hoe meer spekjes, hoe hoger het komt.</p></div>
        <div class="pl-step"><span class="pl-stepicon">🔥</span><b>4. Laat aanbranden</b>
          <p>Echt geen fan? Laat het <b>aanbranden</b>, dan zakt het in de lijst. Dat mag je maar bij <b>${MAX_DOWNS} liedjes</b> doen, dus kies goed.</p></div>
      </div>
      <ul class="pl-notes">
        <li>Op je <b>eigen liedjes</b> kan je niet stemmen.</li>
        <li>Van gedacht veranderd? Tik opnieuw op 🥓 of 🔥 om je stem terug te nemen. Je eigen liedje haal je weg met 🗑, dan komt die plek weer vrij.</li>
        <li>Iedereen ziet wie welk liedje een spekje gaf. Wie iets laat aanbranden, blijft geheim.</li>
        <li>De volgorde op deze pagina wordt de volgorde van de <b>echte Spotify-playlist</b> voor het weekend. De DJ met de meeste spekjes staat bovenaan het DJ-klassement.</li>
      </ul>
    </details>
    <div class="pl-grid">
      <div class="pl-main">
        ${member ? `<div class="card pl-search">
          <div class="pl-searchbar">
            <input class="input" id="q" type="search" placeholder="Zoek een liedje of artiest…" autocomplete="off" enterkeyhint="search" aria-label="Zoek een liedje of artiest">
          </div>
          <div class="pl-counters" id="counters"></div>
          <div id="results"></div>
        </div>` : '<div class="card notice">👩‍🍳 Je kijkt mee als admin. Je kan liedjes verwijderen, maar niet stemmen of toevoegen.</div>'}
        <div class="pl-listhead"><h2 style="margin:0">De ranking</h2><small class="muted">spekjes 🥓 min aangebrand 🔥 · bovenaan = eerst gedraaid</small></div>
        <ol class="pl-list" id="songs"></ol>
      </div>
      <aside class="pl-side">
        <div class="card" id="dj"></div>
        <div class="card" id="plinfo"></div>
      </aside>
    </div>`;

  howSeen();
  $('#how').addEventListener('toggle', (e) => { try { localStorage.setItem(HOW_KEY, e.target.open ? '1' : '0'); } catch {} });
  $('#q')?.addEventListener('input', (e) => {
    const term = e.target.value.trim();
    clearTimeout(searchTimer);
    searchCtl?.abort();
    searchError = '';
    if (term.length < 2) { results = null; searching = false; return renderResults(); }
    searching = true;
    renderResults();
    searchTimer = setTimeout(() => runSearch(term), 400);
  });

  // Eén klik-afhandeling voor de hele pagina.
  app.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const key = b.closest('[data-k]')?.dataset.k;
    const act = b.dataset.act;
    if (act === 'play') return togglePlay(b.dataset.src);
    if (act === 'add') return addSong(results?.find((s) => s.key === key));
    if (act === 'up' || act === 'down') return vote(key, act);
    if (act === 'del') return removeSong(key);
    if (act === 'clear') { $('#q').value = ''; results = null; renderResults(); $('#q').focus(); }
  });
}

function queueRender() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; render(); });
}

function render() {
  if (!$('#songs')) return;
  renderCounters();
  renderResults();
  renderList();
  renderSide();
  markPlaying();
}

function renderCounters() {
  const el = $('#counters');
  if (!el) return;
  const n = mySongCount();
  const d = myDownCount();
  el.innerHTML = `<span class="pill ${n >= MAX_SONGS ? '' : 'yolk'}" title="Zoveel liedjes heb jij toegevoegd">🎵 Jouw liedjes: <b>${n}/${MAX_SONGS}</b></span>
    <span class="pill ${d >= MAX_DOWNS ? '' : 'yolk'}" title="Zoveel liedjes heb jij laten aanbranden">🔥 Aangebrand: <b>${d}/${MAX_DOWNS}</b></span>
    <small class="muted">${n >= MAX_SONGS ? 'Je lijstje is vol. Verwijder een liedje om een ander toe te voegen.' : `Je kan nog ${MAX_SONGS - n} ${MAX_SONGS - n === 1 ? 'liedje' : 'liedjes'} toevoegen.`}</small>`;
}

/* ---------- Zoeken ---------- */
async function runSearch(term) {
  searchCtl = new AbortController();
  searchError = '';
  try {
    results = await searchSongs(term, searchCtl.signal);
  } catch (err) {
    if (err.name === 'AbortError') return;
    results = null;
    searchError = err.message || 'Zoeken lukt even niet';
  }
  searching = false;
  renderResults();
  markPlaying();
}

const coverBtn = (s) => `<button class="pl-cover" data-act="play" data-src="${esc(s.preview || '')}" ${s.preview ? '' : 'disabled'} title="Fragment beluisteren">
  ${s.cover ? `<img src="${esc(s.cover)}" alt="" loading="lazy">` : ''}<span class="pl-playicon"></span></button>`;

function renderResults() {
  const el = $('#results');
  if (!el) return;
  if (searching && !results) return void (el.innerHTML = '<p class="muted pl-hint">Zoeken…</p>');
  if (searchError) return void (el.innerHTML = `<p class="pl-hint" style="color:var(--bad);font-weight:800">⚠️ ${esc(searchError)}. Probeer het zo meteen opnieuw.</p>`);
  if (!results) return void (el.innerHTML = '');
  if (!results.length) return void (el.innerHTML = '<p class="muted pl-hint">Niets gevonden. Probeer een andere titel of artiest.</p>');
  const full = mySongCount() >= MAX_SONGS;
  el.innerHTML = `<ul class="pl-results">${results.map((s) => {
    const have = songs[s.key];
    const action = have
      ? `<span class="pill" title="Staat al in de playlist">✔ Staat er al in</span>`
      : `<button class="btn small bacon" data-act="add" ${full ? 'disabled' : ''}>+ Toevoegen</button>`;
    return `<li data-k="${esc(s.key)}">${coverBtn(s)}
      <div class="pl-info"><b>${esc(s.title)}</b><span>${esc(s.artist)}</span></div>${action}</li>`;
  }).join('')}</ul>
  <div class="row" style="justify-content:space-between;margin-top:8px">
    <small class="muted">${full ? `Je zit aan je maximum van ${MAX_SONGS} liedjes. Verwijder er eerst een.` : ''}</small>
    <button class="btn small ghost" data-act="clear">Zoekresultaten sluiten ✕</button></div>`;
}

/* ---------- De ranking ---------- */
function renderList() {
  const list = $('#songs');
  // Oude posities onthouden, zodat liedjes zichtbaar naar hun nieuwe plek schuiven.
  const before = new Map($$('.pl-song', list).map((el) => [el.dataset.k, el.getBoundingClientRect().top]));
  const all = ranked();
  list.innerHTML = all.map((s, i) => {
    const own = member && s.by === user.uid;
    const my = member ? votes[s.key]?.[user.uid] : null;
    const upOn = my === 'up';
    const downOn = !!my && my !== 'up';
    const likers = s.ups.map((uid) => `<span title="${esc(nameOf(uid))}">${av({ member: true }, uid)}</span>`).join('');
    return `<li class="pl-song ${own ? 'mine' : ''} ${s.score < 0 ? 'burnt' : ''}" data-k="${esc(s.key)}">
      <span class="pl-pos">${i === 0 && s.score > 0 ? '👑' : i + 1}</span>
      ${coverBtn(s)}
      <div class="pl-info">
        <b>${esc(s.title)}</b><span>${esc(s.artist)}</span>
        ${own ? '<small class="pl-by"><span class="pill yolk">jouw liedje</span></small>'
          : showAdders() ? `<small class="pl-by">${av({ member: true }, s.by)} ${esc(s.byName || nameOf(s.by))}</small>` : ''}
        ${likers ? `<div class="pl-likers">${likers}</div>` : ''}
      </div>
      <div class="pl-votes">
        <button class="pl-vote up ${upOn ? 'on' : ''}" data-act="up" ${member && !own ? '' : 'disabled'} title="${own ? 'Je kan niet op je eigen liedje stemmen' : upOn ? 'Spekje terugnemen' : 'Geef een spekje'}">🥓 <b>${s.ups.length}</b></button>
        <button class="pl-vote down ${downOn ? 'on' : ''}" data-act="down" ${member && !own ? '' : 'disabled'} title="${own ? 'Je kan niet op je eigen liedje stemmen' : downOn ? 'Toch niet aangebrand' : 'Laat aanbranden'}">🔥 <b>${s.downs.length}</b></button>
      </div>
      ${own || admin ? '<button class="btn small ghost icon pl-del" data-act="del" title="Liedje verwijderen">🗑</button>' : ''}
    </li>`;
  }).join('') || `<li class="card center pl-empty"><div class="float" style="width:110px;margin:auto">${ART.egg()}</div>
      <p>Nog geen liedjes. ${member ? 'Zoek hierboven en zet het eerste erin!' : ''}</p></li>`;

  $$('.pl-song', list).forEach((el) => {
    const prev = before.get(el.dataset.k);
    if (prev == null) { if (!firstRender) el.classList.add('pop-in'); return; }
    const delta = prev - el.getBoundingClientRect().top;
    if (delta) el.animate([{ transform: `translateY(${delta}px)` }, { transform: 'none' }], { duration: 450, easing: 'cubic-bezier(.2, 1.2, .4, 1)' });
  });
  firstRender = false;
}

function renderSide() {
  const all = ranked();
  const djs = djRanking(all);
  $('#dj').innerHTML = `<h3 style="margin:0">🎧 DJ-klassement</h3>
    <p class="muted" style="margin:4px 0 10px;font-size:.9rem">Wie verzamelt met zijn liedjes de meeste spekjes? (spekjes min aangebrand)</p>
    ${!showAdders() ? '<p class="muted" style="margin:0">De DJ\'s blijven nog even geheim 🤫</p>'
      : djs.length ? `<ol class="pl-djs">${djs.map((d, i) => `<li class="${member && d.uid === user.uid ? 'me' : ''}">
          <span class="pl-pos">${i === 0 && d.score > 0 ? '🏆' : i + 1}</span>${av({ member: true }, d.uid)}
          <b>${esc(d.name)}</b><small class="muted">${d.songs} ${d.songs === 1 ? 'liedje' : 'liedjes'}</small><span class="pl-score">🥓 ${d.score}</span></li>`).join('')}</ol>`
        : '<p class="muted" style="margin:0">Nog geen DJ\'s.</p>'}`;
  $('#plinfo').innerHTML = `<h3 style="margin-top:0">Legende</h3>
    <ul class="pl-rules">
      <li><span class="pl-vote up on">🥓 <b>3</b></span> zoveel spekjes kreeg het liedje</li>
      <li><span class="pl-vote down on">🔥 <b>1</b></span> zo vaak liet iemand het aanbranden</li>
      <li>👑 staat nu op nummer 1</li>
      <li>De kleine avatars tonen wie een spekje gaf.</li>
    </ul>
    <p class="muted" style="margin:10px 0 0">${all.length} ${all.length === 1 ? 'liedje' : 'liedjes'} in de playlist.</p>
    ${config.spotifyId ? `<a class="btn ok" style="width:100%;margin-top:12px" target="_blank" rel="noopener" href="https://open.spotify.com/playlist/${esc(config.spotifyId)}">Open in Spotify</a>` : ''}`;
}

/* ---------- Fragment afspelen ---------- */
function togglePlay(src) {
  if (!src) return;
  if (playing === src) {
    audio.pause();
    playing = '';
  } else {
    audio.src = src;
    audio.play().catch(() => toast('Het fragment kan niet afgespeeld worden', 'bad'));
    playing = src;
  }
  markPlaying();
}
function markPlaying() {
  $$('.pl-cover').forEach((b) => b.classList.toggle('playing', !!playing && b.dataset.src === playing));
}

/* ---------- Acties ---------- */
async function addSong(s) {
  if (!member || !s) return;
  if (songs[s.key]) return toast('Dit liedje staat er al in. Geef het een spekje! 🥓');
  const slot = freeSongSlot();
  if (!slot || mySongCount() >= MAX_SONGS) return toast(`Je zit aan je maximum van ${MAX_SONGS} liedjes`, 'bad');
  try {
    await update(ref(db, 'playlist'), {
      [`songs/${s.key}`]: {
        tid: s.tid, title: s.title, artist: s.artist, album: s.album, cover: s.cover, preview: s.preview,
        by: user.uid, byName: member.name, slot, at: serverTimestamp(),
      },
      [`mine/${user.uid}/${slot}`]: s.key,
    });
    toast(`"${s.title}" staat in de playlist 🎵`, 'ok');
  } catch {
    toast(songs[s.key] ? 'Iemand was je net voor: dit liedje staat er al in' : 'Toevoegen lukte niet', 'bad');
  }
}

async function vote(key, kind) {
  if (!member || !songs[key] || songs[key].by === user.uid) return;
  const uid = user.uid;
  const cur = votes[key]?.[uid]; // undefined | 'up' | 'd0'..'d4'
  const upd = {};
  if (kind === 'up') {
    upd[`votes/${key}/${uid}`] = cur === 'up' ? null : 'up';
    if (cur && cur !== 'up') upd[`downs/${uid}/${cur}`] = null; // was aangebrand → slot vrijgeven
  } else if (cur && cur !== 'up') {
    upd[`votes/${key}/${uid}`] = null; // toch niet aangebrand
    upd[`downs/${uid}/${cur}`] = null;
  } else {
    const slot = freeDownSlot();
    if (!slot) return toast(`Je mag maar ${MAX_DOWNS} liedjes laten aanbranden. Haal er eerst een weg.`, 'bad');
    upd[`votes/${key}/${uid}`] = slot;
    upd[`downs/${uid}/${slot}`] = key;
  }
  navigator.vibrate?.(20);
  try {
    await update(ref(db, 'playlist'), upd);
  } catch {
    toast('Stemmen lukte niet', 'bad');
  }
}

async function removeSong(key) {
  const s = songs[key];
  if (!s || !(admin || s.by === user.uid)) return;
  if (!confirm(`"${s.title}" uit de playlist halen? De spekjes verdwijnen mee.`)) return;
  if (playing === s.preview) togglePlay(s.preview);
  try {
    await update(ref(db, 'playlist'), { [`songs/${key}`]: null, [`votes/${key}`]: null, [`mine/${s.by}/${s.slot}`]: null });
    toast('Liedje verwijderd');
  } catch {
    toast('Verwijderen lukte niet', 'bad');
  }
}
