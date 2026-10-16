// Tekent de avatars van de weekendgangers als geanimeerde SVG's in de SpekmetAI-stijl:
// dikke donkerbruine lijnen, platte kleuren, grote glimoogjes, blosjes, knipperen en zacht wiebelen.
// Uitvoeren: node avatars/generate.mjs — per persoon pas je alles aan in PEOPLE onderaan.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const INK = '#3A2618';
const W = 5; // lijndikte
const dir = fileURLToPath(new URL('.', import.meta.url));

// Kleur lichter (>1) of donkerder (<1) maken.
const shade = (hex, f) => '#' + hex.slice(1).match(/../g)
  .map((c) => Math.max(0, Math.min(255, Math.round(parseInt(c, 16) * f))).toString(16).padStart(2, '0')).join('');
const stroke = (w = W) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
// Spiegelen rond het midden (voor een scheiding of pony aan de andere kant).
const mirror = (svg, on) => (on ? `<g transform="translate(320 0) scale(-1 1)">${svg}</g>` : svg);

/* ---------- Gezichtsvormen ---------- */
const FACE = {
  round: 'M160 70 C214 70 244 108 244 156 C244 210 206 246 160 246 C114 246 76 210 76 156 C76 108 106 70 160 70 Z',
  oval: 'M160 68 C210 68 238 106 238 154 C238 208 204 250 160 250 C116 250 82 208 82 154 C82 106 110 68 160 68 Z',
  square: 'M160 68 C212 68 240 104 240 150 C240 198 228 228 200 242 C186 248 174 250 160 250 C146 250 134 248 120 242 C92 228 80 198 80 150 C80 104 108 68 160 68 Z',
};

/* ---------- Haar ---------- */
const shine = (c, d) => `<path d="${d}" stroke="${shade(c, 1.45)}" stroke-width="7" fill="none" stroke-linecap="round" opacity=".75"/>`;
const strands = (c, ds) => `<g stroke="${shade(c, 0.72)}" stroke-width="3" fill="none" stroke-linecap="round">${ds.map((d) => `<path d="${d}"/>`).join('')}</g>`;

// Lang/halflang haar in twee lagen, zoals in tekenfilms:
//  - sides: de haarmassa ACHTER het gezicht, die breed over de schouders uitwaaiert (met golvende punten)
//  - top:   de kruin met scheiding of pony VOOR het gezicht, die het voorhoofd omlijst
const tips = (y, xs) => xs.map(([x1, x2], k) => `Q${(x1 + x2) / 2} ${y + (k % 2 ? 8 : 14)} ${x2} ${y - (k % 2 ? 2 : 6)}`).join(' ');
const sides = (c, len, flare, wave) => {
  const l = 72 - flare; // buitenrand links
  const r = 248 + flare; // buitenrand rechts
  const il = 126; // binnenrand links (naast de hals)
  const ir = 194; // binnenrand rechts
  const third = (a, b) => [[a, a + (b - a) / 3], [a + (b - a) / 3, a + (2 * (b - a)) / 3], [a + (2 * (b - a)) / 3, b]];
  const outerL = wave ? `C${l + 10} 200 ${l - 12} 236 ${l} ${len}` : `C${l + 2} 210 ${l - 4} 250 ${l} ${len}`;
  const outerR = wave ? `C${r - 12} 236 ${r + 10} 200 252 150` : `C${r - 4} 250 ${r + 2} 210 252 150`;
  // Lang haar laat een opening voor hals en borst; halflang haar sluit gewoon achter de hals.
  const middle = len > 270
    ? `C${il + 2} ${len - 30} ${il - 4} 246 ${il + 6} 222 L${ir - 6} 222 C${ir + 4} 246 ${ir - 2} ${len - 30} ${ir} ${len - 6}`
    : `L${ir} ${len - 6}`;
  return `<path d="M160 50 C106 50 70 88 68 150 ${outerL} ${tips(len, third(l, il))}
      ${middle}
      ${tips(len, third(ir, r))} ${outerR} C250 88 214 50 160 50 Z" fill="${c}" ${stroke()}/>
    ${strands(c, [`M${l + 16} 196 C${l + 12} 230 ${l + 18} ${len - 30} ${l + 16} ${len - 8}`, `M${r - 16} 196 C${r - 12} 230 ${r - 18} ${len - 30} ${r - 16} ${len - 8}`])}`;
};
// Kruin met middenscheiding
const topMiddle = (c) => `<path d="M160 52 C110 52 74 90 74 150 C74 168 78 184 86 196 C86 162 92 132 108 112 C124 94 142 84 156 80 L160 88 L164 80 C178 84 196 94 212 112 C228 132 234 162 234 196 C242 184 246 168 246 150 C246 90 210 52 160 52 Z" fill="${c}" ${stroke()}/>
  ${strands(c, ['M160 56 L160 84', 'M116 88 C104 104 96 124 92 150', 'M204 88 C216 104 224 124 228 150'])}
  ${shine(c, 'M114 76 Q132 62 152 60')}${shine(c, 'M170 60 Q190 64 206 76')}`;
