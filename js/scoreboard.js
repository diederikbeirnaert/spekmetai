// Weekendscorebord: gedeelde rekenlogica en weergave (zonder Firebase, zodat ook de homepage dit kan gebruiken).
import { esc, av, avatarOf } from './common.js?v=w1';
import { playMove, hasMove, LEGACY_MOVES } from './moves.js?v=w1';
import { figure as drawFigure } from './avatarkit.js?v=w1';
// Een "ronde" is een quiz of spelletje: { title, kind: 'quiz' | 'game' | 'bonus', at, points: { uid: n }, names: { uid: naam } }.

// Punten volgens plaats: met n spelers krijgt de eerste n punten, de laatste 1.
// Bij een gelijke stand krijgen spelers evenveel punten (de hoogste van hun plaatsen).
export function placementPoints(rows) {
  const sorted = [...rows].sort((a, b) => b.score - a.score);
  const n = sorted.length;
  const out = {};
  sorted.forEach((r, i) => {
    const first = sorted.findIndex((x) => x.score === r.score);
    out[r.uid] = n - first;
  });
  return out;
}

// Punten volgens een volgorde (eerste in de lijst = winnaar), voor analoge spelletjes.
export const orderPoints = (uids) => Object.fromEntries(uids.map((uid, i) => [uid, uids.length - i]));

// Totaalklassement over alle rondes. Testpunten tellen alleen mee als `includeTest` aan staat.
export function totals(entries, { includeTest = false } = {}) {
  const people = {};
  for (const [id, e] of Object.entries(entries || {})) {
    if (e.test && !includeTest) continue;
    for (const [uid, pts] of Object.entries(e.points || {})) {
      const p = (people[uid] ||= { uid, name: e.names?.[uid] || '?', total: 0, rounds: 0, wins: 0, last: 0 });
      p.name = e.names?.[uid] || p.name;
      p.total += Number(pts) || 0;
      p.rounds++;
      const best = Math.max(...Object.values(e.points).map(Number));
      if (Number(pts) === best && e.kind !== 'bonus') p.wins++;
      p.last = Math.max(p.last, e.at || 0);
      p.lastEntry = (p.lastAt || 0) < (e.at || 0) ? id : p.lastEntry;
      p.lastAt = Math.max(p.lastAt || 0, e.at || 0);
    }
  }
  const list = Object.values(people).sort((a, b) => b.total - a.total || b.wins - a.wins || a.name.localeCompare(b.name));
  // Gedeelde plaatsen bij gelijke totalen
  list.forEach((p, i) => { p.rank = i && list[i - 1].total === p.total ? list[i - 1].rank : i + 1; });
  return list;
}

export const sortedEntries = (entries) => Object.entries(entries || {}).map(([id, e]) => ({ id, ...e })).sort((a, b) => (b.at || 0) - (a.at || 0));
export const KIND_ICON = { quiz: '🍳', game: '🎲', bonus: '⭐' };

// Het klassement als wedren: elke avatar rent over een spekreep naar zijn puntentotaal.
// Leider: kroon + salto's, 2e stuitert, 3e wiebelt, de rest dribbelt, de laatste zweet.
export function standings(list) {
  if (!list.length) return '<p class="muted" style="margin:0">Nog geen punten. Laat de spelen beginnen! 🥓</p>';
  const max = Math.max(1, ...list.map((p) => p.total));
  const lastRank = list.at(-1).rank;
  return `<ol class="sb-race">${list.map((p, i) => {
    const pct = Math.max(0, p.total) / max;
    const mood = p.rank === 1 ? 'lead' : p.rank === 2 ? 'second' : p.rank === 3 ? 'third' : list.length > 3 && p.rank === lastRank ? 'last' : 'pack';
    return `<li class="sb-lane ${mood}" style="--d:${(i * 0.12).toFixed(2)}s">
      <span class="sb-rank">${p.rank === 1 ? '🏆' : p.rank}</span>
      <span class="sb-name">${esc(p.name)}</span>
      <span class="sb-track"><i class="sb-trail" style="width:calc(${(pct * 100).toFixed(1)}% )"></i>
        <span class="sb-runner" style="--p:${pct.toFixed(3)}">
          ${mood === 'lead' ? '<span class="sb-crown">👑</span><span class="sb-spark s1">✦</span><span class="sb-spark s2">✦</span><span class="sb-spark s3">✦</span>' : ''}
          ${mood === 'last' ? '<span class="sb-sweat">💦</span>' : ''}
          ${figureSlot(p.uid)}
        </span>
        <span class="sb-finish" title="Finish">🏁</span>
      </span>
      <b class="sb-total">${p.total}</b></li>`;
  }).join('')}</ol>`;
}

