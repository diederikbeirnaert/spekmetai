// Avatarbouwer: zelf je poppetje samenstellen (hoofd, kapsel, ogen, mond, beharing, kleren, lengte…)
// en een signature move kiezen. Bewaart { bg, cfg, move } — cfg gaat rechtstreeks naar js/avatarkit.js.
import { $, $$, esc, AVATAR_BGS, avatarPreview } from './common.js?v=w1';
import { figure } from './avatarkit.js?v=w1';
import { MOVES, playMove } from './moves.js?v=w1';

const SKIN = ['#FBE2CF', '#F7D6BE', '#F6CFB2', '#F1C6A6', '#E8B48E', '#D39A6E', '#B57A50', '#8D5A38', '#6B4128'];
const HAIR = ['#2A1C14', '#4A2E1E', '#5E3A22', '#7B5033', '#94401F', '#C0602F', '#B8956A', '#C9A26B', '#E8D29A', '#8C8C8C', '#E6E6E6', '#3B5BA5', '#D9467A', '#7A4BC2'];
const EYES = ['#4A3020', '#6B4226', '#7C97A8', '#7C8A4A', '#3D6E9E', '#5E8C61', '#8A8A8A'];
const SHIRT = ['#26262E', '#3B3B4F', '#6B1F2E', '#C8553D', '#FB8500', '#FFB703', '#2E9E5B', '#2F8F9D', '#2A7FB8', '#6D7A8C', '#7A4BC2', '#D9467A', '#EDE4D3', '#FFFFFF'];
const PANTS = ['#3E4C6E', '#26262E', '#5B4636', '#6D7A8C', '#2E5E4E', '#B89B72'];
const SHOES = ['#3A2618', '#26262E', '#FFFFFF', '#C8553D', '#2A7FB8'];
const FRAMES = ['#2A1C14', '#7A2430', '#2A7FB8', '#C9A227', '#E63946'];

// Kapsels zoals de bouwer ze toont → instellingen voor de tekencode.
const HAIRCUTS = [
  ['messy', 'Warrig', { hairStyle: 'messy' }], ['swept', 'Opzij', { hairStyle: 'swept' }], ['quiff', 'Kuif', { hairStyle: 'quiff' }],
  ['neat', 'Kort', { hairStyle: 'neat' }], ['bob', 'Bob', { hairStyle: 'bob', len: 256 }], ['bobflip', 'Bob (spiegel)', { hairStyle: 'bob', len: 256, flip: true }],
  ['long', 'Lang', { hairStyle: 'long', len: 300 }], ['longwave', 'Lang & golvend', { hairStyle: 'long', len: 300, wave: true }],
  ['xlong', 'Heel lang', { hairStyle: 'long', len: 318, wave: true }], ['curly', 'Krullen', { hairStyle: 'curly' }], ['afro', 'Afro', { hairStyle: 'afro' }],
  ['bun', 'Knot', { hairStyle: 'bun' }], ['ponytail', 'Paardenstaart', { hairStyle: 'ponytail' }], ['pigtails', 'Staartjes', { hairStyle: 'pigtails' }],
  ['mohawk', 'Hanenkam', { hairStyle: 'mohawk' }], ['spiky', 'Stekels', { hairStyle: 'spiky' }], ['buzz', 'Kort geschoren', { hairStyle: 'buzz' }],
  ['bald', 'Kaal', { hairStyle: 'bald' }],
];
const BEARDS = [['none', 'Geen'], ['stubble', 'Stoppels'], ['full', 'Volle baard'], ['mustache', 'Snor'], ['handlebar', 'Krulsnor'],
  ['goatee', 'Sikje'], ['sideburns', 'Bakkebaarden'], ['chinstrap', 'Kinbaardje']];
const GLASSES = [['none', 'Geen'], ['round', 'Rond'], ['rect', 'Rechthoekig'], ['shades', 'Zonnebril'], ['sun', 'Zonnebril op het hoofd'],
  ['aviator', 'Piloot'], ['cateye', 'Cat-eye'], ['heart', 'Hartjes'], ['star', 'Sterren'], ['monocle', 'Monocle']];
