// Raadkaart-overzicht voor admin en admin light: ranking per weekendganger met uitklapbare gokken,
// en pinnen op de kaart met een wolkje (wie, wanneer, hoe ver).
import { esc, av } from './common.js';
import { eggPin, tColor, distanceKm, fmtKm, dayLabel, tempLabel } from './mapkit.js';

const fmtTime = (t) => new Date(t).toLocaleString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export { fmtTime };

// Alle gokken als platte lijst. Met de locatie (admin) erbij ook de echte afstand.
export function flatGuesses(all, names, spot) {
  const out = [];
  for (const [uid, g] of Object.entries(all)) {
    for (const [key, x] of Object.entries(g || {})) {
      out.push({ uid, key, name: names[uid]?.name || 'Chef-kok (test)', ...x, km: spot ? distanceKm(x, spot) : null });
    }
  }
  return out;
}
export const guessDistance = (g) => (g.km != null ? `${fmtKm(g.km)} van de locatie` : `${tempLabel(g.t)} (band)`);

// Pinnen op de kaart; klik voor wie, wanneer en hoe ver.
export function addGuessPins(L, map, list, spot) {
  const pins = {};
  for (const g of list) {
    const m = L.marker([g.lat, g.lng], { icon: eggPin(L, tColor(g.t), `${g.test ? '🧪 ' : ''}${g.name} · ${dayLabel(g.day)}`) }).addTo(map);
    m.bindPopup(`<div class="rk-pop"><b>${esc(g.name)}</b>${g.test ? ' <span class="pill" style="font-size:.7rem">🧪 test</span>' : ''}<br>
      🕒 ${esc(fmtTime(g.at))}<br><span class="rk-dot" style="background:${tColor(g.t)}"></span> ${esc(guessDistance(g))}</div>`);
    (pins[g.uid] ||= []).push(m);
  }
  if (!spot && list.length) map.fitBounds(list.map((g) => [g.lat, g.lng]), { padding: [40, 40], maxZoom: 10 });
  return pins;
}
export function focusPins(map, pins, uid) {
  const ms = pins[uid] || [];
  if (!ms.length) return;
  map.fitBounds(ms.map((m) => m.getLatLng()), { padding: [60, 60], maxZoom: 11 });
  ms.forEach((m) => m.getElement()?.classList.add('rk-flash'));
  setTimeout(() => ms.forEach((m) => m.getElement()?.classList.remove('rk-flash')), 1600);
}

// Ranking per weekendganger; klik op een naam voor al zijn gokken (datum, afstand, en wissen voor de admin).
export function mountGuessBoard(el, { list, spot, excluded = {}, onFocus, onDelete }) {
  const people = {};
  for (const g of list) (people[g.uid] ||= { uid: g.uid, name: g.name, guesses: [] }).guesses.push(g);
  const rows = Object.values(people).map((p) => {
    p.guesses.sort((a, b) => (b.at || 0) - (a.at || 0));
    p.best = spot ? p.guesses.reduce((m, g) => (g.km < m.km ? g : m)) : p.guesses.reduce((m, g) => (g.t > m.t ? g : m));
    p.out = !!excluded[p.uid];
    return p;
  }).sort((a, b) => (a.out - b.out) || (spot ? a.best.km - b.best.km : b.best.t - a.best.t || (a.best.at || 0) - (b.best.at || 0)));
  let rank = 0;
  el.innerHTML = `<h3 style="margin-top:0">Gokken per weekendganger (${list.length})</h3>
    <ol class="rk-rank rk-board">${rows.map((p) => `
      <li data-person="${esc(p.uid)}">
        <button class="rk-person" type="button">
          <span class="rk-pos">${p.out ? '🚫' : ++rank === 1 ? '🏆' : rank}</span>${av({ member: true }, p.uid)}
          <b>${esc(p.name)}</b><span class="muted">${p.guesses.length}×</span>
          <span class="rk-km" style="background:${tColor(p.best.t)}">${spot ? fmtKm(p.best.km) : esc(tempLabel(p.best.t))}</span>
        </button>
        <div class="rk-detail hidden">
          ${p.out ? '<p class="muted" style="margin:4px 0">🚫 Telt niet mee voor de winst of de ranking.</p>' : ''}
          ${p.guesses.map((g) => `<div class="rk-guess">
            <span class="rk-dot" style="background:${tColor(g.t)}"></span>
            <span class="grow">${esc(fmtTime(g.at))}${g.test ? ' <span class="pill" style="font-size:.7rem">🧪</span>' : ''}<br>
              <small class="muted">${esc(guessDistance(g))}</small></span>
            ${onDelete ? `<button class="btn small ghost icon" data-del-guess="${esc(g.key)}" title="Gok wissen">🗑</button>` : ''}
          </div>`).join('')}
        </div>
      </li>`).join('') || '<li class="muted">Nog niemand heeft gegokt.</li>'}</ol>`;
  el.querySelectorAll('[data-person]').forEach((li) => {
    const p = people[li.dataset.person];
    li.querySelector('.rk-person').onclick = () => {
      const open = li.querySelector('.rk-detail').classList.toggle('hidden') === false;
      li.classList.toggle('open', open);
      if (open) onFocus?.(p.uid);
    };
    li.querySelectorAll('[data-del-guess]').forEach((b) => {
      b.onclick = () => onDelete(p.guesses.find((g) => g.key === b.dataset.delGuess));
    });
  });
}