/* ---------- Volledige poppetjes op het scorebord ---------- */
// Zelfgemaakte avatars (avatarbouwer) worden als volledig poppetje getekend; de getekende avatars van het
// eerste weekend (avatars/naam.svg) hebben een eigen bestand in avatars/full/. Anders: de ronde avatar.
const legacyName = (a) => (a?.img || '').match(/^avatars\/([a-z0-9-]+)\.svg$/)?.[1] || '';
const hasFigure = (a) => !!(a?.cfg || legacyName(a));
// Welke signature move speelt dit poppetje? (zelf gekozen, of die van het eerste weekend)
export const moveOf = (a) => a?.move || LEGACY_MOVES[legacyName(a)] || '';

export function figureSlot(uid, anim = 'run') {
  return hasFigure(avatarOf(uid)) ? `<span class="sb-fig" data-uid="${esc(uid)}" data-anim="${anim}" data-mood="happy"></span>`
    : `<span class="sb-ava">${av({ member: true }, uid)}</span>`;
}

const svgCache = new Map();
export function loadFigure(a) {
  if (a?.cfg) return Promise.resolve(drawFigure(a.cfg));
  const name = legacyName(a);
  if (!name) return Promise.resolve('');
  if (!svgCache.has(name)) svgCache.set(name, fetch(`avatars/full/${name}.svg`).then((r) => (r.ok ? r.text() : '')).catch(() => ''));
  return svgCache.get(name);
}

// Per plaats een paar combinaties van animatie + gezichtsuitdrukking; ze wisselen om de paar seconden.
// Gezichten passen bij de plaats: bovenaan trots en verliefd, in het midden blij of even geschrokken,
// onderaan verdrietig of duizelig.
const ROLES = {
  lead: [['cheer', 'proud'], ['flex', 'proud'], ['spin', 'love'], ['dance', 'wink'], ['cheer', 'love']],
  second: [['wave', 'happy'], ['dance', 'wink'], ['cheer', 'happy'], ['flex', 'proud']],
  third: [['dance', 'happy'], ['wave', 'wink'], ['run', 'happy'], ['spin', 'happy']],
  pack: [['run', 'happy'], ['wave', 'happy'], ['dance', 'wink'], ['run', 'shock'], ['wave', 'wink']],
  last: [['trudge', 'sad'], ['wobble', 'dizzy'], ['run', 'shock'], ['trudge', 'sad']],
  // Line-up zonder punten: iedereen vrolijk
  lineup: [['wave', 'happy'], ['dance', 'wink'], ['cheer', 'happy'], ['flex', 'proud'], ['spin', 'love'], ['dance', 'happy']],
};
let cycleTimer = null;

// Poppetjes inladen; eerst rennen ze (vastberaden) naar hun plek, daarna krijgen ze hun rol.
export async function animateFigures(root) {
  const slots = [...root.querySelectorAll('.sb-fig')];
  await Promise.all(slots.map(async (el) => {
    const a = avatarOf(el.dataset.uid);
    const svg = await loadFigure(a);
    if (!svg) return;
    el.innerHTML = svg.replace(/<svg ([^>]*)width="320" height="[\d.]+"/, '<svg $1');
    if (el.closest('.sb-lane.lead')) el.classList.add('crowned');
    // Tik op een poppetje: signature move.
    const move = moveOf(a);
    if (hasMove(move) && !el.dataset.wired) {
      el.dataset.wired = '1';
      el.title = 'Tik voor de signature move!';
      el.addEventListener('click', () => playMove(move, svg));
    }
  }));
  const lanes = slots.map((el) => ({ el, mood: el.closest('.sb-lineup') ? 'lineup' : el.closest('.sb-lane')?.className.match(/\b(lead|second|third|pack|last)\b/)?.[1] || 'pack', step: Math.floor(Math.random() * 6) }));
  const apply = () => lanes.forEach((l) => {
    const pool = ROLES[l.mood];
    const [anim, face] = pool[l.step % pool.length];
    l.el.dataset.anim = anim;
    l.el.dataset.mood = face;
  });
  setTimeout(apply, 1500); // na de wedren
  clearInterval(cycleTimer);
  cycleTimer = setInterval(() => {
    if (!document.contains(root)) return clearInterval(cycleTimer);
    // Telkens maar een paar poppetjes tegelijk laten wisselen, zodat het levendig blijft.
    lanes.forEach((l) => { if (Math.random() < 0.45) l.step++; });
    apply();
  }, 4500);
}