const EARRINGS = [['none', 'Geen'], ['studs', 'Knopjes'], ['hoops', 'Ringen'], ['bighoops', 'Grote ringen'], ['drops', 'Druppels'], ['stars', 'Sterretjes'], ['pearls', 'Parels']];
const HATS = [['none', 'Geen'], ['cap', 'Pet'], ['beanie', 'Muts'], ['headband', 'Haarband'], ['bow', 'Strik'], ['flowers', 'Bloemenkrans'], ['party', 'Feesthoedje']];
const CLOTHES = [['tee', 'T-shirt', 't-shirt'], ['collar', 'Hemd', 'hemd'], ['knit', 'Trui', 'trui'], ['blazer', 'Blazer', 'blazer'], ['hoodie', 'Hoodie', 'hoodie'],
  ['stripes', 'Streepjestrui', 'trui'], ['flannel', 'Houthakkershemd', 'hemd'], ['overall', 'Salopette', 't-shirt eronder'], ['jersey', 'Voetbalshirt', 'shirt'],
  ['apron', 'Kokschort', 't-shirt eronder'], ['tank', 'Topje', 'topje']];
const cutOf = (c) => HAIRCUTS.find(([, , v]) => Object.entries(v).every(([k, x]) => (c[k] ?? false) === x) && (v.flip || !c.flip) && (v.wave || !c.wave))?.[0] || 'neat';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
export function randomCfg() {
  const cut = pick(HAIRCUTS)[2];
  const beard = Math.random() < 0.25 ? pick(HAIR) : null;
  return {
    face: pick(['round', 'oval', 'square']), skin: pick(SKIN), hair: pick(HAIR.slice(0, 10)), ...cut,
    eyes: pick(EYES), lashes: Math.random() < 0.5, mouth: pick(['grin', 'smile', 'smirk']),
    ...(beard ? { beard, fullBeard: Math.random() < 0.4 } : {}), shirt: pick(SHIRT), clothes: pick(['tee', 'tee', 'collar', 'knit', 'blazer']),
    height: pick([0.8, 0.9, 1, 1, 1.1]), tilt: pick([-4, -3, 3, 4]), delay: +(Math.random() * 4).toFixed(1),
  };
}

// Eén rij keuzebolletjes (kleuren) of knoppen (opties).
const swatches = (key, colors, cur) => `<div class="ab-swatches" data-k="${key}">${colors.map((c) =>
  `<button type="button" class="ab-sw ${c === cur ? 'sel' : ''}" data-v="${c}" style="background:${c}" aria-label="${c}"></button>`).join('')}</div>`;
const choices = (key, opts, cur) => `<div class="ab-choices" data-k="${key}">${opts.map(([v, label]) =>
  `<button type="button" class="ab-ch ${String(v) === String(cur) ? 'sel' : ''}" data-v="${esc(v)}">${label}</button>`).join('')}</div>`;

const SECTIONS = [
  ['🙂', 'Hoofd'], ['💇', 'Kapsel'], ['👀', 'Gezicht'], ['🧔', 'Beharing'], ['🕶️', 'Extra’s'], ['👕', 'Kleren'], ['🕺', 'Move'],
];

/**
 * Bouwer in `el`. `initial` = { bg, cfg, move }. onSave(avatar) wordt opgeroepen met de knop onderaan.
 */
