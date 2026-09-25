import { $, ART, shell, esc, md, fmtDate } from './common.js';
import { fetchLetters } from './letters.js';

shell('brief');
const id = new URLSearchParams(location.search).get('id');
$('#app').innerHTML = `<div class="card muted">Even opwarmen…</div>`;

fetchLetters().then((letters) => {
  const l = id && letters.find((x) => x.id === id);
  if (l) {
    document.title = `${l.title} · SpekmetAI`;
    $('#app').innerHTML = `
      <a href="brief.html" class="btn ghost small">← Alle brieven</a>
      <article class="card paper prose slide-up" style="margin-top:16px">
        <span class="letter-date">${esc(fmtDate(l.date))}</span>
        <h1 style="margin-top:12px">${esc(l.title)}</h1>
        ${md(l.body)}
      </article>`;
    return;
  }
  $('#app').innerHTML = `
    <h1 class="section-title" style="margin-top:0"><span class="wobble" style="width:70px">${ART.egg()}</span> Weekendbrief</h1>
    <div class="letter-list">${letters.map((x, i) => `
      <a class="card letter-item paper slide-up" style="animation-delay:${i * 0.06}s" href="brief.html?id=${encodeURIComponent(x.id)}">
        <span class="letter-date">${esc(fmtDate(x.date))}</span>
        <h2 style="margin:10px 0 0">${esc(x.title)}</h2>
      </a>`).join('') || `<div class="card muted">Nog geen brieven. De pan staat al op het vuur!</div>`}
    </div>`;
}).catch(() => { $('#app').innerHTML = `<div class="card">Kon de brieven niet laden.</div>`; });