// Kruin met zijscheiding en een pony die schuin over het voorhoofd valt
const topSide = (c) => `<path d="M160 52 C110 52 74 90 74 150 C74 168 78 184 86 196 C88 162 94 136 106 120 C132 114 162 106 190 98 C208 108 224 126 232 148 C236 164 236 180 236 196 C242 184 246 168 246 150 C246 90 210 52 160 52 Z" fill="${c}" ${stroke()}/>
  <path d="M110 130 C136 124 164 116 190 108" stroke="${shade(c, 0.55)}" stroke-width="6" fill="none" opacity=".2" stroke-linecap="round"/>
  ${strands(c, ['M198 58 C196 74 194 88 190 98', 'M150 66 C136 84 120 100 106 116', 'M176 64 C168 80 158 94 146 108'])}
  ${shine(c, 'M116 74 Q140 60 168 60')}`;

const HAIR = {
  // Warrig steil haar: volume bovenop, plukken die opzij waaien en een lok naar het voorhoofd
  messy: (c) => `<path d="M82 152 C74 118 82 88 102 72 C98 58 110 46 124 46 C128 34 146 28 160 36 C170 26 192 26 202 38 C218 34 236 44 238 60 C252 70 254 96 244 112 C246 126 244 140 240 152 C234 132 222 118 208 112 C204 122 196 126 186 124 C190 116 188 108 182 104 C170 112 150 112 138 106 C128 116 108 120 96 132 C90 138 86 144 82 152 Z" fill="${c}" ${stroke()}/>
    ${strands(shade(c, 3), ['M112 100 C118 84 128 72 142 64', 'M146 94 C154 76 168 62 186 56', 'M188 98 C200 84 214 76 230 76'])}
    <g ${stroke(3)} fill="none"><path d="M156 34 C160 22 172 16 184 18"/><path d="M238 60 C248 52 258 52 266 58"/><path d="M102 72 C92 66 84 66 78 70"/></g>
    ${shine(shade(c, 2.2), 'M124 58 Q144 46 166 48')}`,
  // Kort, opgeveegd naar opzij, hoog voorhoofd
  swept: (c) => `<path d="M84 140 C80 92 114 60 160 58 C176 50 198 50 208 62 C232 72 242 104 236 140 C230 116 218 104 202 100 C188 94 170 94 156 98 C132 96 114 102 104 112 C94 120 88 130 84 140 Z" fill="${c}" ${stroke()}/>
    ${strands(c, ['M122 84 C144 72 172 70 200 80', 'M160 62 C176 58 192 60 204 68'])}${shine(c, 'M112 90 Q130 72 156 68')}`,
  // Kuif: kort aan de zijkant, vooraan opgewaaid naar één kant
  quiff: (c) => `<path d="M86 142 C82 110 92 90 110 80 C106 58 120 40 146 32 C166 26 188 28 200 40 C188 42 180 48 176 56 C200 50 224 58 234 76 C242 92 240 118 236 142 C230 120 216 108 200 104 C180 98 154 102 132 106 C112 110 96 124 86 142 Z" fill="${c}" ${stroke()}/>
    ${strands(c, ['M118 86 C128 62 148 48 172 46', 'M140 100 C158 78 188 68 220 74'])}${shine(c, 'M126 60 Q144 42 170 38')}`,
  // Kort met een korte pony
  neat: (c) => `<path d="M84 148 C78 94 114 62 160 62 C206 62 242 94 236 148 C232 122 222 112 212 106 C190 114 150 112 110 108 C98 118 90 132 84 148 Z" fill="${c}" ${stroke()}/>
    ${strands(c, ['M126 108 C130 98 134 92 138 86', 'M158 110 C162 100 166 94 168 86', 'M190 110 C194 102 198 96 202 90'])}${shine(c, 'M116 80 Q140 68 168 68')}`,
};

/* ---------- Gezicht ---------- */
const MOUTH = {
  grin: `<path d="M134 202 Q160 236 186 202 Q160 210 134 202 Z" fill="#7A2E2E" ${stroke(4)}/>
    <path d="M139 204 Q160 211 181 204 L179 211 Q160 217 141 211 Z" fill="#fff"/>
    <path d="M149 224 Q160 230 171 224" stroke="#E27B7B" stroke-width="6" fill="none" stroke-linecap="round"/>`,
  smile: `<path d="M140 206 Q160 222 180 206" ${stroke()} fill="none"/>
    <path d="M136 203 L140 207 M184 203 L180 207" ${stroke(3)} fill="none"/>`,
  smirk: `<path d="M142 210 Q164 218 184 202" ${stroke()} fill="none"/><path d="M184 202 L187 199" ${stroke(3)} fill="none"/>`,
};

