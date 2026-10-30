// Welk weekend bekijken we? Elk weekend heeft een korte, leesbare id (bv. "ardennen25") die in de link staat:
// spekmetai.tech/ardennen25 (404.html stuurt door) of eender welke pagina met ?w=ardennen25.
// We onthouden het weekend in de browser, zodat alle pagina's daarna vanzelf in hetzelfde weekend blijven.
// Geen Firebase hier: de paginakop gebruikt dit om het menu meteen te tekenen.

const KEY = 'smai.weekend';
const META = 'smai.wmeta';

// Namen die al een pagina of map zijn op de site, en dus geen weekend-id mogen worden.
export const RESERVED = ['admin', 'index', 'login', 'play', 'brief', 'portaal', 'raadkaart', 'playlist', 'host', 'hhost', 'hitster',
  'jury', 'account', 'avatar', 'doemee', 'join', 'css', 'js', 'avatars', 'data', 'weekend', 'weekends', 'favicon', '404'];

export const cleanWeekendId = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);
export const validWeekendId = (s) => /^[a-z0-9][a-z0-9-]{1,29}$/.test(s || '') && !RESERVED.includes(s);

// Alle functies die een weekend kan aan- of uitzetten, in de volgorde van het menu.
export const FEATURES = [
  { key: 'quiz', icon: '🍳', name: 'Quiz', desc: 'Kahoot-achtige quizzen op het grote scherm, iedereen speelt mee op de gsm' },
  { key: 'twister', icon: '🌀', name: 'Twister-quiz', desc: 'Quizvragen beantwoorden met hand of voet op de Twistermat, met jury en SpekVAR' },
  { key: 'brief', icon: '✉️', name: 'Weekendbrief', desc: 'Brieven met nieuws en foto’s voor de weekendgangers' },
  { key: 'missions', icon: '🤫', name: 'Geheime opdrachten', desc: 'Iedereen krijgt een geheime opdracht in het portaal' },
  { key: 'raadkaart', icon: '🗺️', name: 'Raadkaart', desc: 'Raad elke dag waar het weekend naartoe gaat, met een warm/koud-eitje' },
  { key: 'playlist', icon: '🎵', name: 'Weekendplaylist', desc: 'Samen een playlist maken en stemmen met spekjes' },
  { key: 'hitster', icon: '🃏', name: 'Hitster', desc: 'Muziektijdlijn-spel om de beurt op groot scherm en gsm' },
  { key: 'scoreboard', icon: '🏆', name: 'Weekendscorebord', desc: 'Punten van alle spelletjes bij elkaar, met wedrennende poppetjes' },
];
export const DEFAULT_FEATURES = Object.fromEntries(FEATURES.map((f) => [f.key, true]));

const read = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} };

let current = null;
// Volgorde: ?w= in de link, dan het onthouden weekend.
export function weekendId() {
  if (current) return current;
  const fromUrl = cleanWeekendId(new URLSearchParams(location.search).get('w'));
  if (validWeekendId(fromUrl)) {
    if (read(KEY) !== fromUrl) write(META, null);
    write(KEY, fromUrl);
    current = fromUrl;
  } else {
    const saved = read(KEY);
    current = validWeekendId(saved) ? saved : null;
  }
  return current;
}

export function setWeekend(id) {
  id = validWeekendId(id) ? id : null;
  if (id !== read(KEY)) write(META, null);
  write(KEY, id);
  current = id;
}

// Laatst gekende naam, emoji en functies van het weekend (voor het menu, zonder te wachten op de database).
export function cachedMeta() {
  try {
    const m = JSON.parse(read(META));
    return m && m.id === weekendId() ? m : null;
  } catch { return null; }
}
export const cacheMeta = (id, meta) => write(META, meta ? JSON.stringify({ id, name: meta.name, emoji: meta.emoji, features: meta.features || null }) : null);

// Staat een functie aan? Zonder gekende instellingen: alles aan (oude weekends hadden alles).
export const hasFeature = (meta, key) => !meta?.features || meta.features[key] !== false;

// Korte link naar een weekend: spekmetai.tech/ardennen25
export const weekendUrl = (id) => `${location.origin}/${id}`;
