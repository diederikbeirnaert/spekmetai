// Weekendbrieven publiek ophalen via de REST-API: geen SDK nodig, dus supersnel.
import { firebaseConfig } from './firebase-config.js';

export async function fetchLetters() {
  if (String(firebaseConfig.apiKey).startsWith('VUL')) return [];
  const res = await fetch(`${firebaseConfig.databaseURL}/letters.json`);
  if (!res.ok) return [];
  const all = (await res.json()) || {};
  return Object.entries(all)
    .map(([id, l]) => ({ id, ...l }))
    .filter((l) => l.published !== false)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}