// Schattige oogjes zoals het eitje-mascotte: donker ovaaltje, vleugje oogkleur, twee glimlichtjes.
function eyes(p) {
  const one = (x, side) => `
    <ellipse cx="${x}" cy="157" rx="10.5" ry="12.5" fill="${INK}"/>
    <ellipse cx="${x}" cy="160" rx="7" ry="8" fill="${p.eyes}" opacity=".9"/>
    <ellipse cx="${x}" cy="160" rx="4" ry="5" fill="${INK}"/>
    <circle cx="${x - 3.5}" cy="152" r="4" fill="#fff"/><circle cx="${x + 3.5}" cy="163" r="1.8" fill="#fff"/>
    ${p.lashes ? `<path d="M${x + side * 9} 148 L${x + side * 15} 143" ${stroke(3)} fill="none"/>` : ''}`;
  return `<g class="blink">${one(128, -1)}${one(192, 1)}</g>`;
}

const brows = (p) => {
  const y = p.browY || 134;
  return `<g stroke="${shade(p.hair, 0.85)}" stroke-width="${p.thickBrows ? 6.5 : 4.5}" fill="none" stroke-linecap="round">
    <path d="M116 ${y} Q128 ${y - 7} 141 ${y - 3}"/><path d="M179 ${y - 3} Q192 ${y - 7} 204 ${y}"/></g>`;
};

