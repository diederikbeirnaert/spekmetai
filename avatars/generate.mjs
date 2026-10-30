// Tekent de avatars van de weekendgangers van het eerste weekend als SVG-bestanden.
// De tekencode zelf staat in js/avatarkit.js (ook gebruikt door de avatarbouwer in de browser).
// Uitvoeren: node avatars/generate.mjs — per persoon pas je alles aan in PEOPLE onderaan.
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { avatar, figure } from '../js/avatarkit.js';

const dir = fileURLToPath(new URL('.', import.meta.url));

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
