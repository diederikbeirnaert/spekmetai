import { $, ART, shell, esc, fmtDate } from './common.js';
import { fetchLetters } from './letters.js';
import { firebaseConfig } from './firebase-config.js';
import { rankSongs } from './songs.js?v=3';

shell('home');

$('#app').innerHTML = `
  <section class="hero">
    <div class="slide-up">
      <h1>Spekmet<span class="ai">AI</span><br><span style="font-size:.55em">de sappigste quiz van het weekend</span></h1>
      <p class="lead">Pak je gsm, vul de code in en bak er iets van. Wie het snelst antwoordt, scoort het meeste spek!</p>
      <form class="join-box" id="join">
        <input class="input" id="code" inputmode="numeric" pattern="[0-9]*" maxlength="6" placeholder="123456" aria-label="Quizcode" autocomplete="off">
        <button class="btn bacon big" type="submit">Doe mee!</button>
      </form>
    </div>
    <div class="hero-art pop-in">${ART.pan}</div>
  </section>

  <div class="features">
    <div class="card feature slide-up" style="animation-delay:.1s"><div class="wobble">${ART.egg()}</div><h3>Code intikken</h3><p class="muted">Zes cijfers, meer niet. Geen account nodig.</p></div>
    <div class="card feature slide-up" style="animation-delay:.2s"><div class="sizzle">${ART.bacon(true)}</div><h3>Snel antwoorden</h3><p class="muted">Tik op het juiste spiegelei. Hoe sneller, hoe meer punten.</p></div>
    <div class="card feature slide-up" style="animation-delay:.3s"><div class="float">${ART.toast}</div><h3>Op het podium</h3><p class="muted">De top 3 wordt gebakken in eeuwige roem.</p></div>
  </div>

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
        <p class="muted">${esc(String(l.body || '').replace(/[#*_>\[\]()!]/g, '').slice(0, 180))}…</p>
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
