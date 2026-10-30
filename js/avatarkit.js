// Tekent de poppetjes in de SpekmetAI-stijl: dikke donkerbruine lijnen, platte kleuren, grote glimoogjes,
// blosjes, knipperen en zacht wiebelen. Werkt in de browser (avatarbouwer) en in Node (avatars/generate.mjs).
// avatar(p) = ronde kop-en-schouders, figure(p) = volledig poppetje met losse armen/benen en 11 gezichtsuitdrukkingen.
const INK = '#3A2618';
const W = 5; // lijndikte

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

/* ---------- Extra keuze voor de avatarbouwer ---------- */
// Alles hieronder wordt alleen getekend als de instelling bestaat, zodat de oude poppetjes exact hetzelfde blijven.

// Kapsels (voorkant): kort, stekels, hanenkam, krullen, en strak naar achter (voor knot, staart en staartjes).
const sleek = (c) => `<path d="M84 148 C80 92 116 62 160 62 C204 62 240 92 236 148 C226 112 198 96 160 96 C122 96 94 112 84 148 Z" fill="${c}" ${stroke()}/>
  ${strands(c, ['M120 80 C136 72 152 70 160 70', 'M200 80 C184 72 168 70 160 70', 'M104 104 C112 92 124 84 138 80'])}${shine(c, 'M118 78 Q138 66 160 66')}`;