export function mountBuilder(el, { initial = {}, onSave, saveLabel = 'Bewaar mijn poppetje' } = {}) {
  const st = { bg: initial.bg || 'yolk', cfg: { ...(initial.cfg || randomCfg()) }, move: initial.move || MOVES[0].id };
  let tab = 0;
  const c = st.cfg;

  const panel = () => {
    const glasses = c.glassStyle || (c.sunglasses ? 'sun' : c.glasses ? (c.rectGlasses ? 'rect' : 'round') : 'none');
    const beard = c.beard ? c.facial || (c.fullBeard ? 'full' : 'stubble') : 'none';
    const ears = c.earrings || (c.hoops ? 'hoops' : c.studs ? 'studs' : 'none');
    const cloth = CLOTHES.find(([k]) => k === (c.clothes || 'tee')) || CLOTHES[0];
    return [
      `<h4>Gezichtsvorm</h4>${choices('face', [['round', 'Rond'], ['oval', 'Ovaal'], ['square', 'Hoekig']], c.face || 'round')}
       <h4>Huidskleur</h4>${swatches('skin', SKIN, c.skin)}
       <h4>Lengte</h4><div class="ab-range"><span>Klein</span><input type="range" min="0.7" max="1.3" step="0.05" value="${c.height || 1}" data-range="height"><span>Groot</span></div>
       <h4>Achtergrond</h4><div class="bg-swatches">${AVATAR_BGS.map((b) => `<button type="button" class="bg-swatch avbg-${b.key} ${st.bg === b.key ? 'sel' : ''}" data-bg="${b.key}" title="${b.name}"></button>`).join('')}</div>`,
      `<h4>Kapsel</h4>${choices('cut', HAIRCUTS.map(([k, l]) => [k, l]), cutOf(c))}
       <h4>Haarkleur</h4>${swatches('hair', HAIR, c.hair)}`,
      `<h4>Oogkleur</h4>${swatches('eyes', EYES, c.eyes)}
       <h4>Wimpers</h4>${choices('lashes', [[false, 'Nee'], [true, 'Ja']], !!c.lashes)}
       <h4>Wenkbrauwen</h4>${choices('thickBrows', [[false, 'Gewoon'], [true, 'Dik']], !!c.thickBrows)}
       <h4>Mond</h4>${choices('mouth', [['grin', 'Grote lach'], ['smile', 'Glimlach'], ['smirk', 'Scheve grijns']], c.mouth || 'smile')}
       <h4>Sproetjes</h4>${choices('freckles', [[false, 'Nee'], [true, 'Ja']], !!c.freckles)}`,
      `<h4>Gezichtsbeharing</h4>${choices('beardKind', BEARDS, beard)}
       ${c.beard ? `<h4>Kleur</h4>${swatches('beard', HAIR, c.beard)}` : ''}`,
      `<h4>Hoofddeksel</h4>${choices('hat', HATS, c.hat || 'none')}
       ${c.hat ? `<h4>Kleur</h4>${swatches('hatColor', SHIRT, c.hatColor || '#E63946')}` : ''}
       <h4>Bril</h4>${choices('glassesKind', GLASSES, glasses)}
       ${c.glasses ? `<h4>Montuur</h4>${swatches('glasses', FRAMES, c.glasses)}` : ''}
       <h4>Oorbellen</h4>${choices('ears', EARRINGS, ears)}
       <h4>Neuspiercing</h4>${choices('noseRing', [[false, 'Nee'], [true, 'Ja']], !!c.noseRing)}
       <h4>Halsketting</h4>${choices('necklace', [[false, 'Nee'], [true, 'Ja']], !!c.necklace)}
       <h4>Baby in de armen</h4>${choices('baby', [[false, 'Nee'], [true, 'Ja 👶']], !!c.baby)}`,
      `<h4>Kleren</h4>${choices('clothes', CLOTHES.map(([k, l]) => [k, l]), cloth[0])}
       <h4>Kleur van je ${cloth[2]}</h4>${swatches('shirt', SHIRT, c.shirt)}
       ${cloth[0] === 'jersey' ? `<h4>Rugnummer</h4><input class="input" type="number" min="0" max="99" value="${esc(c.number ?? 10)}" data-num="number" style="width:100px">` : ''}
       <h4>Broek</h4>${swatches('pants', PANTS, c.pants || PANTS[0])}
       <h4>Schoenen</h4>${swatches('shoes', SHOES, c.shoes || SHOES[0])}`,
      `<h4>Kies je signature move</h4><p class="muted" style="margin:0 0 8px">Tik op het scorebord op je poppetje en het speelt deze scène.</p>
       <div class="ab-moves">${MOVES.map((m) => `<button type="button" class="ab-move ${st.move === m.id ? 'sel' : ''}" data-move="${m.id}">${esc(m.title)}</button>`).join('')}</div>
       <button type="button" class="btn small" id="ab-play" style="margin-top:10px">▶ Bekijk mijn move</button>`,
    ][tab];
  };

  const preview = () => {
    $('.ab-fig', el).innerHTML = figure(c).replace(/<svg ([^>]*)width="320" height="[\d.]+"/, '<svg $1');
    $('.ab-head', el).innerHTML = avatarPreview({ cfg: c, bg: st.bg }, 'ab-headpic');
  };
  const draw = () => {
    $('.ab-tabs', el).innerHTML = SECTIONS.map(([i, l], k) => `<button type="button" class="ab-tab ${k === tab ? 'sel' : ''}" data-tab="${k}">${i}<span>${l}</span></button>`).join('');
    $('.ab-panel', el).innerHTML = panel();
    preview();
  };

  el.innerHTML = `<div class="ab">
    <div class="ab-stage card"><div class="ab-fig" data-anim="wave" data-mood="happy"></div><div class="ab-head"></div>
      <div class="ab-moods">${[['happy', '🙂'], ['proud', '😁'], ['wink', '😉'], ['love', '😍'], ['shock', '😱'], ['sad', '😢']].map(([m, e]) => `<button type="button" data-mood="${m}" title="${m}">${e}</button>`).join('')}</div>
      <button type="button" class="btn small ghost" id="ab-rnd">🎲 Verras me</button></div>
    <div class="ab-edit card"><div class="ab-tabs"></div><div class="ab-panel"></div></div>
    <button type="button" class="btn bacon big ab-save" id="ab-save">${esc(saveLabel)}</button>
  </div>`;

  const set = (k, v) => {
    if (k === 'cut') {
      const cut = HAIRCUTS.find(([key]) => key === v)[2];
      delete c.flip; delete c.wave; delete c.len;
      Object.assign(c, cut);
    } else if (k === 'beardKind') {
      delete c.facial; delete c.fullBeard;
      if (v === 'none') delete c.beard;
      else { c.beard ||= c.hair === '#E6E6E6' ? '#8C8C8C' : c.hair; if (v === 'full') c.fullBeard = true; else if (v !== 'stubble') c.facial = v; }
    } else if (k === 'glassesKind') {
      delete c.sunglasses; delete c.rectGlasses; delete c.glassStyle;
      if (v === 'none') delete c.glasses;
      else if (v === 'sun') { delete c.glasses; c.sunglasses = true; } else {
        c.glasses ||= FRAMES[0];
        if (v === 'rect') c.rectGlasses = true;
        else if (v !== 'round') c.glassStyle = v; // speciale bril: tekent zelf het montuur in de kleur van c.glasses
      }
    } else if (k === 'ears') {
      delete c.hoops; delete c.studs; delete c.earrings;
      if (v === 'studs' || v === 'hoops') c[v] = true;
      else if (v !== 'none') c.earrings = v;
    } else if (k === 'hat') {
      if (v === 'none') { delete c.hat; } else { c.hat = v; c.hatColor ||= '#E63946'; }
    } else if (v === 'true' || v === 'false') {
      if (v === 'true') c[k] = true; else delete c[k];
    } else c[k] = v;
    draw();
  };

  el.onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.tab) { tab = +b.dataset.tab; return draw(); }
    if (b.dataset.bg) { st.bg = b.dataset.bg; return draw(); }
    if (b.dataset.move) { st.move = b.dataset.move; draw(); return playMove(st.move, figure(c)); }
    if (b.dataset.mood) { $('.ab-fig', el).dataset.mood = b.dataset.mood; return; }
    if (b.id === 'ab-play') return playMove(st.move, figure(c));
    if (b.id === 'ab-rnd') { Object.keys(c).forEach((k) => delete c[k]); Object.assign(c, randomCfg()); return draw(); }
    if (b.id === 'ab-save') return onSave?.({ bg: st.bg, cfg: { ...c }, move: st.move }, b);
    const k = b.parentElement?.dataset.k;
    if (k) set(k, b.dataset.v);
  };
  el.oninput = (e) => {
    if (e.target.dataset.range) { c[e.target.dataset.range] = +e.target.value; preview(); }
    if (e.target.dataset.num) { c[e.target.dataset.num] = Math.max(0, Math.min(99, Math.round(+e.target.value) || 0)); preview(); }
  };
  draw();
  return st;
}
