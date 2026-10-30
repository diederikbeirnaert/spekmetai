// Firebase-setup (Realtime Database + Auth), geladen via de officiële CDN.
// Alles van een weekend staat onder weekends/{id}/… — gebruik wref('pad') in plaats van ref(db, 'pad').
import { firebaseConfig } from './firebase-config.js?v=w1';
import { weekendId, setWeekend } from './weekend.js?v=w1';
import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js';
import {
  initializeAuth, browserSessionPersistence, browserLocalPersistence, indexedDBLocalPersistence,
  onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut, updatePassword,
  EmailAuthProvider, reauthenticateWithCredential, inMemoryPersistence, createUserWithEmailAndPassword, deleteUser,
} from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js';
import { getDatabase, ref, get, set, update, onValue } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js';

export {
  ref, get, set, update, remove, push, onValue, off, onChildAdded, serverTimestamp, onDisconnect,
  query, orderByChild, endAt,
} from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js';
export { signInWithEmailAndPassword, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential };
export { weekendId, setWeekend };

export const configured = !String(firebaseConfig.apiKey || '').startsWith('VUL');
export const app = configured ? initializeApp(firebaseConfig) : null;
export const db = configured ? getDatabase(app) : null;

// Verwijzing binnen het huidige weekend: wref('playlist/songs') → weekends/{id}/playlist/songs
export const wpath = (p = '', w = weekendId()) => `weekends/${w}${p ? `/${p}` : ''}`;
export const wref = (p = '', w = weekendId()) => ref(db, wpath(p, w));
// Publieke data via de snelle REST-API (zonder de SDK te laden), bv. op de homepage.
export const restGet = async (p) => {
  const r = await fetch(`${firebaseConfig.databaseURL}/${p}.json`);
  return r.ok ? (await r.json()) ?? null : null;
};

let _auth;
// 'session': elke browsertab is een aparte speler (handig om lokaal met meerdere tabs te testen).
// 'local':   ingelogd blijven.
export function useAuth(mode = 'local') {
  _auth ||= initializeAuth(app, {
    persistence: mode === 'session' ? [browserSessionPersistence] : [indexedDBLocalPersistence, browserLocalPersistence],
  });
  return _auth;
}

export const currentUser = () =>
  new Promise((res) => { const stop = onAuthStateChanged(useAuth(), (u) => { stop(); res(u); }); });

export async function ensureAnon() {
  const u = await currentUser();
  return u || (await signInAnonymously(useAuth())).user;
}

const val = async (p) => { try { return (await get(ref(db, p))).val(); } catch { return null; } };

/* ---------- Rollen ---------- */
// Hoofdadmin: beheert alle weekends en de weekendverantwoordelijken.
export async function isHead(user) {
  if (!user || user.isAnonymous) return false;
  return (await val(`admins/${user.uid}`)) === true;
}
// Admin van het huidige weekend: de hoofdadmin of een weekendverantwoordelijke van dit weekend.
export async function isAdmin(user) {
  if (!user || user.isAnonymous || !weekendId()) return (await isHead(user));
  return (await isHead(user)) || (await val(wpath(`owners/${user.uid}`))) === true;
}
// Admin light: een weekendganger met beperkte adminrechten (quizzen, hosten, opdrachten, raadkaart bekijken).
export async function isMod(user) {
  if (!user || user.isAnonymous || !weekendId()) return false;
  return (await val(wpath(`moderators/${user.uid}`))) === true;
}
// Admin of admin light
export async function isStaff(user) {
  return (await isAdmin(user)) || (await isMod(user));
}

// Servertijd, zodat de timer op alle toestellen gelijk loopt.
let offset = 0;
if (configured) onValue(ref(db, '.info/serverTimeOffset'), (s) => { offset = s.val() || 0; });
export const serverNow = () => Date.now() + offset;

export function notConfiguredHtml() {
  return `<div class="card notice"><h2>Firebase nog niet ingesteld 🍳</h2>
    <p>Vul <code>js/firebase-config.js</code> in (zie <code>README.md</code>) en herlaad de pagina.</p></div>`;
}

export function noWeekendHtml() {
  return `<div class="card center login-wrap"><h2>Kies eerst je weekend 🍳</h2>
    <p class="muted">Deze pagina hoort bij een weekend.</p><a class="btn bacon" href="index.html">Naar de weekends</a></div>`;
}

/* ---------- Accounts ---------- */
// Firebase heeft een e-mailadres nodig, dus we maken er een van de gebruikersnaam. Er wordt nooit mail naar gestuurd.
// Weekendgangers hebben een account per weekend (gebruikersnaam.weekend@leden…), weekendverantwoordelijken één account
// (gebruikersnaam@beheer…). Het allereerste weekend gebruikte nog gebruikersnaam@leden… (legacy).
export const cleanUsername = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '').slice(0, 20);
export const memberEmail = (username, w = weekendId()) => `${cleanUsername(username)}.${w}@leden.spekmetai.app`;
export const legacyMemberEmail = (username) => `${cleanUsername(username)}@leden.spekmetai.app`;
export const ownerEmail = (username) => `${cleanUsername(username)}@beheer.spekmetai.app`;

