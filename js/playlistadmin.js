// Admin-tabblad voor de weekendplaylist: Spotify koppelen en synchroniseren, liedjes beheren,
// en de quiz "Wie voegde dit toe?" maken.
import { $, $$, esc, toast, uid, av, setAvatars } from './common.js';
import { db, ref, get, set, update, onValue, watchAvatars } from './fb.js';
import { rankSongs, djRanking, buildWhoAddedQuiz } from './songs.js?v=3';
import * as spotify from './spotify.js';

const AUTO_MS = 5 * 60 * 1000;
let autoTimer = null;
let unsubs = [];

export async function mountPlaylistAdmin(el) {
  clearInterval(autoTimer);
  unsubs.forEach((u) => u());
  unsubs = [];
  let songs = {}, votes = {}, matches = {}, config = {}, adminCfg = {}, names = {};
  let busy = false, lastOrder = '', account = null;

  const val = async (p) => (await get(ref(db, p)).catch(() => null))?.val() || {};
  [adminCfg, names] = await Promise.all([val('playlist/admin'), val('roster')]);
  if (spotify.connected()) account = await spotify.me().catch(() => null);
  watchAvatars(setAvatars);

  const ranked = () => rankSongs(songs, votes);
  const playlistId = () => config.spotifyId || '';

  function render() {
    if (!document.contains(el)) { clearInterval(autoTimer); return; }
    const all = ranked();
    const unmatched = all.filter((s) => matches[s.key]?.none).length;
    const linked = spotify.connected();
    el.innerHTML = `
      <div class="pl-grid">
        <div class="pl-main">
          <div class="card stack">
            <h3 style="margin:0">🎧 Spotify-koppeling</h3>
            ${spotify.needsLoopback() ? `<p class="notice" style="margin:0">Spotify aanvaardt geen <code>localhost</code>. Open de admin lokaal via
              <a href="http://127.0.0.1:${esc(location.port)}/admin.html#playlist">http://127.0.0.1:${esc(location.port)}/admin.html</a> om te koppelen.</p>` : ''}
            <div class="field" style="margin:0"><label>Client ID van je Spotify-app</label>
              <input class="input" id="spid" value="${esc(adminCfg.clientId || '')}" placeholder="bv. 3f1c…" autocomplete="off"></div>
            <div class="field" style="margin:0"><label>Link van de Spotify-playlist</label>
              <input class="input" id="sppl" value="${playlistId() ? `https://open.spotify.com/playlist/${esc(playlistId())}` : ''}" placeholder="https://open.spotify.com/playlist/…"></div>
            <p class="muted" style="margin:0;font-size:.85rem">Terugkeeradres (Redirect URI) voor je Spotify-app: <code>${esc(spotify.redirectUri())}</code></p>
            <div class="row">
              <button class="btn" id="spsave">Opslaan</button>
              ${linked ? `<span class="pill" style="background:var(--ok)">✔ Gekoppeld${account?.display_name ? ` als ${esc(account.display_name)}` : ''}</span>
                <button class="btn small ghost" id="spoff">Ontkoppelen</button>`
                : '<button class="btn ok" id="spon">Koppel met Spotify</button>'}
            </div>
          </div>
          <div class="card stack">
            <h3 style="margin:0">🔄 Naar Spotify sturen</h3>
            <p class="muted" style="margin:0">Zet de echte Spotify-playlist in de volgorde van de ranking. De playlist wordt daarbij volledig vervangen.</p>
            <div class="row">
              <button class="btn bacon big" id="sync" ${linked && playlistId() ? '' : 'disabled'}>🎵 Sync naar Spotify</button>
              <label class="check-row"><input type="checkbox" id="auto" ${autoTimer ? 'checked' : ''} ${linked && playlistId() ? '' : 'disabled'}> Automatisch om de 5 minuten, zolang dit tabblad open staat</label>
            </div>
            <p class="muted" style="margin:0" id="syncstate">${config.syncedAt ? `Laatst gesynchroniseerd: ${esc(new Date(config.syncedAt).toLocaleString('nl-BE'))} · ${config.syncedCount ?? '?'} nummers` : 'Nog niet gesynchroniseerd.'}
              ${unmatched ? `<br>⚠️ ${unmatched} ${unmatched === 1 ? 'liedje is' : 'liedjes zijn'} niet gevonden op Spotify (zie hieronder).` : ''}</p>
          </div>
          <div class="pl-listhead"><h2 style="margin:0">Liedjes (${all.length})</h2><small class="muted">in de volgorde van de ranking</small></div>
          <ol class="pl-list">${all.map((s, i) => {
            const m = matches[s.key];
            return `<li class="pl-song" data-k="${esc(s.key)}">
              <span class="pl-pos">${i + 1}</span>
              <span class="pl-cover" style="cursor:default">${s.cover ? `<img src="${esc(s.cover)}" alt="">` : ''}</span>
              <div class="pl-info"><b>${esc(s.title)}</b><span>${esc(s.artist)}</span>
                <small class="pl-by">${av({ member: true }, s.by)} ${esc(s.byName || '?')} · 🥓 ${s.ups.length} · 🔥 ${s.downs.length}</small>
                <small class="pl-match ${m?.none ? 'bad' : ''}">${m?.uri ? `Spotify: ${esc(m.name)} – ${esc(m.artist)}` : m?.none ? '⚠️ Niet gevonden op Spotify' : 'Nog niet opgezocht'}</small>
              </div>
              <button class="btn small ghost" data-fix title="Plak zelf de juiste Spotify-link">🔗 Kies nummer</button>
              <button class="btn small ghost icon" data-del title="Liedje verwijderen">🗑</button>
            </li>`;
          }).join('') || '<li class="card muted">Nog geen liedjes.</li>'}</ol>
        </div>
        <aside class="pl-side">
          <div class="card stack">
            <h3 style="margin:0">🎧 Quiz: wie voegde dit toe?</h3>
            <p class="muted" style="margin:0">Maakt een quiz met fragmenten uit de playlist. De spelers raden welke weekendganger het liedje toevoegde.</p>
            <label class="check-row">Aantal vragen <input class="input" type="number" id="qn" min="1" max="30" value="10" style="width:80px"></label>
            <button class="btn" id="mkquiz">Maak de quiz</button>
            <label class="check-row"><input type="checkbox" id="hide" ${config.hideAdders ? 'checked' : ''}> Verberg op de playlistpagina wie welk liedje toevoegde</label>
          </div>
          <div class="card"><h3 style="margin-top:0">DJ-klassement</h3>
            <ol class="pl-djs">${djRanking(all).map((d, i) => `<li><span class="pl-pos">${i + 1}</span>${av({ member: true }, d.uid)}<b>${esc(d.name)}</b>
              <small class="muted">${d.songs}×</small><span class="pl-score">🥓 ${d.score}</span></li>`).join('') || '<li class="muted">Nog geen DJ\'s.</li>'}</ol></div>
        </aside>
      </div>`;
    wire();
  }

  function wire() {
    $('#spsave', el).onclick = async () => {
      const clientId = $('#spid', el).value.trim();
      const raw = $('#sppl', el).value.trim();
      const id = spotify.parsePlaylistId(raw);
      if (raw && !id) return toast('Dat lijkt geen link naar een Spotify-playlist', 'bad');
      adminCfg = { ...adminCfg, clientId };
      await update(ref(db, 'playlist'), { 'admin/clientId': clientId || null, 'config/spotifyId': id || null });
      toast('Opgeslagen', 'ok');
    };
    $('#spon', el)?.addEventListener('click', async () => {
      const clientId = $('#spid', el).value.trim();
      if (!clientId) return toast('Vul eerst de Client ID in', 'bad');
      if (spotify.needsLoopback()) return toast('Open de admin via http://127.0.0.1 om te koppelen', 'bad');
      await set(ref(db, 'playlist/admin/clientId'), clientId);
      spotify.connect(clientId);
    });
    $('#spoff', el)?.addEventListener('click', () => { spotify.disconnect(); account = null; clearInterval(autoTimer); autoTimer = null; render(); });
    $('#sync', el).onclick = () => sync(false);
    $('#auto', el).onchange = (e) => {
      clearInterval(autoTimer);
      autoTimer = e.target.checked ? setInterval(() => sync(true), AUTO_MS) : null;
      if (e.target.checked) sync(true);
    };
    $('#hide', el).onchange = (e) => set(ref(db, 'playlist/config/hideAdders'), e.target.checked || null);
    $('#mkquiz', el).onclick = makeQuiz;
    $$('[data-k]', el).forEach((li) => {
      const key = li.dataset.k;
      $('[data-del]', li).onclick = async () => {
        const s = songs[key];
        if (!confirm(`"${s.title}" uit de playlist halen?`)) return;
        await update(ref(db, 'playlist'), { [`songs/${key}`]: null, [`votes/${key}`]: null, [`mine/${s.by}/${s.slot}`]: null, [`spotify/${key}`]: null });
      };
      $('[data-fix]', li).onclick = async () => {
        if (!spotify.connected()) return toast('Koppel eerst met Spotify', 'bad');
        const link = prompt('Plak de Spotify-link van het juiste nummer (Delen → Link kopiëren). Laat leeg om opnieuw automatisch te zoeken.');
        if (link === null) return;
        try {
          if (!link.trim()) return void (await set(ref(db, `playlist/spotify/${key}`), null));
          const id = spotify.parseTrackId(link);
          if (!id) return toast('Dat is geen link naar een Spotify-nummer', 'bad');
          await set(ref(db, `playlist/spotify/${key}`), { ...(await spotify.trackById(id)), manual: true });
          toast('Nummer gekozen', 'ok');
        } catch (e) { toast(e.message, 'bad'); }
      };
    });
  }

  // Zoekt ontbrekende nummers op en zet de Spotify-playlist in de volgorde van de ranking.
  async function sync(silent) {
    if (busy || !document.contains(el)) return;
    if (!spotify.connected() || !playlistId()) return;
    busy = true;
    const state = $('#syncstate', el);
    try {
      const all = ranked();
      const todo = all.filter((s) => !matches[s.key]);
      for (const [i, s] of todo.entries()) {
        if (state) state.textContent = `Nummers opzoeken op Spotify… ${i + 1}/${todo.length}`;
        const found = await spotify.findTrack(s);
        matches[s.key] = found || { none: true };
        await set(ref(db, `playlist/spotify/${s.key}`), matches[s.key]);
      }
      const uris = [...new Set(all.map((s) => matches[s.key]?.uri).filter(Boolean))];
      const order = uris.join();
      if (silent && order === lastOrder) return; // niets veranderd sinds de vorige automatische sync
      await spotify.writePlaylist(playlistId(), uris);
      lastOrder = order;
      await update(ref(db, 'playlist/config'), { syncedAt: Date.now(), syncedCount: uris.length });
      if (!silent) toast(`Spotify-playlist bijgewerkt: ${uris.length} nummers 🎵`, 'ok');
    } catch (e) {
      toast(`Sync mislukt: ${e.message}`, 'bad');
      if (!spotify.connected()) { clearInterval(autoTimer); autoTimer = null; }
    } finally {
      busy = false;
      render();
    }
  }

  async function makeQuiz() {
    const people = Object.values(names).map((m) => m.name);
    const questions = buildWhoAddedQuiz(ranked(), people, Math.min(30, Math.max(1, +$('#qn', el).value || 10)));
    if (!questions.length) return toast('Te weinig liedjes met een fragment, of van te weinig verschillende mensen', 'bad');
    const id = uid();
    await set(ref(db, `quizzes/${id}`), {
      title: '🎧 Wie voegde dit toe?', description: 'Automatisch gemaakt uit de weekendplaylist.', updatedAt: Date.now(), questions,
    });
    toast(`Quiz met ${questions.length} vragen gemaakt`, 'ok');
    location.hash = `quiz/${id}`;
  }

  const watch = (path, fn) => unsubs.push(onValue(ref(db, path), (s) => { fn(s.val() || {}); if (!busy) render(); }, () => {}));
  watch('playlist/songs', (v) => { songs = v; });
  watch('playlist/votes', (v) => { votes = v; });
  watch('playlist/spotify', (v) => { matches = v; });
  watch('playlist/config', (v) => { config = v; });
}
