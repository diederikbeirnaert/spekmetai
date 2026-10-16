// Signature moves: tik op een poppetje op het scorebord en het speelt een korte scène op een podium.
// Rekwisieten worden in dezelfde coördinaten als het poppetje getekend (avatars/full/*.svg, 320 breed).
import { esc } from './common.js';

const INK = '#3A2618';
const S = (w = 4) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

// Maten van het poppetje (gelijk aan figure() in avatars/generate.mjs).
function geom(h) {
  const NY = 262 * 0.84 - 6;
  const TB = NY + Math.round(128 * (0.35 + 0.65 * h));
  const LB = TB + Math.max(30, Math.round(78 * (1.9 * h - 0.9)));
  const AL = Math.round(76 * (0.4 + 0.6 * h));
  return {
    NY, TB, LB, AL, ground: LB + 18, hand: NY + 28 + AL,
    eyes: [[133, 132], [187, 132]], mouth: [160, 175], face: [160, 134],
  };
}

const rnd = (a, b) => a + Math.random() * (b - a);
const many = (n, fn) => Array.from({ length: n }, (_, i) => fn(i)).join('');

/* ---------- De scènes ---------- */
// Elke scène geeft: titel, rekwisieten achter/voor het poppetje, rekwisieten in de hand,
// en een tijdlijn van stappen [ms, { mood, anim, on: ['klasse', …], off: [...] }].
const SCENES = {
  karel: (g) => ({
    title: '🧪 Karel de chemicus',
    coat: `<path class="mv mv-coat" d="M104 ${g.NY - 4} L216 ${g.NY - 4} L246 ${g.NY + 46} L240 ${g.TB + 22} L80 ${g.TB + 22} L74 ${g.NY + 46} Z" fill="#fff" ${S(4.5)}/>
      <path class="mv mv-coat" d="M140 ${g.NY - 2} L160 ${g.NY + 60} L180 ${g.NY - 2}" fill="#E8EEF5" ${S(3.5)}/>
      <path class="mv mv-coat" d="M160 ${g.NY + 60} L160 ${g.TB + 20}" ${S(3)}/>
      <rect class="mv mv-coat" x="184" y="${g.NY + 66}" width="30" height="26" rx="4" fill="#fff" ${S(3)}/>
      <path class="mv mv-coat" d="M192 ${g.NY + 66} v-14 M202 ${g.NY + 66} v-10" stroke="#2A7FB8" stroke-width="4" stroke-linecap="round"/>`,
    sleeves: `<path class="mv mv-coat" d="M${210} ${g.NY + 16} Q226 ${g.NY + 6} 242 ${g.NY + 16} L240 ${g.NY + 16 + g.AL} Q226 ${g.NY + 24 + g.AL} 212 ${g.NY + 16 + g.AL} Z" fill="#fff" ${S(4.5)}/>`,
    sleevesL: `<path class="mv mv-coat" d="M78 ${g.NY + 16} Q94 ${g.NY + 6} 110 ${g.NY + 16} L108 ${g.NY + 16 + g.AL} Q94 ${g.NY + 24 + g.AL} 80 ${g.NY + 16 + g.AL} Z" fill="#fff" ${S(4.5)}/>`,
    handR: `<g class="mv mv-tube"><g transform="translate(226 ${g.hand + 4})">
        <rect x="-11" y="0" width="22" height="80" rx="11" fill="rgba(220,240,255,.85)" ${S(3.5)}/>
        <rect class="mv-liquid" x="-8" y="4" width="16" height="44" rx="8" fill="#5BE37D"/>
        <circle class="mv-bubble" cx="-2" cy="30" r="3" fill="#C9FFD8"/><circle class="mv-bubble b2" cx="3" cy="40" r="2.5" fill="#C9FFD8"/>
        <path d="M-14 80 h28" ${S(4)}/></g></g>`,
    front: `<g transform="translate(238 ${g.NY - 40})"><g class="mv mv-boom">
        <path d="M0 -70 L18 -26 L66 -36 L30 0 L62 38 L14 22 L0 70 L-14 22 L-62 38 L-30 0 L-66 -36 L-18 -26 Z" fill="#FFD166" ${S(4)}/>
        <path d="M0 -40 L10 -14 L38 -20 L16 0 L36 22 L8 12 L0 40 L-8 12 L-36 22 L-16 0 L-38 -20 L-10 -14 Z" fill="#F77F00"/>
        <text x="0" y="8" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="30" fill="${INK}">BOEM</text></g></g>
      <g class="mv mv-soot">${many(7, () => `<circle cx="${rnd(112, 208)}" cy="${rnd(96, 176)}" r="${rnd(6, 13)}" fill="#3A3A3A" opacity=".55"/>`)}</g>
      <g class="mv mv-smoke">${many(5, (i) => `<circle class="mv-puff" style="animation-delay:${i * 0.25}s" cx="${rnd(110, 210)}" cy="${rnd(20, 60)}" r="${rnd(14, 24)}" fill="#BDB3A6"/>`)}</g>`,
    steps: [[0, { mood: 'happy', anim: 'none' }], [300, { on: ['mv-coat'] }], [1100, { anim: 'hold', mood: 'proud', on: ['mv-tube'] }],
      [1500, { on: ['fill'] }], [2700, { anim: 'zap', mood: 'shock', on: ['shake'] }], [3300, { on: ['mv-boom', 'mv-soot', 'mv-smoke', 'flash'], off: ['mv-tube'] }],
      [3900, { anim: 'wobble', mood: 'dizzy' }], [5000, { anim: 'none', mood: 'confused' }]],
  }),

  simon: (g) => ({
    title: '💶 Simon de bankier',
    head: `<g class="mv mv-euroeyes">${g.eyes.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="17" fill="#fff" ${S(3)}/>
        <text x="${x}" y="${y + 11}" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="30" fill="#1E9E52">€</text>`).join('')}</g>`,
    front: `<g class="mv mv-bills">${many(22, (i) => `<g class="mv-bill" style="--dx:${rnd(-260, 260).toFixed(0)}px;--up:${rnd(220, 420).toFixed(0)}px;--rot:${rnd(-540, 540).toFixed(0)}deg;animation-delay:${(i % 11) * 0.12 + (i > 10 ? 1 : 0)}s">
        <rect x="${rnd(140, 180)}" y="${g.NY - 30}" width="46" height="24" rx="3" fill="#7BC97F" ${S(2.5)}/>
        <circle cx="${0}" cy="0" r="0"/></g>`)}</g>`,
    handR: `<rect class="mv mv-wad" x="212" y="${g.hand - 4}" width="30" height="18" rx="3" fill="#7BC97F" ${S(2.5)}/>`,
    handL: `<rect class="mv mv-wad" x="80" y="${g.hand - 4}" width="30" height="18" rx="3" fill="#7BC97F" ${S(2.5)}/>`,
    steps: [[0, { mood: 'happy', anim: 'none', on: ['mv-wad'] }], [600, { mood: 'shock', on: ['mv-euroeyes'] }],
      [1300, { mood: 'proud', anim: 'cheer', on: ['mv-bills'], off: ['mv-wad'] }], [3600, { anim: 'dance' }], [4800, { anim: 'none', mood: 'wink', off: ['mv-euroeyes'] }]],
  }),

  tom: (g) => {
    const top = g.ground - 330;
    return {
      title: '⚡ Tom de elektricien',
      back: `<g class="mv mv-ladder">
          <path d="M262 ${g.ground} L282 ${top} M318 ${g.ground} L298 ${top}" ${S(6)} fill="none"/>
          ${many(7, (i) => `<path d="M${264 + i * 2.6} ${g.ground - 22 - i * 34} H${316 - i * 2.6}" ${S(5)}/>`)}
        </g>
        <g class="mv mv-lamp" transform="translate(300 ${top - 60})">
          <path d="M0 -200 V-10" ${S(4)}/><path d="M-18 -10 h36 v12 h-36 Z" fill="#888" ${S(3)}/>
          <circle cx="0" cy="22" r="20" fill="#FFF3B0" ${S(3.5)}/></g>`,
      front: `<g class="mv mv-bolts">${many(5, (i) => `<path class="mv-bolt" style="animation-delay:${i * 0.08}s" d="M${300 + (i - 2) * 26} ${top - 20} l-12 30 h14 l-14 34 l30 -42 h-14 l12 -22 Z" fill="#FFE14D" ${S(3)}/>`)}</g>
        <g class="mv mv-smoke">${many(4, (i) => `<circle class="mv-puff" style="animation-delay:${i * 0.2}s" cx="${rnd(130, 190)}" cy="${rnd(10, 50)}" r="${rnd(12, 20)}" fill="#BDB3A6"/>`)}</g>`,
      figpos: 'climb',
      steps: [[0, { mood: 'happy', anim: 'run', on: ['mv-ladder', 'mv-lamp'] }], [200, { pos: 'to-ladder' }], [1100, { pos: 'up-ladder', anim: 'run' }],
        [2000, { anim: 'reach', mood: 'wink' }], [2500, { anim: 'zap', mood: 'shock', on: ['mv-bolts', 'zapped'] }],
        [3500, { off: ['mv-bolts', 'zapped'], on: ['mv-smoke'], pos: 'fall', anim: 'none', mood: 'dizzy' }], [4100, { anim: 'wobble' }],
        [5000, { anim: 'none', mood: 'confused' }]],
    };
  },

  diederik: (g) => {
    const lx = 160;
    const ly = g.NY + 70;
    return {
      title: '💻 Diederik de IT\'er',
      front: `<g class="mv mv-laptop" style="--fall:${g.ground - ly - 10}px">
          <path d="M${lx - 58} ${ly - 46} h116 v54 h-116 Z" fill="#C9CED6" ${S(4)}/>
          <circle cx="${lx}" cy="${ly - 19}" r="8" fill="#fff" opacity=".8"/>
          <path d="M${lx - 70} ${ly + 8} h140 l-8 12 h-124 Z" fill="#AEB4BE" ${S(4)}/>
          <g class="mv-shards">${many(6, (i) => `<path style="--sx:${rnd(-70, 70).toFixed(0)}px;--sy:${rnd(-60, -10).toFixed(0)}px;--sr:${rnd(-300, 300).toFixed(0)}deg" d="M${lx - 50 + i * 18} ${ly - 30} l14 -8 l8 18 l-16 6 Z" fill="#9AA1AB" ${S(2)}/>`)}</g>
        </g>
        <g class="mv mv-error" transform="translate(236 ${g.NY - 150})">
          <rect x="-58" y="-26" width="116" height="46" rx="10" fill="#fff" ${S(3.5)}/>
          <text x="0" y="5" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="20" fill="#E63946">⚠ ERROR</text></g>
        <g class="mv mv-steam">${[[96, 40], [224, 40]].map(([x, y], i) => `<path class="mv-puff" style="animation-delay:${i * 0.3}s" d="M${x} ${y} q-8 -14 0 -26 t0 -24" stroke="#E0705C" stroke-width="6" fill="none" stroke-linecap="round"/>`).join('')}</g>
`,
      redface: true,
      steps: [[0, { mood: 'happy', anim: 'type', on: ['mv-laptop'] }], [1300, { on: ['mv-error'], mood: 'shock' }],
        [2000, { mood: 'angry', on: ['mv-redface', 'mv-steam'] }], [2700, { anim: 'throw', on: ['thrown'], off: ['mv-error'] }],
        [3200, { anim: 'stomp', on: ['smashed'] }], [4600, { mood: 'shy', anim: 'none', off: ['mv-redface', 'mv-steam'] }]],
    };
  },

  ines: (g) => {
    const fx = 290; // chocoladefontein
    const tiers = [[g.ground - 70, 70], [g.ground - 150, 50], [g.ground - 220, 32]];
    return {
      title: '🍫 Ines en de chocoladefontein',
      back: `<g class="mv mv-fountain"><g class="mv-fshake">
          <path d="M${fx - 14} ${g.ground} V${tiers[2][0] - 20} M${fx + 14} ${g.ground} V${tiers[2][0] - 20}" stroke="#C9CED6" stroke-width="10"/>
          ${tiers.map(([y, r]) => `<ellipse cx="${fx}" cy="${y}" rx="${r}" ry="12" fill="#C9CED6" ${S(3.5)}/>
            <path d="M${fx - r} ${y} q${r} 26 ${2 * r} 0 v14 q${-r} 22 ${-2 * r} 0 Z" fill="#6B3B1F" ${S(3)}/>`).join('')}
          <ellipse cx="${fx}" cy="${tiers[2][0] - 24}" rx="14" ry="8" fill="#6B3B1F" ${S(3)}/>
          <path d="M${fx - 90} ${g.ground} h180 v-14 q-90 -18 -180 0 Z" fill="#6B3B1F" ${S(3)}/></g></g>
        <g class="mv mv-spray">${many(14, (k) => `<circle class="mv-glob" style="--gx:${rnd(-320, 120).toFixed(0)}px;--gy:${rnd(-260, -80).toFixed(0)}px;animation-delay:${(k * 0.09).toFixed(2)}s" cx="${fx}" cy="${tiers[2][0] - 30}" r="${rnd(6, 13).toFixed(0)}" fill="#6B3B1F" ${S(2)}/>`)}</g>`,
      handR: `<g class="mv mv-berry"><g transform="translate(226 ${g.hand + 6})"><path d="M0 0 V54" stroke="#C08552" stroke-width="5" stroke-linecap="round"/>
          <path d="M-14 54 Q0 92 14 54 Q0 46 -14 54 Z" fill="#E63946" ${S(3)}/><path d="M-10 52 l5 -8 l5 6 l5 -6 l5 8" fill="#2E9E5B" ${S(2)}/>
          <path class="mv-dip" d="M-14 62 Q0 92 14 62 Q0 70 -14 62 Z" fill="#6B3B1F"/>
          ${[[-5, 64], [4, 72], [6, 60]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="#FFE14D"/>`).join('')}</g></g>`,
      front: `<g class="mv mv-wave"><g class="mv-waveinner">
          <path d="M60 ${g.ground + 8} V${g.NY + 12} q14 -18 28 -4 q10 22 22 2 q16 -20 32 -2 q12 18 24 0 q16 -20 32 -2 q12 20 24 2 q14 -18 30 4 V${g.ground + 8} Z" fill="#6B3B1F" ${S(4)}/>
          <path d="M84 ${g.NY + 40} q10 28 0 40 M228 ${g.NY + 46} q10 24 0 36" stroke="#8B5A2B" stroke-width="6" fill="none" stroke-linecap="round"/>
          ${many(26, (k) => `<rect class="mv-sprinkle" style="animation-delay:${(0.8 + k * 0.03).toFixed(2)}s" x="${rnd(76, 240).toFixed(0)}" y="${rnd(g.NY + 30, g.ground - 20).toFixed(0)}" width="12" height="4" rx="2"
            fill="${['#E63946', '#FFD166', '#2A7FB8', '#2E9E5B', '#F28BAA', '#fff'][k % 6]}" transform="rotate(${rnd(0, 180).toFixed(0)} 0 0)" transform-origin="center"/>`)}
        </g></g>
        <g class="mv mv-cherry"><g class="mv-cherryfall"><path d="M160 22 q4 -24 18 -34" stroke="#2E9E5B" stroke-width="4" fill="none" stroke-linecap="round"/>
          <circle cx="160" cy="34" r="16" fill="#E63946" ${S(3.5)}/><ellipse cx="154" cy="28" rx="5" ry="3" fill="#fff" opacity=".7"/></g></g>`,
      steps: [[0, { mood: 'happy', anim: 'none', on: ['mv-fountain', 'mv-berry'] }], [400, { anim: 'hold', mood: 'love' }], [1100, { on: ['dip'] }],
        [1900, { anim: 'none', mood: 'shock', on: ['fshake', 'mv-spray'] }], [2700, { on: ['mv-wave'] }],
        [3700, { mood: 'confused', on: ['mv-cherry'], off: ['fshake', 'mv-spray'] }], [4900, { mood: 'wink' }]],
    };
  },

  linde: (g) => {
    const y = g.ground - 14;
    return {
      title: '🐍 Linde en haar slang',
      front: `<g class="mv mv-snake"><g class="mv-snakewalk" style="--sx:${-430}px"><g class="mv-snakebody">
          <path d="M-60 ${y} q20 -26 40 0 t40 0 t40 0 t40 0 q12 0 22 -10" stroke="${INK}" stroke-width="22" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M-60 ${y} q20 -26 40 0 t40 0 t40 0 t40 0 q12 0 22 -10" stroke="#5BA84F" stroke-width="15" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M-40 ${y - 8} l6 4 M0 ${y - 8} l6 4 M40 ${y - 8} l6 4 M80 ${y - 8} l6 4" stroke="#FFD166" stroke-width="4" stroke-linecap="round"/></g>
          <g class="mv-snakehead"><ellipse cx="110" cy="${y - 16}" rx="22" ry="16" fill="#5BA84F" ${S(4)}/>
            <circle cx="114" cy="${y - 22}" r="4" fill="${INK}"/><circle cx="115" cy="${y - 23}" r="1.4" fill="#fff"/>
            <ellipse cx="104" cy="${y - 12}" rx="5" ry="3" fill="#F28C6B" opacity=".6"/>
            <path class="mv-tongue" d="M131 ${y - 12} h14 l5 -4 M145 ${y - 12} l5 4" stroke="#E63946" stroke-width="3" fill="none" stroke-linecap="round"/></g>
        </g></g>
        <g class="mv mv-hearts">${many(6, (k) => `<path class="mv-heart" style="animation-delay:${(k * 0.3).toFixed(1)}s" transform="translate(${[60, 0, 110, 30, 90, -20][k]} ${g.NY - 40 - (k % 3) * 30}) scale(${k % 2 ? 0.8 : 1.1})" d="M0 10 C-14 0 -12 -12 -5 -10 C-2 -9 0 -6 0 -4 C0 -6 2 -9 5 -10 C12 -12 14 0 0 10 Z" fill="#E63946" ${S(2)}/>`)}</g>`,
      steps: [[0, { mood: 'happy', anim: 'none', on: ['mv-snake'] }], [1900, { mood: 'wink', on: ['stop'] }],
        [2400, { anim: 'pet', mood: 'love', on: ['mv-hearts'] }], [4800, { anim: 'none' }]],
    };
  },

  femke: (g) => {
    const wx = 250;
    const rows = 10;
    const bh = 26;
    const bricks = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < 4; c++) {
        const x = wx + c * 40 - (r % 2 ? 20 : 0);
        bricks.push(`<rect class="mv-brick" style="--bx:${rnd(-50, 60).toFixed(0)}px;--by:${r * bh * 0.85}px;--br:${rnd(-110, 110).toFixed(0)}deg;animation-delay:${(rows - r) * 0.05 + rnd(0, 0.1)}s"
          x="${x}" y="${g.ground - (r + 1) * bh}" width="40" height="${bh}" fill="${r % 2 ? '#C8553D' : '#D9684F'}" ${S(2.5)}/>`);
      }
    }
    const fy = g.ground - 7 * bh; // hoogte van het kadertje
    const nail = [326, fy - 44];
    return {
      title: '🔨 Femke hangt een kadertje op',
      back: `<g class="mv mv-wall"><clipPath id="mvwall"><rect x="${wx - 80}" y="${g.ground - rows * bh - 40}" width="300" height="${rows * bh + 60}"/></clipPath>
          <g clip-path="url(#mvwall)">${bricks.join('')}</g></g>
        <g class="mv mv-cracks">${[`M${nail[0]} ${nail[1]} l-14 22 l8 18 l-16 24 l6 22 l-12 30`, `M${nail[0]} ${nail[1]} l18 16 l-6 20 l20 22`, `M${nail[0]} ${nail[1]} l-4 -26 l12 -18`, `M${nail[0] - 22} ${nail[1] + 64} l-26 10 l-10 24`]
          .map((d, k) => `<path class="mv-crack" style="animation-delay:${k * 0.18}s" d="${d}" ${S(3.5)} fill="none"/>`).join('')}</g>`,
      handR: `<g class="mv mv-hammer"><g transform="translate(226 ${g.hand})"><rect x="-5" y="0" width="10" height="66" rx="4" fill="#A0672F" ${S(3)}/>
          <rect x="-22" y="58" width="44" height="22" rx="4" fill="#8A93A0" ${S(3.5)}/></g></g>`,
      front: `<g class="mv mv-nail"><circle cx="${nail[0]}" cy="${nail[1]}" r="4" fill="#8A93A0" ${S(2)}/></g>
        <g class="mv mv-frame" style="--fx:-70px;--fy:${g.ground - fy - 34}px;transform-origin:${nail[0]}px ${fy}px"><g transform="translate(${nail[0]} ${fy})"><g class="mv-frameinner">
          <path d="M-30 -30 L0 -44 L30 -30" stroke="${INK}" stroke-width="2.5" fill="none"/>
          <rect x="-40" y="-30" width="80" height="66" rx="4" fill="#B5793F" ${S(3.5)}/><rect x="-30" y="-20" width="60" height="46" fill="#BFE3F2" ${S(2)}/>
          <g class="mv-cat"><path d="M-17 4 L-14 -14 L-5 -6 Z M17 4 L14 -14 L5 -6 Z" fill="#F4A340" ${S(2)}/><circle cx="0" cy="8" r="16" fill="#F4A340" ${S(2.5)}/>
            <circle class="mv-cateye" cx="-6" cy="5" r="2.6" fill="${INK}"/><circle class="mv-cateye" cx="6" cy="5" r="2.6" fill="${INK}"/>
            <path d="M-3 11 q3 3 6 0" stroke="${INK}" stroke-width="2" fill="none"/><path d="M-20 10 h10 M-20 14 h10 M10 10 h10 M10 14 h10" stroke="${INK}" stroke-width="1.2"/></g>
          <text x="0" y="-36" text-anchor="middle" font-size="12">💖</text></g></g></g>
        <g class="mv mv-tik">${['tik', 'tik', 'TIK!'].map((t, k) => `<text class="mv-hahat" style="animation-delay:${k * 0.35}s" x="${nail[0] + 24}" y="${nail[1] - 14 - k * 16}" font-family="Fredoka, sans-serif" font-weight="700" font-size="${18 + k * 3}" fill="${INK}">${t}</text>`).join('')}</g>
        <g class="mv mv-perfect"><text x="70" y="40" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="28" fill="#2E9E5B" stroke="#fff" stroke-width="1">Perfect! 😌</text></g>
        <g class="mv mv-krak"><text x="${nail[0]}" y="${nail[1] - 40}" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="30" fill="#E63946" stroke="${INK}" stroke-width="1.5">krak…</text></g>
        <g class="mv mv-dust">${many(9, (k) => `<circle class="mv-puff" style="animation-delay:${k * 0.1}s" cx="${wx + rnd(-30, 130)}" cy="${g.ground - rnd(0, 80)}" r="${rnd(18, 34)}" fill="#D8CBB8"/>`)}</g>`,
      steps: [[0, { mood: 'happy', anim: 'none', on: ['mv-wall', 'mv-hammer', 'mv-nail', 'mv-frame', 'crooked'] }], [500, { anim: 'tap', on: ['mv-tik'] }],
        [1800, { anim: 'none', off: ['crooked', 'mv-tik'], mood: 'proud', on: ['mv-perfect'] }], [2700, { off: ['mv-perfect'], on: ['mv-cracks', 'mv-krak'], mood: 'shock' }],
        [3600, { on: ['collapse', 'mv-dust'], off: ['mv-krak', 'mv-nail'], anim: 'none' }], [4400, { mood: 'shy' }]],
    };
  },

  justine: (g) => {
    const ty = g.hand - 8; // tafelblad
    return {
      title: '🧵 Justine aan de naaimachine',
      front: `<g class="mv mv-machine">
          <rect x="44" y="${ty}" width="232" height="16" rx="4" fill="#C08552" ${S(4)}/>
          <path d="M60 ${ty + 16} V${g.ground} M260 ${ty + 16} V${g.ground}" ${S(8)} stroke="#8A5A33"/>
          <g class="mv-fabric"><path d="M-40 ${ty - 12} H140 V${ty} H-40 Z" fill="#F28BAA" ${S(2.5)}/><path d="M-40 ${ty - 6} H140" stroke="#fff" stroke-width="2.5" stroke-dasharray="7 6"/></g>
          <g transform="translate(150 ${ty}) scale(.78) translate(-150 ${-ty})">
          <path d="M96 ${ty} V${ty - 20} H236 V${ty} Z" fill="#F7F1E8" ${S(4)}/>
          <path d="M200 ${ty - 20} V${ty - 86} H96 V${ty - 60} H200" fill="none" ${S(0)}/>
          <rect x="198" y="${ty - 92}" width="38" height="74" rx="10" fill="#F7F1E8" ${S(4)}/>
          <rect x="90" y="${ty - 96}" width="146" height="30" rx="12" fill="#F7F1E8" ${S(4)}/>
          <rect x="90" y="${ty - 96}" width="34" height="56" rx="8" fill="#F7F1E8" ${S(4)}/>
          <text x="166" y="${ty - 76}" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="13" fill="#E63946">NAAI-O-MATIC</text>
          <g class="mv-needlebar"><path d="M107 ${ty - 42} V${ty - 12}" stroke="#8A93A0" stroke-width="5" stroke-linecap="round"/></g>
          <g class="mv-spool" style="transform-origin:180px ${ty - 108}px"><rect x="168" y="${ty - 118}" width="24" height="20" rx="3" fill="#E63946" ${S(3)}/>
            <path d="M168 ${ty - 112} h24 M168 ${ty - 104} h24" stroke="#fff" stroke-width="1.5"/></g>
          <path d="M180 ${ty - 98} Q140 ${ty - 110} 107 ${ty - 42}" stroke="#E63946" stroke-width="2" fill="none"/>
          </g>
        </g>
        <g class="mv mv-rata"><text x="300" y="${ty - 150}" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="28" fill="${INK}">RATATATATA</text></g>
        <g class="mv mv-tadaa"><text x="70" y="40" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="32" fill="#E63946" stroke="#fff" stroke-width="1">TADAA! ✨</text></g>
        <g class="mv mv-oeps"><text x="270" y="40" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="30" fill="#E63946" stroke="${INK}" stroke-width="1.5">OEPS…</text></g>
        <g class="mv mv-plof"><text x="330" y="${g.ground - 190}" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="34" fill="${INK}">PLOF!</text>
          ${many(5, (k) => `<circle class="mv-puff" style="animation-delay:${k * 0.1}s" cx="${rnd(260, 420)}" cy="${g.ground - rnd(0, 20)}" r="${rnd(12, 22)}" fill="#D8CBB8"/>`)}
          ${many(4, (k) => `<path class="mv-star" style="animation-delay:${k * 0.15}s" d="M${380 + k * 18} ${g.ground - 70 - (k % 2) * 14} l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 z" fill="#FFD166" ${S(1.5)}/>`)}</g>`,
      // Het rokje hangt aan het lijf, zodat het mee omvalt
      body: `<g class="mv mv-skirt" style="--drop:${g.LB - g.TB - 4}px">
          <path d="M100 ${g.TB - 22} L220 ${g.TB - 22} L250 ${g.TB + 44} L70 ${g.TB + 44} Z" fill="#F28BAA" ${S(4)}/>
          <path d="M100 ${g.TB - 22} L220 ${g.TB - 22} L222 ${g.TB - 10} L98 ${g.TB - 10} Z" fill="#E86E93" ${S(3)}/>
          ${many(5, (k) => `<circle cx="${100 + k * 30}" cy="${g.TB + 18 + (k % 2) * 10}" r="5" fill="#fff" opacity=".8"/>`)}</g>`,
      steps: [[0, { mood: 'happy', anim: 'sew', pos: 'behind', on: ['mv-machine', 'mv-rata'] }], [2200, { off: ['mv-machine', 'mv-rata'], on: ['mv-skirt', 'mv-tadaa'], anim: 'spin', mood: 'proud', pos: 'none' }],
        [3600, { off: ['mv-tadaa'], on: ['drop', 'mv-oeps'], anim: 'none', mood: 'shock' }], [4300, { anim: 'run' }],
        [4700, { anim: 'none', on: ['trip', 'mv-plof'], off: ['mv-oeps'] }], [5300, { mood: 'shy' }]],
    };
  },

  charlotte: (g) => {
    const hy = g.hand - 18; // stuur
    const fw = g.ground - 46; // vliegwiel
    return {
      title: '🚴 Charlotte op de spinningfiets',
      back: `<g class="mv mv-bike"><path d="M100 ${g.TB - 8} h120" ${S(14)} stroke="#2B2D42"/></g>
        <g class="mv mv-coach"><path d="M-150 30 h170 a12 12 0 0 1 12 12 v40 a12 12 0 0 1 -12 12 h-120 l-24 18 l4 -18 h-30 a12 12 0 0 1 -12 -12 v-40 a12 12 0 0 1 12 -12 z" fill="#fff" ${S(3)}/>
          <text class="mv-c1" x="-65" y="70" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="17" fill="#E63946">NOG 10 SECONDEN!!</text>
          <text class="mv-c2" x="-65" y="70" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="15" fill="#E63946">grapje… nog 10 min 😈</text></g>`,
      front: `<g class="mv mv-bike">
          <path d="M40 ${g.ground + 4} H280" ${S(14)} stroke="#2B2D42"/>
          <path d="M160 ${hy + 10} V${fw}" ${S(12)} stroke="#2B2D42"/>
          <g class="mv-flywheel"><ellipse cx="160" cy="${fw}" rx="16" ry="44" fill="#4C5070" ${S(4)}/>
            <path class="mv-flystripe" d="M150 ${fw - 30} h20 M150 ${fw} h20 M150 ${fw + 30} h20" stroke="#9AA1AB" stroke-width="4"/></g>
          <path d="M100 ${hy} Q160 ${hy + 16} 220 ${hy}" ${S(10)} stroke="#2B2D42" fill="none"/>
          <circle cx="100" cy="${hy}" r="9" fill="#E63946" ${S(3)}/><circle cx="220" cy="${hy}" r="9" fill="#E63946" ${S(3)}/>
          <rect x="132" y="${hy - 26}" width="56" height="26" rx="6" fill="#1E2030" ${S(3)}/>
          <text class="mv-k1" x="160" y="${hy - 8}" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="13" fill="#5BE37D">12 km/u</text>
          <text class="mv-k2" x="160" y="${hy - 8}" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="13" fill="#FFD166">48 km/u</text>
          <text class="mv-k3" x="160" y="${hy - 8}" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="13" fill="#E63946">99 🔥</text></g>
        <g class="mv mv-speed">${many(5, (k) => `<path class="mv-line" style="animation-delay:${k * 0.12}s" d="M${300 + (k % 2) * 20} ${g.NY + k * 36} h70" stroke="#C9B79C" stroke-width="6" stroke-linecap="round"/>`)}</g>
        <g class="mv mv-sweat">${many(10, (k) => `<path class="mv-drop" style="animation-delay:${k * 0.12}s;--dx:${(k % 2 ? 1 : -1) * rnd(60, 130).toFixed(0)}px" d="M${k % 2 ? 214 : 106} ${rnd(70, 130).toFixed(0)} q6 10 0 14 q-6 -4 0 -14 Z" fill="#8FD3FF" ${S(2)}/>`)}</g>
        <ellipse class="mv mv-puddle" cx="160" cy="${g.ground + 8}" rx="120" ry="12" fill="#8FD3FF" opacity=".7"/>
        <g class="mv mv-steam">${[[110, 30], [210, 30], [160, 10]].map(([x, y], k) => `<path class="mv-puff" style="animation-delay:${k * 0.3}s" d="M${x} ${y} q-8 -14 0 -26 t0 -24" stroke="#E0705C" stroke-width="6" fill="none" stroke-linecap="round"/>`).join('')}</g>`,
      redface: true,
      figpos: 'sit',
      steps: [[0, { mood: 'happy', anim: 'pedal', pos: 'sit', on: ['mv-bike', 'k1'] }], [700, { mood: 'angry', anim: 'pedal-fast', on: ['mv-speed', 'mv-redface', 'r1', 'mv-coach', 'c1'] }],
        [1800, { on: ['mv-sweat', 'r2', 'k2'], off: ['k1'] }], [2600, { on: ['c2'], off: ['c1'], mood: 'shock' }],
        [3200, { on: ['r3', 'k3', 'mv-steam'], off: ['k2'], mood: 'angry' }], [4300, { anim: 'slump', mood: 'tired', off: ['mv-speed'], on: ['mv-puddle'] }]],
    };
  },
};

