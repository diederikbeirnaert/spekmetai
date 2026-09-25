// Firebase-setup (Realtime Database + Auth), geladen via de officiële CDN.
import { firebaseConfig } from './firebase-config.js';
import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js';
import {
  initializeAuth, browserSessionPersistence, browserLocalPersistence, indexedDBLocalPersistence,
  onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut, updatePassword,
  EmailAuthProvider, reauthenticateWithCredential, inMemoryPersistence, createUserWithEmailAndPassword, deleteUser,
} from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js';
import { getDatabase, ref, get, onValue } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js';

export {
  ref, get, set, update, remove, push, onValue, off, onChildAdded, serverTimestamp, onDisconnect,
  query, orderByChild, endAt,
} from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js';
export { signInWithEmailAndPassword, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential };

export const configured = !String(firebaseConfig.apiKey || '').startsWith('VUL');
export const app = configured ? initializeApp(firebaseConfig) : null;
export const db = configured ? getDatabase(app) : null;

let _auth;
// 'session': elke browsertab is een aparte speler (handig om lokaal met meerdere tabs te testen).
// 'local':   admin blijft ingelogd.
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

export async function isAdmin(user) {
  if (!user || user.isAnonymous) return false;
  try { return (await get(ref(db, `admins/${user.uid}`))).val() === true; } catch { return false; }
}

// Servertijd, zodat de timer op alle toestellen gelijk loopt.
let offset = 0;
if (configured) onValue(ref(db, '.info/serverTimeOffset'), (s) => { offset = s.val() || 0; });
export const serverNow = () => Date.now() + offset;

export function notConfiguredHtml() {
  return `<div class="card notice"><h2>Firebase nog niet ingesteld 🍳</h2>
    <p>Vul <code>js/firebase-config.js</code> in (zie <code>README.md</code>) en herlaad de pagina.</p></div>`;
}

/* ---------- Weekendgangers ---------- */
// Leden loggen in met een gebruikersnaam; Firebase heeft een e-mailadres nodig, dus we maken er een van.
// Er wordt nooit mail naar dit adres gestuurd.
export const cleanUsername = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '').slice(0, 20);
export const memberEmail = (username) => `${cleanUsername(username)}@leden.spekmetai.app`;

// Een tweede, tijdelijke Firebase-app zodat de admin ingelogd blijft terwijl we een ander account beheren.
async function withSecondaryAuth(fn) {
  const sec = initializeApp(firebaseConfig, `sec-${Date.now()}`);
  try {
    return await fn(initializeAuth(sec, { persistence: inMemoryPersistence }));
  } finally {
    await deleteApp(sec);
  }
}

export const createMemberAccount = (username, password) =>
  withSecondaryAuth(async (a) => (await createUserWithEmailAndPassword(a, memberEmail(username), password)).user.uid);

export const deleteMemberAccount = (username, password) =>
  withSecondaryAuth(async (a) => deleteUser((await signInWithEmailAndPassword(a, memberEmail(username), password)).user));

export const changeMemberPassword = (username, oldPassword, newPassword) =>
  withSecondaryAuth(async (a) => updatePassword((await signInWithEmailAndPassword(a, memberEmail(username), oldPassword)).user, newPassword));

// Wie is er ingelogd? → { role: 'admin' | 'member', name, username? } of null
export async function whoAmI(user) {
  if (!user || user.isAnonymous) return null;
  if (await isAdmin(user)) return { role: 'admin', name: 'Chef-kok', email: user.email };
  try {
    const m = (await get(ref(db, `members/${user.uid}`))).val();
    if (m) return { role: 'member', name: m.name, username: m.username };
  } catch {}
  return null;
}
