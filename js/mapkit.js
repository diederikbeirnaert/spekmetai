// Gedeelde stukken voor de raadkaart: Leaflet laden, temperaturen, eierpinnen en afstanden.
import { esc } from './common.js';

// 40 temperaturen over 300 km, van t = 0 (bevroren, verder dan 300 km) tot t = 39 (raak, dichter dan 50 m).
// Tot 50 km zakt het in stapjes van ±10% (bevroren → koud), vanaf 50 km wordt het lauw en warm,
// en hoe dichter je komt, hoe fijner de stappen: op het einde komt het op tientallen meters aan.
export const EDGES = [300, 270, 243, 219, 197, 177, 160, 144, 129, 116, 105, 94, 85, 76, 69, 62, 56, 50,
  36, 26, 18.7, 13.4, 9.7, 7, 5, 3.6, 2.6, 1.9, 1.35, 0.97, 0.7, 0.5, 0.36, 0.26, 0.19, 0.135, 0.097, 0.07, 0.05];
export const STEPS = EDGES.length + 1;
export const tempFor = (km) => { let t = 0; while (t < EDGES.length && km < EDGES[t]) t++; return t; };
export const tempKey = (t) => `t${t}`;
// Tabel met grenzen (in km², vierkant) die de databaseregels gebruiken om een gok te controleren.
export const edgesTable = () => Object.fromEntries(Array.from({ length: STEPS }, (_, t) => [tempKey(t), {
  t, lo2: t < EDGES.length ? EDGES[t] ** 2 : 0, hi2: t === 0 ? 1e12 : EDGES[t - 1] ** 2,
}]));
export const tempLabel = (t) => (t === 0 ? `> ${fmtKm(EDGES[0])}` : t === STEPS - 1 ? `< ${fmtKm(EDGES.at(-1))}` : `${fmtKm(EDGES[t])} – ${fmtKm(EDGES[t - 1])}`);
// Volgorde maakt niet meer uit (we proberen alles tegelijk), maar houden de lijst voor de duidelijkheid.
export const TEMPS_HOT_FIRST = Array.from({ length: STEPS }, (_, i) => STEPS - 1 - i);

// Kleurverloop van ijsblauw naar gloeiend rood (f tussen 0 en 1).
const STOPS = [[0, '#4F9FE0'], [0.25, '#A9D8F0'], [0.45, '#F3E6CF'], [0.62, '#FFD166'], [0.8, '#F77F00'], [1, '#D62828']];
const hex = (h) => h.match(/\w\w/g).map((x) => parseInt(x, 16));
const mix = (a, b, f) => '#' + hex(a).map((v, k) => Math.round(v + (hex(b)[k] - v) * f).toString(16).padStart(2, '0')).join('');
export function tempColor(f) {
  f = Math.max(0, Math.min(1, f));
  for (let k = 1; k < STOPS.length; k++) {
    if (f <= STOPS[k][0]) return mix(STOPS[k - 1][1], STOPS[k][1], (f - STOPS[k - 1][0]) / (STOPS[k][0] - STOPS[k - 1][0]));
  }
  return STOPS.at(-1)[1];
}
export const tColor = (t) => tempColor(t / (STEPS - 1));

// Het temperatuur-ei: 40 looks van bevroren (ijsblok, mutsje, sneeuw) tot gloeiend (vlammen, vonken,
// sterretjesogen) en raak (kroontje, hartjesogen, vuurwerk). Animaties via de .te-*-klassen in style.css.
const FLAKES = [[24, 20, 0, 1], [62, 8, 1.1, 0.8], [104, 14, 0.5, 1], [138, 30, 1.6, 0.9], [14, 60, 2.1, 0.7], [146, 70, 0.8, 0.8],
  [40, 40, 2.6, 0.6], [120, 48, 1.9, 0.7], [8, 100, 0.3, 0.8], [152, 110, 1.3, 0.7], [84, 2, 2.3, 0.6]];
const FLAMES = [[28, 124, 1], [132, 124, 1], [46, 132, 0.8], [114, 132, 0.8], [16, 104, 0.75], [144, 104, 0.75], [64, 138, 0.7], [96, 138, 0.7]];
const SPARKS = [[40, 80], [122, 72], [70, 36], [100, 40], [30, 50], [130, 44], [56, 22], [110, 20]];