const svgCache = new Map();
const loadFigure = (name) => {
  if (!svgCache.has(name)) svgCache.set(name, fetch(`avatars/full/${name}.svg`).then((r) => (r.ok ? r.text() : '')).catch(() => ''));
  return svgCache.get(name);
};
export const hasMove = (name) => !!SCENES[name];

let playing = null;

export async function playMove(name, displayName = '') {
  const scene = SCENES[name];
  const raw = await loadFigure(name);
  if (!scene || !raw) return;
  playing?.close();

  const h = Number(raw.match(/data-height="([\d.]+)"/)?.[1] || 1);
  const H = Number(raw.match(/viewBox="0 0 320 ([\d.]+)"/)?.[1] || 446);
  const g = geom(h);
  const sc = scene(g);
  // Het poppetje als genest svg, zodat de rekwisieten in dezelfde coördinaten kunnen staan.
  const figure = raw.replace(/<svg ([^>]*)width="320" height="[\d.]+"/, '<svg $1x="0" y="0" width="320" height="' + H + '"');
  const box = document.createElement('div');
  box.className = 'mv-stage';
  box.innerHTML = `<div class="mv-box pop-in" role="dialog" aria-label="${esc(sc.title)}">
      <div class="mv-scene" data-anim="none" data-mood="happy">
        <svg class="mv-svg" viewBox="-220 -170 760 ${H + 200}">
          <ellipse cx="160" cy="${g.ground + 6}" rx="230" ry="16" fill="rgba(58,38,24,.12)"/>
          ${sc.back || ''}
          <g class="mv-figpos">${figure}</g>
          ${sc.front || ''}
        </svg>
      </div>
    </div>`;
  document.body.append(box);
  const sceneEl = box.querySelector('.mv-scene');
  const fig = box.querySelector('.fig');
  // Rekwisieten op het lijf en in de handen, zodat ze meebewegen met de armen.
  if (sc.coat) fig.querySelector('.fig-torso')?.insertAdjacentHTML('beforeend', sc.coat);
  if (sc.sleeves) fig.querySelector('.fig-arm-r')?.insertAdjacentHTML('afterbegin', sc.sleeves);
  if (sc.sleevesL) fig.querySelector('.fig-arm-l')?.insertAdjacentHTML('afterbegin', sc.sleevesL);
  if (sc.handR) fig.querySelector('.fig-arm-r')?.insertAdjacentHTML('beforeend', sc.handR);
  if (sc.handL) fig.querySelector('.fig-arm-l')?.insertAdjacentHTML('beforeend', sc.handL);
  if (sc.head) fig.querySelector('.fig-head')?.insertAdjacentHTML('beforeend', sc.head);
  // Rekwisieten op het gezicht zelf (gezichtscoördinaten), en een rode kopie van het hele gezicht
  const faceEl = fig.querySelector('.fig-head path[d^="M160 7"], .fig-head path[d^="M160 6"]');
  if (sc.redface && faceEl) {
    const red = faceEl.cloneNode();
    red.setAttribute('fill', '#E63946');
    red.setAttribute('class', 'mv mv-redface');
    faceEl.after(red);
  }
  if (sc.face && faceEl) faceEl.parentNode.insertAdjacentHTML('beforeend', sc.face);
  if (sc.body) fig.querySelector('.fig-body-all')?.insertAdjacentHTML('beforeend', sc.body);
  fig.querySelector('.fig-crown')?.remove();

  const timers = [];
  const close = () => {
    timers.forEach(clearTimeout);
    box.classList.add('closing');
    setTimeout(() => box.remove(), 250);
    if (playing?.box === box) playing = null;
  };
  playing = { box, close };
  box.addEventListener('click', close);
  document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc); } });

  for (const [ms, st] of sc.steps) {
    timers.push(setTimeout(() => {
      if (st.mood) sceneEl.dataset.mood = st.mood;
      if (st.anim) sceneEl.dataset.anim = st.anim;
      if (st.pos) sceneEl.dataset.pos = st.pos;
      // 'on-'-voorvoegsel zodat de toestand niet botst met klassen van de rekwisieten zelf
      (st.on || []).forEach((c) => sceneEl.classList.add(`on-${c}`));
      (st.off || []).forEach((c) => sceneEl.classList.remove(`on-${c}`));
    }, ms));
  }
  const end = Math.max(...sc.steps.map(([ms]) => ms)) + 1800;
  timers.push(setTimeout(close, end));
}
