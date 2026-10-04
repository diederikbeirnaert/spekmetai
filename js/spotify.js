// Spotify-koppeling voor de admin: inloggen (PKCE, zonder geheim of server), nummers opzoeken en de
// echte playlist in de volgorde van de ranking zetten. De tokens blijven in de browser van de admin.
const LS = 'smai.spotify';
const PENDING = 'smai.spotify.pending';
const SCOPES = 'playlist-modify-public playlist-modify-private';

const load = () => { try { return JSON.parse(localStorage.getItem(LS)); } catch { return null; } };
const save = (v) => { try { if (v) localStorage.setItem(LS, JSON.stringify(v)); else localStorage.removeItem(LS); } catch {} };

// Spotify aanvaardt geen 'localhost' als terugkeeradres: lokaal moet je via http://127.0.0.1:8080 werken.
export const redirectUri = () => `${location.origin}${location.pathname}`;
export const needsLoopback = () => location.hostname === 'localhost';
export const connected = () => !!load()?.refresh;
export const disconnect = () => save(null);

const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const randomString = (n) => b64url(crypto.getRandomValues(new Uint8Array(n))).slice(0, n);

// Stap 1: naar Spotify om toestemming te vragen.
export async function connect(clientId) {
  const verifier = randomString(64);
  const state = randomString(16);
  const challenge = b64url(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
  sessionStorage.setItem(PENDING, JSON.stringify({ verifier, state, clientId }));
  const q = new URLSearchParams({
    response_type: 'code', client_id: clientId, redirect_uri: redirectUri(), scope: SCOPES,
    code_challenge_method: 'S256', code_challenge: challenge, state,
  });
  location.href = `https://accounts.spotify.com/authorize?${q}`;
}

async function tokenRequest(body) {
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error_description || data.error || `Spotify weigerde (${res.status})`);
  return data;
}

// Stap 2: terug van Spotify met ?code=… → omruilen voor tokens. Geeft true als er een koppeling gelukt is.
export async function handleCallback() {
  const p = new URLSearchParams(location.search);
  if (!p.has('code') && !p.has('error')) return false;
  let pending = null;
  try { pending = JSON.parse(sessionStorage.getItem(PENDING)); } catch {}
  sessionStorage.removeItem(PENDING);
  history.replaceState(null, '', `${location.pathname}#playlist`);
  if (p.has('error')) throw new Error(p.get('error') === 'access_denied' ? 'Je hebt de toegang geweigerd' : p.get('error'));
  if (!pending || pending.state !== p.get('state')) throw new Error('De koppeling is verlopen. Probeer opnieuw.');
  const t = await tokenRequest({
    grant_type: 'authorization_code', code: p.get('code'), redirect_uri: redirectUri(),
    client_id: pending.clientId, code_verifier: pending.verifier,
  });
  save({ clientId: pending.clientId, access: t.access_token, refresh: t.refresh_token, exp: Date.now() + t.expires_in * 1000 });
  return true;
}

async function accessToken() {
  const s = load();
  if (!s?.refresh) throw new Error('Spotify is niet gekoppeld');
  if (s.access && Date.now() < s.exp - 60000) return s.access;
  let t;
  try {
    t = await tokenRequest({ grant_type: 'refresh_token', refresh_token: s.refresh, client_id: s.clientId });
  } catch (e) {
    save(null);
    throw new Error(`De Spotify-koppeling is verlopen. Koppel opnieuw. (${e.message})`);
  }
  save({ ...s, access: t.access_token, refresh: t.refresh_token || s.refresh, exp: Date.now() + t.expires_in * 1000 });
  return t.access_token;
}

async function api(path, { method = 'GET', body } = {}, retry = true) {
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    method,
    headers: { Authorization: `Bearer ${await accessToken()}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 429 && retry) { // even te snel: wachten en één keer opnieuw
    await new Promise((r) => setTimeout(r, (Number(res.headers.get('Retry-After')) || 2) * 1000));
    return api(path, { method, body }, false);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || `Spotify-fout ${res.status}`);
  return data;
}

export const me = () => api('/me');

export const parsePlaylistId = (s) => (String(s || '').match(/playlist[/:]([A-Za-z0-9]{10,})/) || [])[1] || (/^[A-Za-z0-9]{16,}$/.test(String(s).trim()) ? String(s).trim() : '');
export const parseTrackId = (s) => (String(s || '').match(/track[/:]([A-Za-z0-9]{10,})/) || [])[1] || '';

const pick = (t) => (t ? { uri: t.uri, name: t.name, artist: (t.artists || []).map((a) => a.name).join(', ') } : null);
const clean = (s) => String(s || '').replace(/\s*[([].*?[)\]]/g, '').replace(/\s+-\s+.*$/, '').replace(/["']/g, ' ').trim();

// Het Spotify-nummer bij een liedje uit onze lijst: eerst precies op titel + artiest, dan losser.
export async function findTrack({ title, artist }) {
  const search = async (q) => (await api(`/search?${new URLSearchParams({ q, type: 'track', limit: '5', market: 'BE' })}`)).tracks?.items || [];
  const strict = await search(`track:${clean(title)} artist:${clean(artist).split(/,|&| feat/i)[0].trim()}`);
  if (strict.length) return pick(strict[0]);
  return pick((await search(`${clean(title)} ${clean(artist)}`))[0]);
}
export const trackById = async (id) => pick(await api(`/tracks/${id}?market=BE`));

// De playlist vervangen door deze nummers, in deze volgorde (Spotify aanvaardt er 100 per keer).
export async function writePlaylist(playlistId, uris) {
  await api(`/playlists/${playlistId}/items`, { method: 'PUT', body: { uris: uris.slice(0, 100) } });
  for (let i = 100; i < uris.length; i += 100) {
    await api(`/playlists/${playlistId}/items`, { method: 'POST', body: { uris: uris.slice(i, i + 100) } });
  }
}