const curlRing = (c, n, rx, ry, cy, r, from, to) => Array.from({ length: n }, (_, i) => {
  const a = ((from + ((to - from) * i) / (n - 1)) * Math.PI) / 180;
  return `<circle cx="${(160 + rx * Math.cos(a)).toFixed(1)}" cy="${(cy + ry * Math.sin(a)).toFixed(1)}" r="${r}" fill="${c}" ${stroke(4)}/>`;
}).join('');
Object.assign(HAIR, {
  buzz: (c) => `<path d="M84 140 C82 96 116 66 160 66 C204 66 238 96 236 140 C228 112 200 98 160 98 C120 98 92 112 84 140 Z" fill="${c}" opacity=".85" ${stroke(4)}/>
    <g fill="${shade(c, 0.7)}" opacity=".6">${[[120, 82], [140, 76], [160, 74], [180, 76], [200, 82], [108, 100], [212, 100], [130, 90], [190, 90], [160, 86]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2"/>`).join('')}</g>`,
  spiky: (c) => `<path d="M82 146 C78 110 92 86 110 76 L102 44 L130 62 L136 26 L158 54 L172 20 L184 54 L206 32 L208 66 L234 58 L226 86 C240 102 242 124 238 146 C228 120 206 106 182 102 C156 98 128 100 110 110 C96 118 88 130 82 146 Z" fill="${c}" ${stroke()}/>
    ${shine(c, 'M124 72 Q140 60 156 62')}`,
  mohawk: (c) => `<path d="M84 140 C82 96 116 66 160 66 C204 66 238 96 236 140 C228 112 200 98 160 98 C120 98 92 112 84 140 Z" fill="${c}" opacity=".35"/>
    <path d="M138 102 C132 70 138 40 148 12 L160 32 L168 6 L178 34 L190 16 C192 50 188 80 182 102 Q160 108 138 102 Z" fill="${c}" ${stroke()}/>${shine(c, 'M150 30 Q156 50 154 80')}`,
  curly: (c) => `<path d="M84 148 C80 96 116 66 160 66 C204 66 240 96 236 148 C228 120 204 104 160 104 C116 104 92 120 84 148 Z" fill="${c}" ${stroke()}/>
    ${curlRing(c, 9, 76, 64, 128, 17, 192, 348)}${curlRing(c, 5, 44, 30, 104, 14, 205, 335)}`,
  afro: (c) => `<path d="M84 150 C80 100 116 74 160 74 C204 74 240 100 236 150 C228 124 204 110 160 110 C116 110 92 124 84 150 Z" fill="${c}" ${stroke()}/>
    ${curlRing(c, 6, 52, 30, 98, 15, 200, 340)}`,
  bun: (c) => `<circle cx="160" cy="40" r="30" fill="${c}" ${stroke()}/><path d="M138 30 Q160 18 182 30 M136 46 Q160 60 184 46" stroke="${shade(c, 0.72)}" stroke-width="3" fill="none"/>
    ${sleek(c)}<path d="M140 64 Q160 72 180 64" stroke="#E63946" stroke-width="6" fill="none" stroke-linecap="round"/>`,
  ponytail: sleek,
  pigtails: (c) => `${sleek(c)}<path d="M160 64 L160 96" stroke="${shade(c, 0.6)}" stroke-width="3"/>`,
});
// Haar achter het hoofd voor de nieuwe kapsels.
const BACK = {
  afro: (c) => `<circle cx="160" cy="132" r="116" fill="${c}" ${stroke()}/>${curlRing(c, 14, 112, 106, 132, 22, 150, 390)}`,
  ponytail: (c) => `<path d="M206 80 C252 82 270 130 262 180 C256 218 270 238 282 252 C246 250 228 220 232 186 C236 150 232 118 206 104 Z" fill="${c}" ${stroke()}/>
    ${strands(c, ['M238 120 C250 150 246 190 252 222'])}<circle cx="220" cy="92" r="9" fill="#E63946" ${stroke(3)}/>`,
  pigtails: (c) => [-1, 1].map((s) => `<path d="M${160 + s * 70} 118 C${160 + s * 118} 120 ${160 + s * 126} 180 ${160 + s * 112} 240 C${160 + s * 108} 260 ${160 + s * 120} 276 ${160 + s * 132} 286 C${160 + s * 92} 284 ${160 + s * 80} 250 ${160 + s * 86} 214 C${160 + s * 90} 180 ${160 + s * 82} 150 ${160 + s * 66} 140 Z" fill="${c}" ${stroke()}/>
    <circle cx="${160 + s * 84}" cy="128" r="9" fill="#F25C78" ${stroke(3)}/>`).join(''),
};
export const backExtra = (p) => (BACK[p.hairStyle] ? BACK[p.hairStyle](p.hair) : '');

// Gezichtsbeharing (kleur = p.beard)
const FACIAL = {
  mustache: (c) => `<path d="M126 200 Q142 184 160 194 Q178 184 194 200 Q178 206 160 199 Q142 206 126 200 Z" fill="${c}" ${stroke(3.5)}/>`,
  handlebar: (c) => `<path d="M128 198 Q144 186 160 194 Q176 186 192 198 Q206 200 210 188 Q216 202 200 206 Q180 208 160 199 Q140 208 120 206 Q104 202 110 188 Q114 200 128 198 Z" fill="${c}" ${stroke(3.5)}/>`,
  goatee: (c) => `${FACIAL.mustache(c)}<path d="M144 230 Q160 258 176 230 Q168 238 160 238 Q152 238 144 230 Z" fill="${c}" ${stroke(3.5)}/>`,
  sideburns: (c) => `<path d="M80 136 L96 136 L98 186 Q88 190 82 182 Z M240 136 L224 136 L222 186 Q232 190 238 182 Z" fill="${c}" ${stroke(3.5)}/>`,
  chinstrap: (c) => `<path d="M86 164 C92 212 120 246 160 248 C200 246 228 212 234 164" stroke="${INK}" stroke-width="15" fill="none" stroke-linecap="round"/>
    <path d="M86 164 C92 212 120 246 160 248 C200 246 228 212 234 164" stroke="${c}" stroke-width="9" fill="none" stroke-linecap="round"/>`,
};
export const facialExtra = (p) => (p.beard && FACIAL[p.facial] ? FACIAL[p.facial](p.beard) : '');

// Brillen (kleur = p.glasses)
const EYEX = [128, 192];
const GLASSES = {
  shades: (c) => `${EYEX.map((x) => `<rect x="${x - 27}" y="139" width="54" height="36" rx="14" fill="#2B2D42" stroke="${c}" stroke-width="5"/>
    <path d="M${x - 16} 147 L${x - 4} 145" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/>`).join('')}
    <path d="M155 152 Q160 147 165 152" stroke="${c}" stroke-width="5" fill="none"/><path d="M101 150 L84 146 M219 150 L236 146" stroke="${c}" stroke-width="5" stroke-linecap="round"/>`,
  heart: (c) => `${EYEX.map((x) => `<path d="M${x} 182 C${x - 36} 160 ${x - 28} 128 ${x - 12} 134 C${x - 6} 136 ${x} 142 ${x} 146 C${x} 142 ${x + 6} 136 ${x + 12} 134 C${x + 28} 128 ${x + 36} 160 ${x} 182 Z" fill="rgba(242,92,120,.35)" stroke="${c}" stroke-width="5"/>`).join('')}
    <path d="M154 150 Q160 145 166 150" stroke="${c}" stroke-width="5" fill="none"/>`,
  star: (c) => `${EYEX.map((x) => `<path d="${Array.from({ length: 10 }, (_, i) => { const a = (Math.PI / 5) * i - Math.PI / 2; const r = i % 2 ? 14 : 31; return `${i ? 'L' : 'M'}${(x + r * Math.cos(a)).toFixed(1)} ${(158 + r * Math.sin(a)).toFixed(1)}`; }).join(' ')} Z" fill="rgba(255,209,102,.4)" stroke="${c}" stroke-width="4.5" stroke-linejoin="round"/>`).join('')}
    <path d="M152 152 Q160 146 168 152" stroke="${c}" stroke-width="5" fill="none"/>`,
  aviator: (c) => `${EYEX.map((x) => `<path d="M${x - 28} 140 H${x + 26} Q${x + 32} 140 ${x + 30} 150 Q${x + 24} 180 ${x} 180 Q${x - 26} 180 ${x - 31} 150 Q${x - 32} 140 ${x - 28} 140 Z" fill="rgba(140,100,50,.4)" stroke="${c}" stroke-width="4"/>`).join('')}
    <path d="M154 144 H166 M156 152 Q160 149 164 152" stroke="${c}" stroke-width="4" fill="none"/><path d="M100 146 L84 144 M220 146 L236 144" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`,
  cateye: (c) => `${EYEX.map((x, k) => { const s = k ? 1 : -1; return `<path d="M${x - s * 24} 146 Q${x} 138 ${x + s * 30} 136 Q${x + s * 28} 168 ${x} 176 Q${x - s * 26} 172 ${x - s * 24} 146 Z" fill="rgba(255,255,255,.2)" stroke="${c}" stroke-width="6" stroke-linejoin="round"/>`; }).join('')}
    <path d="M154 150 Q160 145 166 150" stroke="${c}" stroke-width="5" fill="none"/>`,
  monocle: (c) => `<circle cx="192" cy="158" r="24" fill="rgba(255,255,255,.2)" stroke="${c}" stroke-width="5"/>
    <path d="M214 168 Q232 210 222 252" stroke="${c}" stroke-width="2.5" fill="none" stroke-dasharray="4 3"/>`,
};
export const glassesExtra = (p) => (GLASSES[p.glassStyle] ? GLASSES[p.glassStyle](p.glasses || INK) : '');

// Oorbellen
const EARS = {
  bighoops: `<g fill="none" stroke="#E0B34A" stroke-width="5"><circle cx="80" cy="206" r="20"/><circle cx="240" cy="206" r="20"/></g>`,
  drops: [80, 240].map((x) => `<path d="M${x} 182 V196" stroke="#E0B34A" stroke-width="3"/><path d="M${x} 194 Q${x + 9} 208 ${x} 214 Q${x - 9} 208 ${x} 194 Z" fill="#5BC0EB" ${stroke(2)}/>`).join(''),
  stars: [80, 240].map((x) => `<path d="M${x} 180 L${x + 4} 189 L${x + 13} 190 L${x + 6} 196 L${x + 8} 205 L${x} 200 L${x - 8} 205 L${x - 6} 196 L${x - 13} 190 L${x - 4} 189 Z" fill="#FFD166" ${stroke(2)}/>`).join(''),
  pearls: [80, 240].map((x) => `<circle cx="${x}" cy="190" r="7" fill="#FBF8F3" ${stroke(2)}/><circle cx="${x - 2}" cy="188" r="2" fill="#fff"/>`).join(''),
};
export const earsExtra = (p) => EARS[p.earrings] || '';

// Hoofddeksels (kleur = p.hatColor)
const HATS = {
  cap: (c) => `<path d="M82 120 C78 70 116 42 160 42 C204 42 242 70 238 120 Z" fill="${c}" ${stroke()}/>
    <path d="M84 116 Q160 142 236 116 Q244 130 228 136 Q160 156 92 136 Q76 130 84 116 Z" fill="${shade(c, 0.75)}" ${stroke(4)}/>
    <circle cx="160" cy="44" r="7" fill="${shade(c, 0.75)}" ${stroke(3)}/><path d="M160 44 V118" stroke="${shade(c, 0.8)}" stroke-width="3"/>`,
  beanie: (c) => `<path d="M80 124 C76 62 116 34 160 34 C204 34 244 62 240 124 Z" fill="${c}" ${stroke()}/>
    <path d="M74 104 Q160 86 246 104 L246 132 Q160 114 74 132 Z" fill="${shade(c, 0.8)}" ${stroke(4)}/>
    <g stroke="${shade(c, 0.65)}" stroke-width="3">${Array.from({ length: 9 }, (_, i) => `<path d="M${90 + i * 17.5} ${102 - Math.sin((i / 8) * Math.PI) * 8} v20"/>`).join('')}</g>
    <circle cx="160" cy="28" r="16" fill="${shade(c, 1.25)}" ${stroke(4)}/>`,
  headband: (c) => `<path d="M80 110 Q160 76 240 110" stroke="${INK}" stroke-width="20" fill="none" stroke-linecap="round"/>
    <path d="M80 110 Q160 76 240 110" stroke="${c}" stroke-width="13" fill="none" stroke-linecap="round"/>`,
  bow: (c) => `<g transform="translate(212 74) rotate(18)"><path d="M0 0 L-30 -18 L-30 18 Z M0 0 L30 -18 L30 18 Z" fill="${c}" ${stroke(4)}/>
    <circle r="8" fill="${shade(c, 0.8)}" ${stroke(3)}/></g>`,
  flowers: (c) => `${Array.from({ length: 7 }, (_, i) => {
    const a = Math.PI * (1.08 + (0.84 * i) / 6);
    const x = 160 + 84 * Math.cos(a), y = 126 + 70 * Math.sin(a);
    const col = [c, '#FFD166', '#F25C78', '#fff'][i % 4];
    return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">${[0, 72, 144, 216, 288].map((d) => `<circle cx="${(9 * Math.cos((d * Math.PI) / 180)).toFixed(1)}" cy="${(9 * Math.sin((d * Math.PI) / 180)).toFixed(1)}" r="7" fill="${col}" ${stroke(2)}/>`).join('')}<circle r="5" fill="#FB8500" ${stroke(2)}/></g>`;
  }).join('')}`,
  party: (c) => `<g transform="rotate(12 160 60)"><path d="M126 66 L160 -24 L194 66 Z" fill="${c}" ${stroke(4)}/>
    <path d="M138 34 L182 40 M146 12 L174 16" stroke="#FFD166" stroke-width="7" stroke-linecap="round"/>
    <circle cx="160" cy="-26" r="10" fill="#FFD166" ${stroke(3)}/></g>`,
};
export const hatExtra = (p) => (HATS[p.hat] ? HATS[p.hat](p.hatColor || '#E63946') : '');

// Extra outfits: bovenop de basisvorm, zowel voor de ronde avatar als voor het volledige poppetje.
// band(y1, y2) = horizontaal gebied van de romp waarbinnen we patronen tekenen.
export function outfitExtra(p, { top, bottom, left, right, neck, bust = false }) {
  const c = p.shirt;
  const k = p.clothes;
  // Topje: blote schouders (bij het volledige poppetje zijn de mouwen al huidskleur).
  if (k === 'tank') return bust ? `<path d="M44 320 C48 282 84 262 118 259 L124 320 Z M276 320 C272 282 236 262 202 259 L196 320 Z" fill="${p.skin}" ${stroke()}/>` : '';
  const ys = (step) => { const out = []; for (let y = top + step; y < bottom - 4; y += step) out.push(y); return out; };
  if (k === 'stripes') return `<g stroke="#FBF8F3" stroke-width="7" opacity=".9">${ys(18).map((y) => `<path d="M${left} ${y} H${right}"/>`).join('')}</g>`;
  if (k === 'flannel') return `<g opacity=".55">${ys(22).map((y) => `<path d="M${left} ${y} H${right}" stroke="${shade(c, 0.6)}" stroke-width="7"/>`).join('')}
    ${Array.from({ length: Math.floor((right - left) / 22) }, (_, i) => `<path d="M${left + 11 + i * 22} ${top + 6} V${bottom - 6}" stroke="${shade(c, 0.6)}" stroke-width="7"/>`).join('')}</g>
    <path d="M160 ${neck + 6} V${bottom - 6}" ${stroke(3)}/>${ys(26).map((y) => `<circle cx="168" cy="${y}" r="3" fill="${INK}"/>`).join('')}`;
  if (k === 'hoodie') return `<path d="M128 ${neck - 6} Q160 ${neck + 30} 192 ${neck - 6} Q206 ${neck + 4} 196 ${neck + 14} Q160 ${neck + 44} 124 ${neck + 14} Q114 ${neck + 4} 128 ${neck - 6} Z" fill="${shade(c, 0.85)}" ${stroke(4)}/>
    <path d="M150 ${neck + 26} v26 M170 ${neck + 26} v26" stroke="#FBF8F3" stroke-width="4" stroke-linecap="round"/>
    <path d="M128 ${bottom - 34} H192 L198 ${bottom - 8} H122 Z" fill="${shade(c, 0.88)}" ${stroke(3.5)}/>`;
  if (k === 'overall') return `<path d="M124 ${neck + 30} H196 V${bottom} H124 Z" fill="#3E6A9E" ${stroke(4)}/>
    <path d="M124 ${neck + 30} L112 ${neck - 2} M196 ${neck + 30} L208 ${neck - 2}" stroke="#3E6A9E" stroke-width="12" stroke-linecap="round"/>
    <circle cx="130" cy="${neck + 36}" r="5" fill="#E0B34A" ${stroke(2)}/><circle cx="190" cy="${neck + 36}" r="5" fill="#E0B34A" ${stroke(2)}/>
    <rect x="144" y="${neck + 44}" width="32" height="24" rx="4" fill="#335A87" ${stroke(3)}/>`;
  if (k === 'jersey') return `<path d="M${left + 2} ${top + 26} H${right - 2}" stroke="#FBF8F3" stroke-width="8"/>
    <text x="160" y="${Math.min(bottom - 8, neck + 72)}" text-anchor="middle" font-family="Fredoka, sans-serif" font-weight="700" font-size="40" fill="#FBF8F3" stroke="${INK}" stroke-width="2.5">${esc(String(p.number ?? 10).slice(0, 2))}</text>`;
  if (k === 'apron') return `<path d="M126 ${neck + 14} H194 L202 ${bottom} H118 Z" fill="#FBF8F3" ${stroke(4)}/>
    <path d="M126 ${neck + 14} Q160 ${neck - 30} 194 ${neck + 14}" stroke="#FBF8F3" stroke-width="5" fill="none"/>
    <g transform="translate(160 ${neck + 50}) scale(.42)"><path d="M0 -40 C24 -40 40 -24 40 0 C40 24 22 38 0 38 C-24 38 -40 24 -40 0 C-40 -24 -24 -40 0 -40 Z" fill="#fff" ${stroke(5)}/><circle r="16" fill="#FFB703" ${stroke(5)}/></g>`;
  return '';
}
const esc = (s) => s.replace(/[&<>"']/g, '');

/* ---------- Samenstellen ---------- */
// Haar achter het hoofd (lange en halflange kapsels).
function headBack(p) {
  const long = p.hairStyle === 'long';
  const bob = p.hairStyle === 'bob';
  if (BACK[p.hairStyle]) return `<g transform="translate(160 160) scale(1.06) translate(-160 -160)">${backExtra(p)}</g>`;
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
      ${p.beard && !FACIAL[p.facial] ? beard(p.beard, p.fullBeard) : ''}
      <ellipse cx="110" cy="190" rx="15" ry="10" fill="#F28C6B" opacity=".4"/><ellipse cx="210" cy="190" rx="15" ry="10" fill="#F28C6B" opacity=".4"/>
      ${p.freckles ? freckles : ''}
      ${face}
      <path d="M157 170 Q151 186 160 189 Q167 190 170 185" ${stroke(3.5)} fill="none"/>
      ${p.noseRing ? noseRing : ''}${facialExtra(p)}
      ${long ? topMiddle(p.hair) : ''}
      ${bob ? mirror(topSide(p.hair), p.flip) : ''}
      ${HAIR[p.hairStyle] ? HAIR[p.hairStyle](p.hair) : ''}
      ${p.glasses && !GLASSES[p.glassStyle] ? glasses(p.glasses, p.rectGlasses) : ''}
      ${p.sunglasses ? sunglasses : ''}
      ${p.hoops ? hoops : ''}${p.studs ? studs : ''}${earsExtra(p)}${glassesExtra(p)}${hatExtra(p)}
    </g>`;
}

export function avatar(p) {
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
  ${(CLOTHES[p.clothes] || CLOTHES.tee)(p.shirt)}${outfitExtra(p, { top: 268, bottom: 320, left: 74, right: 246, neck: 262, bust: true })}
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
export function figure(p) {
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
  const sleeve = p.clothes === 'tank' ? p.skin : shade(shirt, 0.92);
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
      ${collar}${outfitExtra(p, { top: NY + 4, bottom: TB - 12, left: 92, right: 228, neck: NY })}
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
