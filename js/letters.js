// Weekendbrieven publiek ophalen via de REST-API: geen SDK nodig, dus supersnel.
// De geüploade foto's staan apart onder letters/_media/{briefId}, zodat de lijst met brieven licht blijft.
import { firebaseConfig } from './firebase-config.js';

const base = () => `${firebaseConfig.databaseURL}/letters`;
const ready = () => !String(firebaseConfig.apiKey).startsWith('VUL');
const json = async (url) => { const res = await fetch(url); return res.ok ? res.json() : null; };

export async function fetchLetters() {
  if (!ready()) return [];
  // Eerst alleen de sleutels, dan elke brief apart: zo downloaden we de foto's niet mee.
  const keys = Object.keys((await json(`${base()}.json?shallow=true`)) || {}).filter((k) => k !== '_media');
  const all = await Promise.all(keys.map(async (id) => ({ id, ...((await json(`${base()}/${encodeURIComponent(id)}.json`)) || {}) })));
  return all
    .filter((l) => l.title && l.published !== false)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

// Foto's van één brief: { fotoId: dataURL }
export async function fetchLetterImages(id) {
  if (!ready()) return {};
  return (await json(`${base()}/_media/${encodeURIComponent(id)}.json`)) || {};
}

// Korte voorvertoning zonder opmaak of foto's.
export const letterExcerpt = (body, n = 180) =>
  String(body || '').replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/[#*_>\[\]()!]/g, '').replace(/\s+/g, ' ').trim().slice(0, n);
