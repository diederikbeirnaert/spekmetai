// Homepage. Zonder weekend (of met ?kies=1): algemene uitleg en een lijst om je weekend te kiezen.
// Met een weekend: de homepage van dat weekend, met alleen de functies die het weekend aanzette.
import { $, ART, shell, esc, fmtDate, setAvatars, getSessionHint } from './common.js?v=w1';
import { weekendId, setWeekend, cacheMeta, hasFeature, FEATURES } from './weekend.js?v=w1';
import { fetchLetters, letterExcerpt } from './letters.js?v=w1';
import { firebaseConfig } from './firebase-config.js?v=w1';
import { rankSongs } from './songs.js?v=w1';
import { totals, sortedEntries, standings, KIND_ICON, animateFigures, figureSlot } from './scoreboard.js?v=w1';

const ready = !String(firebaseConfig.apiKey).startsWith('VUL');
const rest = async (p) => {
  if (!ready) return null;
  const r = await fetch(`${firebaseConfig.databaseURL}/${p}.json`);
  return r.ok ? (await r.json()) ?? null : null;
};
const params = new URLSearchParams(location.search);
if (params.has('kies')) setWeekend(null);
const W = weekendId();

shell('home');
if (W) weekendHome();
else picker();

const fmtRange = (from, to) => {
  const f = (d) => new Date(d).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' });
  return from ? (to && to !== from ? `${f(from)} – ${f(to)}` : f(from)) : '';
};

/* ---------- Weekend kiezen ---------- */
async function picker() {
  $('#app').innerHTML = `
  <section class="hero">
    <div class="slide-up">
      <h1>Spekmet<span class="ai">AI</span><br><span style="font-size:.55em">alles voor het sappigste weekend</span></h1>
      <p class="lead">Quizzen op het grote scherm, geheime opdrachten, raden waar je heen gaat, een gedeelde playlist en Hitster. Elk weekend krijgt zijn eigen keuken.</p>
      <form class="join-box" id="join">
        <input class="input" id="code" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="123456" aria-label="Spelcode" autocomplete="off">
        <button class="btn bacon big" type="submit">Doe mee!</button>
      </form>
      <p class="muted" style="margin-top:8px">Staat er een spelcode op het grote scherm? Vul ze hier in.</p>
    </div>
    <div class="hero-art pop-in">${ART.pan}</div>
  </section>

  <h2 class="section-title"><span class="sizzle">${ART.bacon()}</span> Kies je weekend</h2>
  <div id="wlist" class="wk-list"><div class="card muted">Weekends opwarmen…</div></div>

  <h2 class="section-title"><span class="wobble">${ART.egg()}</span> Wat zit er in de pan?</h2>
  <div class="wk-features">${FEATURES.map((f) => `<div class="card wk-feature"><span class="wk-ficon">${f.icon}</span><b>${esc(f.name)}</b><span class="muted">${esc(f.desc)}</span></div>`).join('')}</div>
  <div class="card center" style="margin-top:18px"><h3 style="margin-top:0">Zelf een weekend organiseren? 🍳</h3>
    <p class="muted" style="margin:0 auto 12px;max-width:52ch">Vraag de hoofdchef om een weekend aan te maken. Jij kiest welke functies erin zitten en nodigt je weekendgangers uit met één link: iedereen bouwt zelf zijn poppetje.</p>
    <a class="btn" href="login.html">Inloggen als organisator</a></div>`;
  wireJoin();
  const list = Object.entries((await rest('weekendList').catch(() => null)) || {})
    .filter(([, w]) => w.listed !== false)
    .sort((a, b) => String(b[1].from || '').localeCompare(String(a[1].from || '')));
  $('#wlist').innerHTML = list.map(([id, w], i) => `<a class="card wk-card slide-up" style="animation-delay:${i * 0.05}s" href="index.html?w=${encodeURIComponent(id)}">
      <span class="wk-emoji">${esc(w.emoji || '🍳')}</span><span class="grow"><b>${esc(w.name)}</b>
      <span class="muted">${esc(fmtRange(w.from, w.to))}</span></span><span class="wk-go">→</span></a>`).join('')
    || '<div class="card muted">Nog geen weekends. Kom snel terug!</div>';
}

// Spelcode invullen → het weekend volgt vanzelf uit de code (zie play.html).
function wireJoin() {
  $('#join').addEventListener('submit', (e) => {
    e.preventDefault();
    const code = $('#code').value.replace(/\D/g, '');
    location.href = `play.html${code ? `?code=${code}` : ''}`;
  });
}