// Vier gezichtsuitdrukkingen voor de volledige poppetjes (de pagina kiest er één met .mood-*).
function expressions(p) {
  const y = p.browY || 134;
  const browC = shade(p.hair, 0.85);
  const bw = p.thickBrows ? 6.5 : 4.5;
  const browsAt = (dl, dr) => `<g stroke="${browC}" stroke-width="${bw}" fill="none" stroke-linecap="round">
    <path d="M116 ${y + dl[0]} Q128 ${y - 7 + dl[1]} 141 ${y - 3 + dl[2]}"/><path d="M179 ${y - 3 + dr[0]} Q192 ${y - 7 + dr[1]} 204 ${y + dr[2]}"/></g>`;
  const happy = `${eyes(p)}${brows(p)}${MOUTH[p.mouth || 'smile']}`;
  // Trots: dichtgeknepen lachogen, wenkbrauwen omhoog, brede grijns
  const proud = `<g stroke="${INK}" stroke-width="5.5" fill="none" stroke-linecap="round"><path d="M115 162 Q128 147 141 162"/><path d="M179 162 Q192 147 205 162"/></g>
    ${browsAt([-8, -8, -8], [-8, -8, -8])}${MOUTH.grin}`;
  // Geschrokken: grote ogen met kleine pupillen, hoge wenkbrauwen, o-mond
  const shock = `<g><circle cx="128" cy="157" r="14" fill="#fff" ${stroke(3.5)}/><circle cx="192" cy="157" r="14" fill="#fff" ${stroke(3.5)}/>
      <circle cx="128" cy="158" r="4.5" fill="${INK}"/><circle cx="192" cy="158" r="4.5" fill="${INK}"/></g>
    ${browsAt([-14, -14, -14], [-14, -14, -14])}<ellipse cx="160" cy="214" rx="10" ry="13" fill="#7A2E2E" ${stroke(4)}/>`;
  // Verdrietig: bezorgde wenkbrauwen, mondhoeken omlaag, traantje
  const sad = `${eyes(p)}${browsAt([2, -2, -9], [-9, -2, 2])}
    <path d="M140 216 Q160 200 180 216" ${stroke()} fill="none"/>
    <path class="fig-tear" d="M114 172 q6 10 0 14 q-6 -4 0 -14 Z" fill="#8FD3FF" ${stroke(2)}/>`;
  // Knipoog: één oog dicht, scheve grijns met tongetje
  const wink = `<g><ellipse cx="128" cy="157" rx="10.5" ry="12.5" fill="${INK}"/><ellipse cx="128" cy="160" rx="7" ry="8" fill="${p.eyes}" opacity=".9"/>
      <ellipse cx="128" cy="160" rx="4" ry="5" fill="${INK}"/><circle cx="124.5" cy="152" r="4" fill="#fff"/></g>
    <path d="M179 160 Q192 150 205 160" ${stroke(5.5)} fill="none"/>
    ${browsAt([0, 0, 0], [-6, -6, -6])}
    <path d="M138 204 Q162 222 184 200" ${stroke()} fill="none"/><path d="M160 212 q8 14 16 2 Z" fill="#E27B7B" ${stroke(2.5)}/>`;
  // Verliefd: hartjesogen, grote blosjes
  const heart = (x) => `<path d="M${x} 168 C${x - 18} 156 ${x - 14} 140 ${x - 6} 143 C${x - 2} 144 ${x} 148 ${x} 150 C${x} 148 ${x + 2} 144 ${x + 6} 143 C${x + 14} 140 ${x + 18} 156 ${x} 168 Z" fill="#E63946" ${stroke(3)}/>
    <circle cx="${x - 7}" cy="149" r="2.5" fill="#fff" opacity=".8"/>`;
  const love = `${heart(128)}${heart(192)}${brows(p)}
    <ellipse cx="108" cy="192" rx="17" ry="11" fill="#F25C78" opacity=".45"/><ellipse cx="212" cy="192" rx="17" ry="11" fill="#F25C78" opacity=".45"/>${MOUTH.grin}`;
  // Vastberaden: wenkbrauwen schuin naar beneden, tanden op elkaar
  const angry = `${eyes(p)}${browsAt([-6, 2, 10], [10, 2, -6])}
    <rect x="140" y="204" width="40" height="16" rx="6" fill="#fff" ${stroke(4)}/><path d="M150 205 v14 M160 205 v14 M170 205 v14 M141 212 h38" stroke="${INK}" stroke-width="2"/>`;
  // Duizelig: spiraaltjes als ogen, golvende mond
  const spiral = (x) => `<path class="fig-spiral" d="M${x} 157 m-2 0 a2 2 0 1 1 4 0 a4 4 0 1 1 -8 0 a6 6 0 1 1 12 0 a8 8 0 1 1 -16 0 a10 10 0 1 1 20 0" ${stroke(3)} fill="none"/>`;
  const dizzy = `${spiral(128)}${spiral(192)}${browsAt([-4, -6, -2], [-2, -6, -4])}
    <path d="M140 210 q5 -6 10 0 t10 0 t10 0 t10 0" ${stroke(4)} fill="none"/>`;
  // Verward: één wenkbrauw hoog, scheef mondje, vraagteken
  const confused = `<g><ellipse cx="128" cy="159" rx="9" ry="10" fill="${INK}"/><circle cx="125" cy="155" r="3" fill="#fff"/>
      <ellipse cx="192" cy="155" rx="11" ry="13" fill="${INK}"/><circle cx="188.5" cy="150" r="4" fill="#fff"/></g>
    ${browsAt([2, 2, 2], [-14, -16, -12])}
    <path d="M142 212 q6 -6 12 0 t12 0 t12 -6" ${stroke(4)} fill="none"/>
    <text x="236" y="70" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="54" fill="#FB8500" stroke="${INK}" stroke-width="2.5">?</text>`;
  // Beschaamd: ogen naar opzij, grote blosjes, klein wiebelmondje
  const shy = `<g>${[128, 192].map((x) => `<ellipse cx="${x}" cy="159" rx="10" ry="11" fill="${INK}"/><ellipse cx="${x + 4}" cy="162" rx="5" ry="6" fill="${p.eyes}"/><circle cx="${x - 3}" cy="154" r="3.5" fill="#fff"/>`).join('')}</g>
    ${browsAt([2, -3, -7], [-7, -3, 2])}
    <ellipse cx="108" cy="190" rx="22" ry="13" fill="#F25C78" opacity=".6"/><ellipse cx="212" cy="190" rx="22" ry="13" fill="#F25C78" opacity=".6"/>
    <path d="M108 186 l8 -6 M116 192 l8 -6 M200 186 l8 -6 M208 192 l8 -6" stroke="#E63946" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M148 212 q4 -4 8 0 t8 0 t8 0" ${stroke(3.5)} fill="none"/>`;
  // Uitgeput: halfgesloten ogen, hijgend met tong, zweetdruppel
  const tired = `<g>${[128, 192].map((x) => `<path d="M${x - 13} 156 q13 12 26 0 Z" fill="${INK}"/><path d="M${x - 14} 156 h28" ${stroke(4)}/>`).join('')}</g>
    ${browsAt([4, 2, 0], [0, 2, 4])}
    <ellipse cx="160" cy="214" rx="15" ry="13" fill="#7A2E2E" ${stroke(4)}/><path class="fig-tongue" d="M152 218 q8 18 16 0 Z" fill="#E27B7B" ${stroke(2.5)}/>
    <path class="fig-tear" d="M220 120 q6 10 0 14 q-6 -4 0 -14 Z" fill="#8FD3FF" ${stroke(2)}/>`;
  return [['happy', happy], ['proud', proud], ['shock', shock], ['sad', sad], ['wink', wink], ['love', love], ['angry', angry], ['dizzy', dizzy], ['confused', confused], ['shy', shy], ['tired', tired]]
    .map(([k, v]) => `<g class="ex ex-${k}">${v}</g>`).join('');
}

