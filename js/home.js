import { $, ART, shell, esc, fmtDate, setAvatars } from './common.js';
import { fetchLetters, letterExcerpt } from './letters.js?v=4';
import { firebaseConfig } from './firebase-config.js';
import { rankSongs } from './songs.js?v=3';
import { totals, sortedEntries, standings, KIND_ICON, animateFigures } from './scoreboard.js';

shell('home');

$('#app').innerHTML = `
  <section id="homescores" class="home-scores"></section>
  <section class="hero">
    <div class="slide-up">
      <h1>Spekmet<span class="ai">AI</span><br><span style="font-size:.55em">alles voor het sappigste weekend</span></h1>
      <p class="lead">Quizzen, spelletjes, geheime opdrachten, de raadkaart en onze eigen playlist: hier gebeurt het allemaal. Doe je mee aan een quiz? Vul de code in!</p>
      <form class="join-box" id="join">
        <input class="input" id="code" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="123456" aria-label="Quizcode" autocomplete="off">
        <button class="btn bacon big" type="submit">Doe mee!</button>
      </form>
    </div>
    <div class="hero-art pop-in">${ART.pan}</div>
  </section>

  <div id="hometop"></div>

  <h2 class="section-title"><span class="sizzle">${ART.bacon()}</span> Laatste weekendbrief</h2>
  <div id="letter"><div class="card muted">Even opwarmen…</div></div>
`;

$('#join').addEventListener('submit', (e) => {
  e.preventDefault();
  const code = $('#code').value.replace(/\D/g, '');
  location.href = `play.html${code ? `?code=${code}` : ''}`;
});

fetchLetters().then(([l]) => {
  $('#letter').innerHTML = l
    ? `<a class="card letter-item paper" href="brief.html?id=${encodeURIComponent(l.id)}">
        <span class="letter-date">${esc(fmtDate(l.date))}</span>
        <h3 style="margin-top:10px">${esc(l.title)}</h3>
        <p class="muted">${esc(letterExcerpt(l.body))}…</p>
        <span class="btn small">Lees verder →</span></a>`
    : `<div class="card muted">Nog geen weekendbrief gebakken. Kom snel terug!</div>`;
}).catch(() => { $('#letter').innerHTML = `<div class="card muted">Kon de weekendbrief niet laden.</div>`; });

// Top 5 van de weekendplaylist (publiek leesbaar, via de snelle REST-API).
async function loadTopSongs() {
  if (String(firebaseConfig.apiKey).startsWith('VUL')) return;
  const json = async (p) => (await (await fetch(`${firebaseConfig.databaseURL}/playlist/${p}.json`)).json()) || {};
  const [songs, votes] = await Promise.all([json('songs'), json('votes')]);
  const top = rankSongs(songs, votes).slice(0, 5);
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
loadTopSongs().catch(() => {});

// Weekendscorebord bovenaan, ververst om de 30 seconden (alleen opnieuw tekenen als er iets veranderde).
let lastScores = '';
async function loadScores() {
  if (String(firebaseConfig.apiKey).startsWith('VUL')) return;
  const json = async (p) => (await (await fetch(`${firebaseConfig.databaseURL}/${p}.json`)).json()) || {};
  const [entries, avatars, config] = await Promise.all([json('scoreboard/entries'), json('avatars').catch(() => ({})), json('scoreboard/config').catch(() => ({}))]);
  const sig = JSON.stringify([entries, config]);
  if (sig === lastScores) return;
  lastScores = sig;
  setAvatars(avatars);
  const test = config.test === true;
  const list = totals(entries, { includeTest: test });
  const latest = sortedEntries(entries).filter((e) => test || !e.test)[0];
  if (!list.length) return showLineup();
  $('#homescores').innerHTML = list.length ? `
    <div class="card home-board slide-up">
      <div class="row" style="justify-content:space-between;align-items:baseline">
        <h2 style="margin:0">🏆 Weekendscorebord</h2>
        ${latest ? `<small class="muted">Laatste: ${KIND_ICON[latest.kind] || '🎲'} ${esc(latest.title)}</small>` : ''}
      </div>
      ${test ? '<p class="sb-testnote">🧪 Testmodus: deze punten zijn een test en tellen niet echt mee.</p>' : ''}
      ${standings(list)}
    </div>` : '';
  animateFigures($('#homescores'));
}
loadScores().catch(() => {});
setInterval(() => loadScores().catch(() => {}), 30000);

// Nog geen punten: alle poppetjes naast elkaar (tik voor de signature move).
async function showLineup() {
  const names = await fetch('avatars/index.json').then((r) => r.json()).catch(() => []);
  if (!names.length) return;
  $('#homescores').innerHTML = `<div class="card home-board slide-up">
    <h2 style="margin:0">🏆 Weekendscorebord</h2>
    <p class="muted" style="margin:4px 0 0">Nog geen punten… de deelnemers warmen zich op! Tik op iemand. 👆</p>
    <div class="sb-lineup">${names.map((n) => `<figure><span class="sb-fig" data-fig="${esc(n)}" data-anim="wave" data-mood="happy"></span>
      <figcaption>${esc(n[0].toUpperCase() + n.slice(1))}</figcaption></figure>`).join('')}</div></div>`;
  animateFigures($('#homescores'));
}