// Een tweede, tijdelijke Firebase-app zodat de admin ingelogd blijft terwijl we een ander account aanmaken.
async function withSecondaryAuth(fn) {
  const sec = initializeApp(firebaseConfig, `sec-${Date.now()}`);
  try {
    return await fn(initializeAuth(sec, { persistence: inMemoryPersistence }));
  } finally {
    await deleteApp(sec);
  }
}

// Hoofdadmin maakt een account voor een weekendverantwoordelijke.
export const createOwnerAccount = (username, password) =>
  withSecondaryAuth(async (a) => (await createUserWithEmailAndPassword(a, ownerEmail(username), password)).user.uid);

// Inloggen met een gebruikersnaam: we proberen de mogelijke e-mailadressen na elkaar.
export async function signInFlexible(id, password) {
  const tries = id.includes('@') ? [id] : [
    weekendId() && memberEmail(id), ownerEmail(id), weekendId() && legacyMemberEmail(id),
  ].filter(Boolean);
  let last;
  for (const email of tries) {
    try { return (await signInWithEmailAndPassword(useAuth(), email, password)).user; } catch (e) {
      last = e;
      if (!['auth/invalid-credential', 'auth/user-not-found', 'auth/wrong-password', 'auth/invalid-email'].includes(e.code)) throw e;
    }
  }
  throw last;
}

// Meedoen via de uitnodigingslink: zelf een account maken in dit weekend.
// De databaseregels laten het lidmaatschap alleen toe met de juiste uitnodigingscode.
export async function joinWeekend(w, invite, { name, username, password }) {
  const { user } = await createUserWithEmailAndPassword(useAuth(), memberEmail(username, w), password);
  try {
    await set(ref(db, wpath(`members/${user.uid}`, w)), { name, username: cleanUsername(username), invite, createdAt: Date.now() });
  } catch {
    await deleteUser(user).catch(() => {});
    throw Object.assign(new Error('Deze uitnodiging is niet (meer) geldig'), { code: 'smai/invite' });
  }
  await update(ref(db), { [`userWeekends/${user.uid}/${w}`]: 'member', [wpath(`roster/${user.uid}`, w)]: { name, username: cleanUsername(username) } });
  setWeekend(w);
  return user;
}

// Wie is er ingelogd, en in welk weekend? → { role: 'admin' | 'member', name, … } of null.
// Staat de browser nog niet in een weekend van deze gebruiker, dan springen we naar zijn (eerste) weekend.
export async function whoAmI(user) {
  if (!user || user.isAnonymous) return null;
  const head = await isHead(user);
  const mine = (await val(`userWeekends/${user.uid}`)) || {};
  if (!head && !mine[weekendId()]) {
    const first = Object.keys(mine).sort((a, b) => (mine[a] === 'owner' ? -1 : 0) - (mine[b] === 'owner' ? -1 : 0))[0];
    if (first) setWeekend(first);
  }
  const w = weekendId();
  if (head) return { role: 'admin', head: true, name: 'Hoofdchef', email: user.email, w };
  if (mine[w] === 'owner') {
    const s = (await val(`staff/${user.uid}`)) || {};
    return { role: 'admin', owner: true, name: s.name || 'Chef-kok', username: s.username, email: user.email, w };
  }
  const m = w ? await val(wpath(`members/${user.uid}`)) : null;
  if (m) return { role: 'member', name: m.name, username: m.username, mod: await isMod(user), w };
  return null;
}

// Avatars van weekendgangers live volgen (voor quiz, jury, portaal).
export function watchAvatars(onChange) {
  if (!configured || !weekendId()) return () => {};
  return onValue(wref('avatars'), (s) => onChange(s.val() || {}), () => {});
}

/* ---------- Weekendinstellingen ---------- */
export const loadMeta = (w = weekendId()) => (w ? val(wpath('meta', w)) : Promise.resolve(null));

/* ---------- Spelcodes ---------- */
// Quiz- en Hitstercodes zijn globaal uniek: gameCodes/{code} = { w, kind }. Zo vindt een gsm het juiste weekend.
export async function resolveCode(code) {
  const c = await val(`gameCodes/${code}`);
  if (c?.w) setWeekend(c.w);
  return c;
}
export async function claimCode(kind) {
  for (let i = 0; i < 30; i++) {
    const code = String(100000 + Math.floor(Math.random() * 900000));
    if (await val(`gameCodes/${code}`)) continue;
    try { await set(ref(db, `gameCodes/${code}`), { w: weekendId(), kind, at: Date.now() }); return code; } catch { /* bezet */ }
  }
  throw new Error('Geen vrije spelcode gevonden');
}