const beard = (c, full) => `<path d="M84 166 C88 212 116 248 160 250 C204 248 232 212 236 166 C228 196 206 210 192 210 Q160 228 128 210 C114 210 92 196 84 166 Z"
    fill="${c}" opacity="${full ? 1 : 0.22}" ${full ? stroke(4) : ''}/>
  <path d="M140 198 Q160 190 180 198 Q160 204 140 198 Z" fill="${c}" opacity="${full ? 1 : 0.35}"/>`;

const freckles = `<g fill="#C9774F" opacity=".6">${[[114, 184], [122, 190], [108, 192], [206, 184], [198, 190], [212, 192], [148, 178], [172, 178]]
  .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.3"/>`).join('')}</g>`;

/* ---------- Kleding ---------- */
const BODY = 'M44 320 C48 282 84 262 126 258 Q160 270 194 258 C236 262 272 282 276 320 Z';
const CLOTHES = {
  tee: (c) => `<path d="${BODY}" fill="${c}" ${stroke()}/><path d="M132 260 Q160 280 188 260" ${stroke(4)} fill="none"/>
    <path d="M78 290 Q86 300 90 320 M242 290 Q234 300 230 320" stroke="${shade(c, 0.8)}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  blazer: (c) => `<path d="${BODY}" fill="${c}" ${stroke()}/>
    <path d="M134 259 Q160 300 186 259 Q160 270 134 259 Z" fill="#FBF8F3" ${stroke(3.5)}/>
    <path d="M124 258 Q134 292 158 320 M196 258 Q186 292 162 320" ${stroke(4)} fill="none"/>
    <path d="M124 258 Q116 276 128 288 M196 258 Q204 276 192 288" stroke="${shade(c, 0.8)}" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  knit: (c) => `<path d="${BODY}" fill="${c}" ${stroke()}/>
    <g stroke="${shade(c, 0.86)}" stroke-width="3" stroke-linecap="round">${[70, 88, 106, 214, 232, 250].map((x) => `<path d="M${x} ${x < 160 ? 300 - (x - 70) * 0.6 : 300 - (250 - x) * 0.6} L${x} 318"/>`).join('')}</g>
    <path d="M130 262 Q160 282 190 262" stroke="${shade(c, 0.8)}" stroke-width="7" fill="none" stroke-linecap="round"/>
    <path d="M130 262 Q160 282 190 262" ${stroke(3.5)} fill="none"/>`,
  collar: (c) => `<path d="${BODY}" fill="${c}" ${stroke()}/>
    <path d="M124 258 Q126 282 146 282 Q156 278 160 264 Q164 278 174 282 Q194 282 196 258" fill="${shade(c, 1.25)}" ${stroke(4)}/>`,
};

/* ---------- Extra's ---------- */
const glasses = (c, rect) => {
  const r = rect ? 8 : 16;
  const lens = (x) => `<rect x="${x}" y="137" width="50" height="40" rx="${r}" fill="rgba(255,255,255,.2)" stroke="${c}" stroke-width="6"/>
    <path d="M${x + 8} 145 L${x + 18} 141" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/>`;
  return `${lens(103)}${lens(167)}
    <path d="M153 152 Q160 146 167 152" stroke="${c}" stroke-width="5" fill="none"/>
    <path d="M103 150 L84 146 M217 150 L236 146" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`;
};
const sunglasses = `<g transform="rotate(-6 160 74)">
    <path d="M98 76 Q160 60 222 76" ${stroke(5)} fill="none"/>
    <rect x="102" y="60" width="48" height="28" rx="13" fill="#6B4A2E" ${stroke(4)}/><rect x="170" y="60" width="48" height="28" rx="13" fill="#6B4A2E" ${stroke(4)}/>
    <path d="M110 67 L124 66 M178 67 L192 66" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/></g>`;
// Neuspiercing: subtiel, dun ringetje dat door de linkerneusvleugel prikt (rechts voor de kijker).
const noseRing = `<path d="M170.4 186.6 A2.3 2.3 0 1 1 169.4 189.8" stroke="#B8902E" stroke-width="1.9" fill="none" stroke-linecap="round"/>
  <path d="M170.4 186.6 A2.3 2.3 0 1 1 169.4 189.8" stroke="#F2C94C" stroke-width="1" fill="none" stroke-linecap="round"/>`;
