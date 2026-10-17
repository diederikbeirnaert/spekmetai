// Hitster: gedeelde logica (zonder Firebase) voor host, gsm en admin.
import { esc } from './common.js';

export const DEFAULT_TARGET = 10;

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const itunes = async (path) => {
  const res = await fetch(`https://itunes.apple.com/${path}`);
  if (!res.ok) throw new Error('Muziekcatalogus niet bereikbaar');
  return res.json();
};
const pick = (r) => ({ preview: r.previewUrl || '', cover: String(r.artworkUrl100 || '').replace('100x100bb', '300x300bb'), tid: r.trackId || null });

// Fragment en hoes opzoeken voor een liedje uit een deck (artiest + titel).
export async function resolveSong(song) {
  if (song.preview) return song;
  const q = new URLSearchParams({ term: `${song.artist} ${song.title}`, entity: 'song', limit: '10', country: 'be' });
  const { results = [] } = await itunes(`search?${q}`);
  const a = norm(song.artist).split(' ')[0];
  const t = norm(song.title).split(' ').slice(0, 2).join(' ');
  const best = results.find((r) => r.previewUrl && norm(r.artistName).includes(a) && norm(r.trackName).includes(t))
    || results.find((r) => r.previewUrl && norm(r.artistName).includes(a)) || results.find((r) => r.previewUrl);
  return best ? { ...song, ...pick(best) } : song;
}

// Deck maken uit de weekendplaylist: jaartal via de catalogus (kan een remaster-jaar zijn → nakijken!).
export async function deckFromPlaylist(songs) {
  const list = Object.values(songs || {}).filter((s) => s.tid);
  const out = [];
  for (let i = 0; i < list.length; i += 150) {
    const ids = list.slice(i, i + 150).map((s) => s.tid).join(',');
    const { results = [] } = await itunes(`lookup?id=${ids}&country=be`);
    const byId = Object.fromEntries(results.map((r) => [r.trackId, r]));
    for (const s of list.slice(i, i + 150)) {
      const r = byId[s.tid];
      const year = Number(String(r?.releaseDate || '').slice(0, 4)) || null;
      out.push({ artist: s.artist, title: s.title, year, preview: s.preview || r?.previewUrl || '', cover: s.cover || '', tid: s.tid, check: true });
    }
  }
  return out.filter((s) => s.year);
}

// Ligt het nieuwe kaartje juist in de tijdlijn? `slot` = aantal kaartjes vóór het nieuwe kaartje.
export function isCorrect(cards, slot, year) {
  const sorted = [...(cards || [])].sort((a, b) => a.year - b.year);
  const prev = sorted[slot - 1];
  const next = sorted[slot];
  return (!prev || prev.year <= year) && (!next || year <= next.year);
}

export const sortCards = (cards) => [...(cards || [])].sort((a, b) => a.year - b.year);

export const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(([, x]) => x);

// Eén kaartje (jaar groot, titel en artiest klein).
export const cardHtml = (c, cls = '') => `<div class="hs-card ${cls}">
  ${c.cover ? `<img src="${esc(c.cover)}" alt="" loading="lazy">` : '<span class="hs-note">🎵</span>'}
  <b class="hs-year">${esc(c.year)}</b><span class="hs-title">${esc(c.title)}</span><span class="hs-artist">${esc(c.artist)}</span></div>`;

// Tijdlijn met (optioneel) tikbare gaten tussen de kaartjes.
export function timelineHtml(cards, { gaps = false, picked = null, highlight = null } = {}) {
  const sorted = sortCards(cards);
  const gap = (i) => (gaps ? `<button class="hs-gap ${picked === i ? 'on' : ''}" data-slot="${i}" aria-label="Hier leggen">
    <span>${i === 0 ? 'ouder' : i === sorted.length ? 'nieuwer' : 'hier'}</span></button>` : '');
  return `<div class="hs-timeline ${gaps ? 'pickable' : ''}">${gap(0)}${sorted.map((c, i) =>
    `${cardHtml(c, highlight && c.title === highlight.title && c.year === highlight.year ? 'new' : '')}${gap(i + 1)}`).join('')}</div>`;
}
