// Twister-draaischijf in spiegelei-stijl: 4 ledematen × 4 kleuren, een spatel als wijzer.
import { $, esc } from './common.js';

const INK = '#3A2618';
const LIMBS = [
  { name: 'Linkerhand', icon: '✋', short: 'L' },
  { name: 'Rechterhand', icon: '✋', short: 'R' },
  { name: 'Rechtervoet', icon: '🦶', short: 'R' },
  { name: 'Linkervoet', icon: '🦶', short: 'L' },
];
const COLORS = [
  { name: 'rood', hex: '#E63946' },
  { name: 'blauw', hex: '#2A7FB8' },
  { name: 'geel', hex: '#F4C20D' },
  { name: 'groen', hex: '#2E9E5B' },
];
const C = 200;
const pt = (deg, r) => [C + r * Math.sin((deg * Math.PI) / 180), C - r * Math.cos((deg * Math.PI) / 180)];
const f = (n) => n.toFixed(1);

function boardSvg() {
  // Golvend eiwit
  const blob = [];
  for (let d = 0; d < 360; d += 6) {
    const r = 190 + 5 * Math.sin((d * 5 * Math.PI) / 180) + 3 * Math.sin((d * 3 * Math.PI) / 180 + 1);
    blob.push(pt(d, r).map(f).join(','));
  }
  let parts = `<polygon points="${blob.join(' ')}" fill="#fff" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>`;

  LIMBS.forEach((limb, q) => {
    const a0 = q * 90;
    const [x1, y1] = pt(a0, 176);
    const [x2, y2] = pt(a0 + 90, 176);
    const tint = q % 2 ? '#FFF6E2' : '#FFFDF7';
    parts += `<path d="M${C},${C} L${f(x1)},${f(y1)} A176,176 0 0 1 ${f(x2)},${f(y2)} Z" fill="${tint}"/>`;
    COLORS.forEach((col, ci) => {
      const [x, y] = pt(a0 + ci * 22.5 + 11.25, 142);
      parts += `<circle cx="${f(x)}" cy="${f(y)}" r="19" fill="${col.hex}" stroke="${INK}" stroke-width="3"/>
        <ellipse cx="${f(x - 6)}" cy="${f(y - 7)}" rx="5" ry="3" fill="#fff" opacity=".7" transform="rotate(-35 ${f(x - 6)} ${f(y - 7)})"/>`;
    });
    const [lx, ly] = pt(a0 + 45, 78);
    parts += `<text x="${f(lx)}" y="${f(ly - 4)}" text-anchor="middle" font-size="28">${limb.icon}</text>
      <text x="${f(lx)}" y="${f(ly + 18)}" text-anchor="middle" font-family="Fredoka, Nunito, sans-serif" font-weight="700" font-size="12" fill="${INK}">${limb.name}</text>`;
  });

  // Spekreepjes als scheidingslijnen
  for (let q = 0; q < 4; q++) {
    const [x1, y1] = pt(q * 90, 44);
    const [x2, y2] = pt(q * 90, 180);
    parts += `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="#C8553D" stroke-width="11" stroke-linecap="round"/>
      <line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="#F6D5C3" stroke-width="3" stroke-linecap="round" stroke-dasharray="14 8"/>`;
  }

  // Spatel (draait) + dooier in het midden
  parts += `<g id="spatula">
      <rect x="194" y="104" width="12" height="100" rx="6" fill="#8C5A3C" stroke="${INK}" stroke-width="3"/>
      <path d="M200 30 L226 62 L222 110 Q200 118 178 110 L174 62 Z" fill="#B8C0CC" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
      <g stroke="${INK}" stroke-width="3" stroke-linecap="round"><line x1="192" y1="70" x2="192" y2="98"/><line x1="200" y1="66" x2="200" y2="100"/><line x1="208" y1="70" x2="208" y2="98"/></g>
    </g>
    <circle cx="200" cy="200" r="36" fill="#FFB703" stroke="${INK}" stroke-width="4"/>
    <ellipse cx="189" cy="188" rx="9" ry="5" fill="#fff" opacity=".8" transform="rotate(-35 189 188)"/>
    <circle cx="192" cy="203" r="3" fill="${INK}"/><circle cx="208" cy="203" r="3" fill="${INK}"/>
    <path d="M193 211q7 6 14 0" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
  return `<svg viewBox="0 0 400 400" role="img" aria-label="Twister-draaischijf">${parts}</svg>`;
}

export function renderTwister(el) {
  el.innerHTML = `<div class="twister">
    <div class="spinner-wrap" id="spin-wrap" title="Klik om te draaien">${boardSvg()}</div>
    <div class="tw-result" id="tw-result"><span class="muted" style="font-size:1.2rem">Klik op het ei of de knop om te draaien</span></div>
    <div class="row" style="justify-content:center">
      <button class="btn bacon big" id="tw-spin">Draai! 🍳</button>
      <label class="row" style="gap:6px;font-weight:800"><input type="checkbox" id="tw-speak" checked> Voorlezen</label>
    </div>
    <div class="tw-history" id="tw-hist"></div>
  </div>`;

  let rot = 0;
  let spinning = false;
  const history = [];
  const spatula = $('#spatula', el);

  const spin = () => {
    if (spinning) return;
    spinning = true;
    $('#tw-spin', el).disabled = true;
    $('#tw-result', el).innerHTML = '<span class="muted" style="font-size:1.2rem">Draaien…</span>';
    const wedge = Math.floor(Math.random() * 16);
    const target = wedge * 22.5 + 3 + Math.random() * 16.5; // nooit precies op een grens
    rot += 1440 + ((target - (rot % 360)) + 360) % 360;
    spatula.style.transform = `rotate(${rot}deg)`;
    setTimeout(() => {
      spinning = false;
      $('#tw-spin', el).disabled = false;
      const limb = LIMBS[Math.floor(wedge / 4)];
      const col = COLORS[wedge % 4];
      $('#tw-result', el).innerHTML = `<span class="pop-in">${esc(limb.icon)} ${esc(limb.name)}</span>
        <span class="tw-dot pop-in" style="background:${col.hex};animation-delay:.1s"></span>
        <span class="pop-in" style="animation-delay:.15s">${esc(col.name)}</span>`;
      history.unshift(`${limb.icon}${limb.short} · ${col.name}`);
      $('#tw-hist', el).innerHTML = history.slice(0, 8).map((h) => `<span>${esc(h)}</span>`).join('');
      if ($('#tw-speak', el).checked && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(`${limb.name} op ${col.name}!`);
        u.lang = 'nl-BE';
        u.voice = speechSynthesis.getVoices().find((v) => v.lang.startsWith('nl')) || null;
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
      }
    }, 4700);
  };

  $('#tw-spin', el).onclick = spin;
  $('#spin-wrap', el).onclick = spin;
}