// Babymeisje in de armen: roze dekentje, strikje, slaapoogjes; wiegt zachtjes (.baby-animatie)
const baby = (skin) => `<g class="baby">
    <path d="M110 302 C106 272 128 256 160 258 C198 260 224 276 222 302 C220 320 196 328 164 326 C130 326 112 318 110 302 Z" fill="#F7B7C8" ${stroke(4)}/>
    <path d="M152 264 C170 278 192 284 216 286 M126 312 C150 318 180 318 206 312" stroke="#E68AA5" stroke-width="3" fill="none" stroke-linecap="round"/>
    <circle cx="140" cy="277" r="20" fill="#F9DCC8" ${stroke(4)}/>
    <path d="M136 258 q7 -7 9 2" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <g fill="#F28BAA" ${stroke(2.5)}><path d="M140 262 l-11 -6 l0 12 Z"/><path d="M140 262 l11 -6 l0 12 Z"/><circle cx="140" cy="262" r="3.2"/></g>
    <path d="M130 277 q4 3.5 8 0 M142 277 q4 3.5 8 0" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <ellipse cx="129" cy="285" rx="4.5" ry="3" fill="#F28C6B" opacity=".5"/><ellipse cx="151" cy="285" rx="4.5" ry="3" fill="#F28C6B" opacity=".5"/>
    <path d="M137 287 q3 3 6 0" stroke="${INK}" stroke-width="2.2" fill="none" stroke-linecap="round"/>
    <ellipse cx="116" cy="300" rx="11" ry="9" fill="${skin}" ${stroke(3.5)}/><path d="M110 296 l6 2 M109 301 l6 1" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="214" cy="294" rx="11" ry="9" fill="${skin}" ${stroke(3.5)}/><path d="M220 290 l-6 2 M221 295 l-6 1" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
  </g>`;
const hoops = `<g fill="none" stroke="#E0B34A" stroke-width="4.5"><circle cx="80" cy="196" r="11"/><circle cx="240" cy="196" r="11"/></g>`;
const studs = `<g fill="#F2C94C" ${stroke(1.5)}><circle cx="80" cy="186" r="4.5"/><circle cx="240" cy="186" r="4.5"/></g>`;
const necklace = `<g fill="none" stroke="#E0B34A" stroke-width="3" stroke-linecap="round">
  <path d="M140 266 Q160 284 180 266"/><path d="M136 270 Q160 296 184 270" stroke-dasharray="5 4"/></g>`;

/* ---------- Samenstellen ---------- */
// Haar achter het hoofd (lange en halflange kapsels).
function headBack(p) {
  const long = p.hairStyle === 'long';
  const bob = p.hairStyle === 'bob';
  return long || bob ? `<g transform="translate(160 160) scale(1.06) translate(-160 -160)">${mirror(sides(p.hair, p.len || (long ? 300 : 250), p.flare ?? (long ? 10 : 4), p.wave), p.flip)}</g>` : '';
}

// Hals + gezicht + kapsel + accessoires. `face` is de gezichtsuitdrukking (gewoon, of alle vier).
function headFront(p, face) {
  const long = p.hairStyle === 'long';
  const bob = p.hairStyle === 'bob';
  return `<path d="M140 214 L140 262 Q160 276 180 262 L180 214 Z" fill="${p.skin}" ${stroke()}/>
    <path d="M140 232 Q160 246 180 232 L180 220 L140 220 Z" fill="${shade(p.skin, 0.88)}"/>
    <g transform="translate(160 160) scale(1.06) translate(-160 -160)">
      ${long || bob ? '' : `<ellipse cx="82" cy="164" rx="12" ry="17" fill="${p.skin}" ${stroke()}/><ellipse cx="238" cy="164" rx="12" ry="17" fill="${p.skin}" ${stroke()}/>`}
      <path d="${FACE[p.face || 'round']}" fill="${p.skin}" ${stroke()}/>
      ${p.beard ? beard(p.beard, p.fullBeard) : ''}
      <ellipse cx="110" cy="190" rx="15" ry="10" fill="#F28C6B" opacity=".4"/><ellipse cx="210" cy="190" rx="15" ry="10" fill="#F28C6B" opacity=".4"/>
      ${p.freckles ? freckles : ''}
      ${face}
      <path d="M157 170 Q151 186 160 189 Q167 190 170 185" ${stroke(3.5)} fill="none"/>
      ${p.noseRing ? noseRing : ''}
      ${long ? topMiddle(p.hair) : ''}
      ${bob ? mirror(topSide(p.hair), p.flip) : ''}
      ${HAIR[p.hairStyle] ? HAIR[p.hairStyle](p.hair) : ''}
      ${p.glasses ? glasses(p.glasses, p.rectGlasses) : ''}
      ${p.sunglasses ? sunglasses : ''}
      ${p.hoops ? hoops : ''}${p.studs ? studs : ''}
    </g>`;
}