export function tempEgg(t, cls = '') {
  const f = t / (STEPS - 1);
  const win = f === 1;
  const range = (a, b) => f >= a && f < b;
  const ramp = (a, b) => Math.max(0, Math.min(1, (f - a) / (b - a)));
  const white = f < 0.5 ? mix('#CFEAFB', '#FFFFFF', f / 0.5) : win ? '#FFF6D6' : mix('#FFFFFF', '#FFE4D6', (f - 0.5) / 0.5);
  const yolk = win ? '#FFC300' : tempColor(f);
  const cheek = f < 0.45 ? '#7FB8E8' : f > 0.72 ? '#E23B3B' : '#F28C6B';
  const ink = '#3A2618';

  // Aantallen die geleidelijk op- of aflopen: zo is elk van de 40 eieren anders.
  const nFlakes = f < 0.36 ? Math.max(1, Math.round(11 * (0.36 - f) / 0.36)) : 0;
  const nIcicles = f < 0.3 ? Math.ceil(5 * (0.3 - f) / 0.3) : 0;
  const nDrips = range(0.26, 0.46) ? 1 + Math.round(2 * (1 - Math.abs(f - 0.36) / 0.1)) : 0;
  const nSteam = range(0.55, 0.82) ? 1 + Math.round(2 * ramp(0.55, 0.7)) : 0;
  const nBubbles = range(0.6, 0.86) ? 1 + Math.round(3 * ramp(0.6, 0.78)) : 0;
  const nFlames = f >= 0.72 ? Math.min(8, 1 + Math.round(7 * ramp(0.72, 0.97))) : 0;
  const flameSize = 0.7 + 0.6 * ramp(0.72, 1);
  const nSparks = f >= 0.8 ? Math.min(8, 1 + Math.round(7 * ramp(0.8, 1))) : 0;
  const glow = ramp(0.55, 1);
  const speed = (1.4 - 0.9 * ramp(0.6, 1)).toFixed(2); // hoe heter, hoe sneller alles gaat

  const flake = ([x, y, d, sc]) => `<g class="te-flake" style="animation-delay:${d}s" transform="translate(${x} ${y}) scale(${sc})">
    <path d="M0 -6 V6 M-5.2 -3 L5.2 3 M-5.2 3 L5.2 -3" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M0 -6 V6 M-5.2 -3 L5.2 3 M-5.2 3 L5.2 -3" stroke="#7FB8E8" stroke-width="1" stroke-linecap="round"/></g>`;
  const flame = ([x, y, sc], k) => `<g transform="translate(${x} ${y}) scale(${(sc * flameSize).toFixed(2)})"><g class="te-flame" style="animation-delay:${(k * 0.13).toFixed(2)}s">
    <path d="M0 0 C-10 -6 -8 -20 0 -34 C3 -24 12 -20 10 -8 C9 -2 5 0 0 0 Z" fill="${f > 0.9 ? '#E63946' : '#F77F00'}" stroke="${ink}" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M0 -2 C-5 -6 -4 -14 0 -20 C2 -14 6 -12 5 -6 C4 -3 2 -2 0 -2 Z" fill="#FFD166"/></g></g>`;
  const icicles = [[33, 114, 5, 17], [44, 118, 4, 13], [55, 122, 3, 9], [100, 124, 4, 14], [111, 121, 4, 11]].slice(0, nIcicles)
    .map(([x, y, w, h]) => `M${x} ${y} l${w} ${h} l${w} ${-h + 2} Z`).join(' ');

  // Ogen
  const eyes = f < 0.1
    ? `<path d="M67 80 h10 M83 80 h10" stroke="${ink}" stroke-width="3.2" stroke-linecap="round"/><path d="M66 74 l10 2 M94 74 l-10 2" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>`
    : f < 0.3
      ? `<circle cx="72" cy="81" r="3" fill="${ink}"/><circle cx="88" cy="81" r="3" fill="${ink}"/><path d="M66 73 l10 3 M94 73 l-10 3" stroke="${ink}" stroke-width="2.4" stroke-linecap="round"/>`
      : f < 0.5
        ? `<circle cx="72" cy="80" r="3.2" fill="${ink}"/><circle cx="88" cy="80" r="3.2" fill="${ink}"/>`
        : f < 0.75
          ? `<path d="M67 82 q5 -6 10 0 M83 82 q5 -6 10 0" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`
          : win
            ? `<path d="M72 86 c-8 -5 -6 -12 0 -8 c6 -4 8 3 0 8 Z M88 86 c-8 -5 -6 -12 0 -8 c6 -4 8 3 0 8 Z" fill="#E63946" stroke="${ink}" stroke-width="1.8"/>`
            : f >= 0.92
              ? `<path d="M72 74 l2 4 4.5 .6 -3.3 3 .9 4.4 -4.1 -2.2 -4.1 2.2 .9 -4.4 -3.3 -3 4.5 -.6 Z M88 74 l2 4 4.5 .6 -3.3 3 .9 4.4 -4.1 -2.2 -4.1 2.2 .9 -4.4 -3.3 -3 4.5 -.6 Z" fill="#FFD166" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round"/>`
              : `<circle cx="72" cy="80" r="4" fill="${ink}"/><circle cx="88" cy="80" r="4" fill="${ink}"/><circle cx="70.8" cy="78.6" r="1.4" fill="#fff"/><circle cx="86.8" cy="78.6" r="1.4" fill="#fff"/>`;
  // Mond
  const mouth = f < 0.2
    ? `<path d="M68 90 l4 -4 l4 4 l4 -4 l4 4 l4 -4 l4 4" stroke="${ink}" stroke-width="3" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`
    : f < 0.35
      ? `<path d="M70 90 q3 -3 6 0 t6 0 t6 0" stroke="${ink}" stroke-width="3" fill="none" stroke-linecap="round"/>`
      : f < 0.5
        ? `<ellipse cx="80" cy="90" rx="3.5" ry="4" fill="${ink}"/>`
        : f < 0.7
          ? `<path d="M72 88 q8 8 16 0" stroke="${ink}" stroke-width="3.5" fill="none" stroke-linecap="round"/>`
          : f < 0.85 || win
            ? `<path d="M70 87 q10 12 20 0 Z" fill="#7A2E2E" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>${win ? '<path d="M77 93 q3 5 6 0" fill="#E27B7B"/>' : ''}`
            : `<ellipse cx="80" cy="91" rx="7" ry="8" fill="#7A2E2E" stroke="${ink}" stroke-width="3"/>`;

  const mood = f < 0.3 ? 'shiver' : f < 0.72 ? 'bobble' : win ? 'party' : 'dance';
  return `<svg class="temp-egg ${mood} ${cls}" viewBox="0 0 160 160" style="--te-speed:${speed}s" aria-label="Temperatuur ${t + 1} van ${STEPS}">
    ${glow ? `<g class="te-halo" opacity="${(glow * 0.65).toFixed(2)}"><circle cx="80" cy="84" r="76" fill="${yolk}" opacity=".22"/><circle cx="80" cy="84" r="62" fill="${yolk}" opacity=".32"/></g>` : ''}
    ${f >= 0.93 ? `<g class="te-fireworks">${[[26, 26, '#FFD166'], [134, 28, '#E63946'], [18, 88, '#2A7FB8'], [142, 92, '#2E9E5B']].slice(0, win ? 4 : 2).map(([x, y, c], k) =>
      `<g class="te-burst" style="animation-delay:${k * 0.35}s" transform="translate(${x} ${y})">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M0 0 L0 -12" stroke="${c}" stroke-width="3" stroke-linecap="round" transform="rotate(${a})"/>`).join('')}</g>`).join('')}</g>` : ''}
    ${nSteam ? `<g stroke="#C9B79C" stroke-width="4" fill="none" stroke-linecap="round">${[[58, 34, 0], [80, 28, 0.7], [102, 34, 1.4]].slice(0, nSteam)
      .map(([x, y, d]) => `<path class="te-steam" style="animation-delay:${d}s" d="M${x} ${y} q-6 -8 0 -16 t0 -14"/>`).join('')}</g>` : ''}
    ${nBubbles ? `<g fill="#FFF3D6" stroke="#E0B34A" stroke-width="1.5">${[[30, 112, 4, 0], [132, 104, 3.5, 0.5], [124, 124, 3, 1], [38, 128, 3, 0.25]].slice(0, nBubbles)
      .map(([x, y, rr, d]) => `<circle class="te-bubble" style="animation-delay:${d}s" cx="${x}" cy="${y}" r="${rr}"/>`).join('')}</g>` : ''}
    ${nFlames ? `<g>${FLAMES.slice(0, nFlames).map(flame).join('')}</g>` : ''}
    ${nSparks ? `<g fill="#FFD166" stroke="#F77F00" stroke-width="1">${SPARKS.slice(0, nSparks).map(([x, y], k) => `<circle class="te-spark" style="animation-delay:${(k * 0.2).toFixed(1)}s" cx="${x}" cy="${y}" r="${k % 2 ? 2 : 2.6}"/>`).join('')}</g>` : ''}
    <g transform="translate(20 30)">
      <path d="M60 6c18 0 25 9 37 13s21 15 19 31-11 21-19 29-22 15-40 13S22 90 13 79 1 53 8 38s24-18 32-25S46 6 60 6z" fill="${white}" stroke="${ink}" stroke-width="4"/>
    </g>
    ${f < 0.3 ? `<g stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" opacity="${(1 - f / 0.3).toFixed(2)}"><path d="M44 62 l0 12 M38 68 l12 0 M40 64 l8 8 M48 64 l-8 8"/><path d="M118 96 l0 10 M113 101 l10 0"/></g>` : ''}
    ${nIcicles ? `<path d="${icicles}" fill="#E6F6FF" stroke="#7FB8E8" stroke-width="2" stroke-linejoin="round"/>` : ''}
    ${nDrips ? `<g fill="#8FD3FF" stroke="${ink}" stroke-width="1.8">${[[58, 116, 0], [104, 120, 0.7], [80, 126, 1.3]].slice(0, nDrips)
      .map(([x, y, d]) => `<path class="te-drip" style="animation-delay:${d}s" d="M${x} ${y} q5 9 0 12 q-5 -3 0 -12 Z"/>`).join('')}</g>` : ''}
    ${range(0.45, 0.6) ? `<path class="te-sparkle" d="M122 44 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" fill="#FFB703" stroke="${ink}" stroke-width="2" stroke-linejoin="round"/>` : ''}
    <circle cx="80" cy="82" r="24" fill="${yolk}" stroke="${ink}" stroke-width="4"/>
    <ellipse cx="71" cy="72" rx="7" ry="4" fill="#fff" opacity=".75" transform="rotate(-35 71 72)"/>
    ${eyes}
    <circle cx="64" cy="89" r="4" fill="${cheek}" opacity=".6"/><circle cx="96" cy="89" r="4" fill="${cheek}" opacity=".6"/>
    ${mouth}
    ${range(0.1, 0.32) ? `<g class="te-hat"><path d="M56 64 C56 44 104 44 104 64 Z" fill="#2A7FB8" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
      <path d="M54 62 h52 v8 h-52 Z" fill="#fff" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/><path d="M62 52 l6 -4 M72 48 l6 -2 M86 48 l6 2" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
      <circle cx="80" cy="42" r="7" fill="#fff" stroke="${ink}" stroke-width="3"/></g>` : ''}
    ${range(0.6, 0.72) ? `<g><rect x="63" y="74" width="15" height="10" rx="4" fill="${ink}"/><rect x="82" y="74" width="15" height="10" rx="4" fill="${ink}"/>
      <path d="M78 78 h4 M63 77 l-5 -2 M97 77 l5 -2" stroke="${ink}" stroke-width="2.5" stroke-linecap="round"/><path d="M66 77 l4 -2" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".7"/></g>` : ''}
    ${range(0.72, 0.97) ? `<path class="te-sweat" d="M104 62 q5 8 0 12 q-5 -4 0 -12 Z" fill="#8FD3FF" stroke="${ink}" stroke-width="2"/>` : ''}
    ${nFlakes ? `<g>${FLAKES.slice(0, nFlakes).map(flake).join('')}</g>` : ''}
    ${f < 0.22 ? `<g class="te-brr"><path d="M104 96 q10 -6 18 0 q6 -8 14 -2 q6 8 -4 12 q-12 6 -22 0 q-8 0 -6 -10 Z" fill="#fff" stroke="#7FB8E8" stroke-width="2"/>
      <text x="120" y="104" text-anchor="middle" font-family="Fredoka, Nunito, sans-serif" font-weight="700" font-size="10" fill="#4F9FE0">brrr</text></g>` : ''}
    ${f < 0.1 ? `<g opacity="${(0.9 - f * 5).toFixed(2)}"><rect x="14" y="30" width="132" height="112" rx="16" fill="#BFE6FF" fill-opacity=".45" stroke="#7FB8E8" stroke-width="3"/>
      <path d="M24 40 l20 0 M24 48 l10 0" stroke="#fff" stroke-width="4" stroke-linecap="round"/><path d="M120 44 l-8 14 l6 6 l-6 12" stroke="#fff" stroke-width="2" fill="none" opacity=".8"/></g>` : ''}
    ${win ? `<g class="te-crown"><path d="M62 56 L64 38 L72 48 L80 34 L88 48 L96 38 L98 56 Z" fill="#FFD166" stroke="${ink}" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="80" cy="46" r="3" fill="#E63946"/><circle cx="68" cy="50" r="2" fill="#2A7FB8"/><circle cx="92" cy="50" r="2" fill="#2E9E5B"/></g>` : ''}
  </svg>`;
}

// Dagnummer (Belgische middernacht, zomertijd) — gelijk aan de berekening in de databaseregels.
export const dayIndex = (t) => Math.floor((t + 7200000) / 86400000);
export const dayLabel = (day) => new Date(day * 86400000).toLocaleDateString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short' });

// Echte afstand in km (haversine).
export function distanceKm(a, b) {
  const R = 6371;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
export function fmtKm(km) {
  return km < 1 ? `${Math.round(km * 1000)} m` : km < 10 ? `${km.toFixed(1).replace('.', ',')} km` : `${Math.round(km)} km`;
}

/* ---------- Leaflet ---------- */
let leafletPromise;
export function loadLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  leafletPromise ||= new Promise((res, rej) => {
    const css = Object.assign(document.createElement('link'), { rel: 'stylesheet', href: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css' });
    const js = Object.assign(document.createElement('script'), { src: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js' });
    js.onload = () => res(window.L);
    js.onerror = rej;
    document.head.append(css, js);
  });
  return leafletPromise;
}

// Kaart in spek-met-ei-kleuren (warme filter op de OpenStreetMap-tegels, zie .egg-map in style.css).
export async function makeMap(el, { center = [50.8, 4.4], zoom = 7 } = {}) {
  const L = await loadLeaflet();
  const map = L.map(el, { zoomControl: true, attributionControl: true, worldCopyJump: true }).setView(center, zoom);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);
  el.classList.add('egg-map');
  return map;
}

// Eierpin in de kleur van een temperatuur.
export function eggPin(L, color, label = '') {
  return L.divIcon({
    className: 'egg-pin',
    iconSize: [38, 46],
    iconAnchor: [19, 44],
    html: `<svg viewBox="0 0 38 46"><path d="M19 44 C19 44 4 30 4 17 A15 15 0 0 1 34 17 C34 30 19 44 19 44 Z" fill="#fff" stroke="#3A2618" stroke-width="2.5"/>
      <circle cx="19" cy="17" r="9" fill="${color}" stroke="#3A2618" stroke-width="2"/>
      <ellipse cx="15.5" cy="13.5" rx="3" ry="1.8" fill="#fff" opacity=".7" transform="rotate(-35 15.5 13.5)"/></svg>
      ${label ? `<span class="egg-pin-label">${esc(label)}</span>` : ''}`,
  });
}

// Pin met iemands avatar (voor de onthulling).
export function avatarPin(L, avatarHtml, label) {
  return L.divIcon({
    className: 'avatar-pin',
    iconSize: [54, 64],
    iconAnchor: [27, 62],
    html: `<div class="avatar-pin-head">${avatarHtml}</div><div class="avatar-pin-tip"></div>${label ? `<span class="egg-pin-label">${esc(label)}</span>` : ''}`,
  });
}

// De grote gebarsten-ei-pin op de echte locatie.
export function goalPin(L) {
  return L.divIcon({
    className: 'goal-pin',
    iconSize: [80, 80],
    iconAnchor: [40, 62],
    html: `<svg viewBox="0 0 120 100"><path d="M60 6c18 0 25 9 37 13s21 15 19 31-11 21-19 29-22 15-40 13S22 90 13 79 1 53 8 38s24-18 32-25S46 6 60 6z" fill="#fff" stroke="#3A2618" stroke-width="4"/>
      <circle cx="60" cy="52" r="22" fill="#FFB703" stroke="#3A2618" stroke-width="4"/>
      <ellipse cx="51" cy="42" rx="7" ry="4" fill="#fff" opacity=".8" transform="rotate(-35 51 42)"/>
      <circle cx="52" cy="53" r="3" fill="#3A2618"/><circle cx="68" cy="53" r="3" fill="#3A2618"/>
      <path d="M53 60q7 6 14 0" stroke="#3A2618" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`,
  });
}
