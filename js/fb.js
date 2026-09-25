// Firebase-setup (Realtime Database + Auth), geladen via de officiële CDN.
import { firebaseConfig } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js';
import {
  initializeAuth, browserSessionPersistence, browserLocalPersistence, indexedDBLocalPersistence,
  onAuthStateChanged, signInAnonymously, signInWithEmailAndPassword, signOut, updatePassword,
  EmailAuthProvider, reauthenticateWithCredential,
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