function avatar(p) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" width="320" height="320">
  <style>
    .bob { transform-origin: 160px 250px; animation: bob 4.2s ease-in-out infinite; animation-delay: -${p.delay || 0}s; }
    .blink { transform-box: fill-box; transform-origin: center; animation: blink 5s infinite; animation-delay: -${p.delay || 0}s; }
    @keyframes bob { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(${p.tilt > 0 ? 2 : -2}deg) translateY(-2px); } }
    @keyframes blink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(.1); } }
    .baby { transform-origin: 166px 300px; animation: rock 3.2s ease-in-out infinite; }
    @keyframes rock { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
    @media (prefers-reduced-motion: reduce) { .bob, .blink, .baby { animation: none; } }
  </style>
  ${CLOTHES[p.clothes || 'tee'](p.shirt)}
  ${p.necklace ? necklace : ''}
  <g transform="rotate(${p.tilt || 0} 160 250)"><g class="bob">
    ${headBack(p)}
    ${headFront(p, `${eyes(p)}${brows(p)}${MOUTH[p.mouth || 'smile']}`)}
    ${p.baby ? baby(p.skin) : ''}
  </g></g>
</svg>
`;
}

/* ---------- Volledig poppetje (voor het scorebord) ---------- */
// Losse groepen (.fig-arm-l, .fig-leg-r, .fig-head, …) zodat de pagina ze kan laten bewegen,
// en vier gezichtsuitdrukkingen (.ex-happy/-proud/-shock/-sad) die de pagina aan- en uitzet.
function figure(p) {
  // Chibi-verhoudingen: groot hoofd (schaal HS), kort mollig lijfje. Alles rekent vanaf de nek (NY).
  // De lengte (p.height) zit in het lijf: het hoofd blijft voor iedereen even groot.
  const HS = 0.84;
  const H = p.height || 1;
  const HX = 160 - 160 * HS;
  const NY = 262 * HS - 6; // onderkant van de hals
  const TB = NY + Math.round(128 * (0.35 + 0.65 * H)); // onderkant van de romp
  const LB = TB + Math.max(30, Math.round(78 * (1.9 * H - 0.9))); // onderkant van de benen (lengteverschil zit vooral hier)
  const AL = Math.round(76 * (0.4 + 0.6 * H)); // armlengte
  const shirt = p.shirt;
  const sleeve = shade(shirt, 0.92);
  const pants = p.pants || '#3E4C6E';
  const shoe = p.shoes || '#3A2618';
  const arm = (side) => {
    const x = side < 0 ? 94 : 226;
    return `<g class="fig-arm fig-arm-${side < 0 ? 'l' : 'r'}">
      <path d="M${x - 16} ${NY + 16} Q${x} ${NY + 6} ${x + 16} ${NY + 16} L${x + 14} ${NY + 16 + AL} Q${x} ${NY + 24 + AL} ${x - 14} ${NY + 16 + AL} Z" fill="${sleeve}" ${stroke(4.5)}/>
      <circle cx="${x}" cy="${NY + 28 + AL}" r="17" fill="${p.skin}" ${stroke(4.5)}/></g>`;
  };
  const leg = (side) => {
    const x = side < 0 ? 136 : 184;
    return `<g class="fig-leg fig-leg-${side < 0 ? 'l' : 'r'}">
      <rect x="${x - 21}" y="${TB - 14}" width="42" height="${LB - TB + 8}" rx="18" fill="${pants}" ${stroke(4.5)}/>
      <path d="M${x - 28 + side * 6} ${LB + 4} Q${x - 28 + side * 6} ${LB - 16} ${x + side * 6} ${LB - 16} Q${x + 32 + side * 6} ${LB - 16} ${x + 34 + side * 6} ${LB + 6} Q${x + 34 + side * 6} ${LB + 18} ${x + 22 + side * 6} ${LB + 18} L${x - 20 + side * 6} ${LB + 18} Q${x - 28 + side * 6} ${LB + 18} ${x - 28 + side * 6} ${LB + 4} Z" fill="${shoe}" ${stroke(4)}/></g>`;
  };
  const collar = { blazer: `<path d="M142 ${NY + 2} Q160 ${NY + 54} 178 ${NY + 2}" fill="#FBF8F3" ${stroke(3.5)}/>`,
    collar: `<path d="M136 ${NY} Q140 ${NY + 24} 156 ${NY + 22} L160 ${NY + 8} L164 ${NY + 22} Q180 ${NY + 24} 184 ${NY}" fill="${shade(shirt, 1.25)}" ${stroke(3.5)}/>`,
    knit: `<path d="M138 ${NY + 2} Q160 ${NY + 20} 182 ${NY + 2}" stroke="${shade(shirt, 0.8)}" stroke-width="7" fill="none" stroke-linecap="round"/>` }[p.clothes]
    || `<path d="M138 ${NY + 2} Q160 ${NY + 20} 182 ${NY + 2}" ${stroke(4)} fill="none"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 ${LB + 26}" width="320" height="${LB + 26}" class="fig" data-height="${p.height || 1}">
  <g class="fig-body-all">
    ${leg(-1)}${leg(1)}
    <g class="fig-headback" transform="translate(${HX} 0) scale(${HS})">${headBack(p)}</g>
    <g class="fig-torso">
      <path d="M110 ${NY} Q160 ${NY - 12} 210 ${NY} Q242 ${NY + 12} 240 ${NY + 46} L232 ${TB - 8} Q160 ${TB + 14} 88 ${TB - 8} L80 ${NY + 46} Q78 ${NY + 12} 110 ${NY} Z" fill="${shirt}" ${stroke(4.5)}/>
      ${collar}
      <path d="M96 ${TB - 18} Q160 ${TB - 2} 224 ${TB - 18}" stroke="${shade(shirt, 0.8)}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".7"/>
    </g>
    ${p.baby ? `<g class="fig-baby" transform="translate(68 ${NY - 70}) scale(.6)">${baby(p.skin)}</g>` : ''}
    ${arm(-1)}${arm(1)}
    <g class="fig-head"><g transform="translate(${HX} 0) scale(${HS})">${headFront(p, expressions(p))}</g>
      <g class="fig-crown" transform="translate(160 ${p.hairStyle === 'messy' || p.hairStyle === 'quiff' ? 4 : 18})">
        <path d="M-34 0 L-38 -36 L-17 -16 L0 -44 L17 -16 L38 -36 L34 0 Z" fill="#FFD166" ${stroke(4)}/>
        <circle cx="0" cy="-14" r="5" fill="#E63946" ${stroke(2)}/><circle cx="-22" cy="-8" r="3.5" fill="#2A7FB8"/><circle cx="22" cy="-8" r="3.5" fill="#2E9E5B"/>
        <path d="M-26 -4 L-22 -24" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".7"/></g></g>
  </g>
</svg>
`;
}

/* ---------- De weekendgangers ---------- */
const PEOPLE = {
  femke: { height: 0.9, face: 'round', hair: '#5E3A22', hairStyle: 'bob', len: 262, skin: '#F6CFB2', eyes: '#6B4226', lashes: true, mouth: 'grin', glasses: '#7A2430', hoops: true, shirt: '#3B3B4F', tilt: -4, delay: 0 },
  charlotte: { height: 0.9, face: 'oval', hair: '#C9A26B', hairStyle: 'long', len: 300, wave: true, skin: '#F7D3B8', eyes: '#7C97A8', lashes: true, mouth: 'grin', studs: true, shirt: '#6B1F2E', tilt: 3, delay: 1.1 },
  justine: { height: 1.0, face: 'round', hair: '#C0602F', hairStyle: 'bob', len: 256, flip: true, skin: '#F6CFB2', eyes: '#7A5A3A', lashes: true, mouth: 'grin', sunglasses: true, freckles: true, shirt: '#6D7A8C', tilt: -3, delay: 2.3 },
  ines: { height: 0.72, face: 'oval', hair: '#94401F', hairStyle: 'long', len: 312, skin: '#F7D6BE', eyes: '#4A3020', lashes: true, mouth: 'smile', freckles: true, clothes: 'blazer', shirt: '#D2BC9A', necklace: true, tilt: 3, delay: 3.4 },
  diederik: { height: 1.0, face: 'round', hair: '#2A1C14', hairStyle: 'messy', skin: '#F1C6A6', eyes: '#7C8A4A', mouth: 'smile', thickBrows: true, beard: '#4A3A30', shirt: '#26262E', tilt: -3, delay: 0.6 },
  tom: { height: 0.72, face: 'round', hair: '#8A6445', hairStyle: 'swept', skin: '#F0C3A2', eyes: '#7A8B55', mouth: 'grin', beard: '#7A5A40', shirt: '#26262E', tilt: 4, delay: 1.7 },
  simon: { height: 1.0, face: 'oval', hair: '#B8956A', hairStyle: 'quiff', skin: '#F6CFB2', eyes: '#6B4A2E', mouth: 'smirk', shirt: '#2F8F9D', tilt: -4, delay: 2.8 },
  linde: { height: 1.0, face: 'oval', hair: '#7B5033', hairStyle: 'long', len: 296, wave: true, skin: '#F7D6BE', eyes: '#7C97A8', lashes: true, mouth: 'grin', noseRing: true, baby: true, clothes: 'knit', shirt: '#EDE4D3', tilt: -3, delay: 4.6 },
  karel: { height: 1.3, face: 'round', hair: '#5A3A24', hairStyle: 'neat', skin: '#F3C7A8', eyes: '#6E8797', mouth: 'grin', glasses: '#2A1C14', rectGlasses: true, beard: '#5A3A24', fullBeard: true, clothes: 'collar', shirt: '#5B6770', tilt: 3, delay: 3.9 },
};

mkdirSync(`${dir}full`, { recursive: true });
for (const [name, p] of Object.entries(PEOPLE)) {
  writeFileSync(`${dir}${name}.svg`, avatar(p));
  writeFileSync(`${dir}full/${name}.svg`, figure(p));
}
writeFileSync(`${dir}index.json`, JSON.stringify(Object.keys(PEOPLE), null, 2) + '\n');
console.log(`${Object.keys(PEOPLE).length} avatars getekend in ${dir}`);
