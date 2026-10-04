// Gedeelde logica voor de weekendplaylist: zoeken, dubbels herkennen, ranking en DJ-klassement.
// Bewust zonder Firebase, zodat ook de (snelle) homepage dit kan gebruiken.

export const MAX_SONGS = 15; // liedjes per persoon
export const MAX_DOWNS = 5; // liedjes die je mag laten aanbranden
// De slots moeten gelijk lopen met database.rules.json (s0..s9, sa..se en d0..d4).
export const SONG_SLOTS = Array.from({ length: MAX_SONGS }, (_, i) => `s${i.toString(16)}`);
export const DOWN_SLOTS = Array.from({ length: MAX_DOWNS }, (_, i) => `d${i}`);

// "Dancing Queen (Remastered 2011)" → "dancing-queen": zo zijn twee versies van hetzelfde nummer een dubbel.
const slug = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/\s*[([].*?[)\]]/g, '') // (Remastered), [Live]
  .replace(/\s+-\s+.*$/, '') // - Radio Edit
  .replace(/\s(feat|ft)\.?\s.*$/, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);

// Sleutel van een liedje in de database: artiest + titel (of het catalogusnummer als dat niet lukt).
export function songKey({ artist, title, tid }) {
  const a = slug(artist);
  const t = slug(title);
  return a && t ? `${a}__${t}` : `t${tid}`;
}

// Zoeken in de gratis iTunes-catalogus (geen login nodig): titel, artiest, hoes en een fragment van 30 s.
export async function searchSongs(term, signal) {
  const q = new URLSearchParams({ term, media: 'music', entity: 'song', limit: '15', country: 'be' });
  const res = await fetch(`https://itunes.apple.com/search?${q}`, { signal });
  if (!res.ok) throw new Error(res.status === 403 || res.status === 429 ? 'Even te veel gezocht. Wacht een paar seconden.' : 'Zoeken lukt even niet');
  const { results = [] } = await res.json();
  const seen = new Set();
  return results
    .filter((r) => r.trackName && r.artistName)
    .map((r) => {
      const s = {
        tid: r.trackId,
        title: String(r.trackName).slice(0, 200),
        artist: String(r.artistName).slice(0, 200),
        album: String(r.collectionName || '').slice(0, 200),
        cover: String(r.artworkUrl100 || '').replace('100x100bb', '300x300bb'),
        preview: r.previewUrl || '',
      };
      return { ...s, key: songKey(s) };
    })
    .filter((s) => !seen.has(s.key) && seen.add(s.key));
}

// Stemmen van één liedje: { uid: 'up' | 'd0'..'d4' } → wie gaf een spekje, wie liet het aanbranden.
export function tally(votes) {
  const ups = [];
  const downs = [];
  for (const [uid, v] of Object.entries(votes || {})) (v === 'up' ? ups : downs).push(uid);
  return { ups, downs, score: ups.length - downs.length };
}

// Ranking: hoogste score (spekjes − aangebrand) eerst, dan meeste spekjes, dan wie het eerst toevoegde.
export function rankSongs(songs, votes) {
  return Object.entries(songs || {})
    .map(([key, s]) => ({ key, ...s, ...tally(votes?.[key]) }))
    .sort((a, b) => b.score - a.score || b.ups.length - a.ups.length || (a.at || 0) - (b.at || 0));
}

// DJ-klassement: per persoon de som van de scores van zijn liedjes.
export function djRanking(ranked) {
  const djs = {};
  for (const s of ranked) {
    const d = (djs[s.by] ||= { uid: s.by, name: s.byName || '?', songs: 0, score: 0, ups: 0 });
    d.songs++;
    d.score += s.score;
    d.ups += s.ups.length;
  }
  return Object.values(djs).sort((a, b) => b.score - a.score || b.ups - a.ups || a.name.localeCompare(b.name));
}

// Quiz "Wie voegde dit toe?": per liedje een meerkeuzevraag met het fragment en 2 tot 4 namen.
// `people` is de lijst met alle namen waaruit de foute antwoorden gekozen worden.
export function buildWhoAddedQuiz(ranked, people, count = 10) {
  const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(([, x]) => x);
  const names = [...new Set([...people, ...ranked.map((s) => s.byName)].filter(Boolean))];
  if (names.length < 2) return [];
  return shuffle(ranked.filter((s) => s.preview && s.byName)).slice(0, count).map((s, i) => {
    const wrong = shuffle(names.filter((n) => n !== s.byName)).slice(0, 3);
    return {
      id: `wie${i}`, type: 'mc', time: 20, points: 'normal',
      text: 'Wie zette dit liedje in de playlist?',
      media: { kind: 'audio', src: s.preview, cover: s.cover || '', title: s.title, artist: s.artist },
      options: shuffle([s.byName, ...wrong]).map((n) => ({ text: n, correct: n === s.byName })),
    };
  });
}