/* ---------- Homepage van een weekend ---------- */
async function weekendHome() {
  $('#app').innerHTML = '<div class="card muted">Even opwarmen…</div>';
  const meta = await rest(`weekends/${W}/meta`).catch(() => null);
  if (!meta) {
    setWeekend(null);
    $('#app').innerHTML = `<div class="card center login-wrap"><h2>Dit weekend bestaat niet (meer) 🍳</h2><a class="btn" href="index.html">Kies een weekend</a></div>`;
    return;
  }
  cacheMeta(W, meta);
  const on = (k) => hasFeature(meta, k);
  const games = on('quiz') || on('hitster');
  const hint = getSessionHint();
  $('#app').innerHTML = `
    ${on('scoreboard') ? '<section id="homescores" class="home-scores"></section>' : ''}
    <section class="hero">
      <div class="slide-up">
        <span class="pill yolk">${esc(meta.emoji || '🍳')} ${esc(fmtRange(meta.from, meta.to) || 'Ons weekend')}</span>
        <h1 style="margin-top:12px">${esc(meta.name)}</h1>
        <p class="lead">${esc(meta.tagline || 'Alles voor het sappigste weekend: hier gebeurt het allemaal.')}</p>
        ${games ? `<form class="join-box" id="join">
          <input class="input" id="code" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="123456" aria-label="Spelcode" autocomplete="off">
          <button class="btn bacon big" type="submit">Doe mee!</button></form>` : ''}
        <div class="row" style="margin-top:14px">
          ${hint?.role === 'member' && hint.w === W ? `<a class="btn" href="portaal.html">${on('missions') ? '🤫 Mijn opdracht' : '🎨 Mijn poppetje'}</a>`
            : '<a class="btn" href="login.html">Inloggen als weekendganger</a>'}
          ${on('raadkaart') ? '<a class="btn pan" href="raadkaart.html">🗺️ Raadkaart</a>' : ''}
        </div>
      </div>
      <div class="hero-art pop-in">${ART.pan}</div>
    </section>
    <div id="hometop"></div>
    ${on('brief') ? `<h2 class="section-title"><span class="sizzle">${ART.bacon()}</span> Laatste weekendbrief</h2>
      <div id="letter"><div class="card muted">Even opwarmen…</div></div>` : ''}`;
  if (games) wireJoin();
  if (on('brief')) loadLetter();
  if (on('playlist')) loadTopSongs().catch(() => {});
  if (on('scoreboard')) {
    loadScores().catch(() => {});
    setInterval(() => loadScores().catch(() => {}), 30000);
  }
}

function loadLetter() {
  fetchLetters().then(([l]) => {
    $('#letter').innerHTML = l
      ? `<a class="card letter-item paper" href="brief.html?id=${encodeURIComponent(l.id)}">
          <span class="letter-date">${esc(fmtDate(l.date))}</span>
          <h3 style="margin-top:10px">${esc(l.title)}</h3>
          <p class="muted">${esc(letterExcerpt(l.body))}…</p>
          <span class="btn small">Lees verder →</span></a>`
      : `<div class="card muted">Nog geen weekendbrief gebakken. Kom snel terug!</div>`;
  }).catch(() => { $('#letter').innerHTML = `<div class="card muted">Kon de weekendbrief niet laden.</div>`; });
}

// Top 5 van de weekendplaylist (publiek leesbaar, via de snelle REST-API).
async function loadTopSongs() {
  const [songs, votes] = await Promise.all([rest(`weekends/${W}/playlist/songs`), rest(`weekends/${W}/playlist/votes`)]);
  const top = rankSongs(songs || {}, votes || {}).slice(0, 5);
  if (!top.length) return;
  $('#hometop').innerHTML = `
    <h2 class="section-title"><span class="wobble">${ART.egg()}</span> De weekendplaylist</h2>
    <div class="card">
      <ol class="pl-list home-top">${top.map((s, i) => `<li class="pl-song">
        <span class="pl-pos">${i === 0 && s.score > 0 ? '👑' : i + 1}</span>
        <span class="pl-cover" style="cursor:default">${s.cover ? `<img src="${esc(s.cover)}" alt="" loading="lazy">` : ''}</span>
        <div class="pl-info"><b>${esc(s.title)}</b><span>${esc(s.artist)}</span></div>
        <span class="pl-score">🥓 ${s.score}</span></li>`).join('')}</ol>
      <div class="row" style="justify-content:space-between;margin-top:14px">
        <span class="muted">${Object.keys(songs).length} liedjes · stem mee en bepaal wat er gedraaid wordt</span>
        <a class="btn bacon" href="playlist.html">🎵 Naar de playlist</a></div>
    </div>`;
}

// Weekendscorebord bovenaan, ververst om de 30 seconden (alleen opnieuw tekenen als er iets veranderde).
let lastScores = '';
async function loadScores() {
  const [entries, avatars, config] = await Promise.all(['scoreboard/entries', 'avatars', 'scoreboard/config'].map((p) => rest(`weekends/${W}/${p}`).catch(() => null)));
  const sig = JSON.stringify([entries, config, avatars]);
  if (sig === lastScores) return;
  lastScores = sig;
  setAvatars(avatars || {});
  const test = config?.test === true;
  const list = totals(entries || {}, { includeTest: test });
  const latest = sortedEntries(entries || {}).filter((e) => test || !e.test)[0];
  if (!list.length) return showLineup(avatars || {});
  $('#homescores').innerHTML = `
    <div class="card home-board slide-up">
      <div class="row" style="justify-content:space-between;align-items:baseline">
        <h2 style="margin:0">🏆 Weekendscorebord</h2>
        ${latest ? `<small class="muted">Laatste: ${KIND_ICON[latest.kind] || '🎲'} ${esc(latest.title)}</small>` : ''}
      </div>
      ${test ? '<p class="sb-testnote">🧪 Testmodus: deze punten zijn een test en tellen niet echt mee.</p>' : ''}
      ${standings(list)}
    </div>`;
  animateFigures($('#homescores'));
}

// Nog geen punten: alle poppetjes naast elkaar (tik voor de signature move).
function showLineup(avatars) {
  const people = Object.entries(avatars).filter(([, a]) => a.cfg || a.img).sort((a, b) => String(a[1].name || '').localeCompare(String(b[1].name || '')));
  if (!people.length) return void ($('#homescores').innerHTML = '');
  $('#homescores').innerHTML = `<div class="card home-board slide-up">
    <h2 style="margin:0">🏆 Weekendscorebord</h2>
    <p class="muted" style="margin:4px 0 0">Nog geen punten… de deelnemers warmen zich op! Tik op iemand. 👆</p>
    <div class="sb-lineup">${people.map(([uid, a]) => `<figure>${figureSlot(uid, 'wave')}<figcaption>${esc(a.name || '')}</figcaption></figure>`).join('')}</div></div>`;
  animateFigures($('#homescores'));
}
