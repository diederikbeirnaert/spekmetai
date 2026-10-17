// Admin-tabblad Hitster: decks beheren (standaarddecks, deck uit de weekendplaylist, eigen liedjes, jaartallen
// nakijken) en een spel starten op het grote scherm.
import { $, $$, esc, toast, uid } from './common.js';
import { db, ref, get, set, remove, update } from './fb.js';
import { STANDARD_DECKS } from './hitsterdecks.js';
import { deckFromPlaylist } from './hitster.js';
import { searchSongs } from './songs.js?v=3';

export async function mountHitsterAdmin(el, { light = false } = {}) {
  const decks = (await get(ref(db, 'hitster/decks')).catch(() => null))?.val() || {};
  const id = location.hash.split('/')[1];
  if (id && decks[id]) return editDeck(el, id, decks[id]);
  el.innerHTML = `
    <div class="card stack">
      <h3 style="margin:0">🎵 Hitster</h3>
      <p class="muted" style="margin:0">Om de beurt speelt er een fragment op het grote scherm. De speler legt het liedje op zijn gsm op de juiste plek in zijn tijdlijn (ouder of nieuwer). Wie eerst het gekozen aantal kaartjes heeft (standaard 10), wint.</p>
      <div class="row">
        <button class="btn" id="std">⬇ Standaarddecks laden</button>
        <button class="btn ghost" id="fromPl">🎧 Deck uit de weekendplaylist</button>
        <button class="btn ghost" id="new">+ Leeg deck</button>
      </div>
    </div>
    <div class="list" style="margin-top:14px">${Object.entries(decks).map(([k, d]) => `
      <div class="card list-item"><div class="grow"><h3>${esc(d.title)}</h3><span class="muted">${(d.songs || []).length} liedjes
        ${(d.songs || []).some((s) => s.check) ? ' · <b style="color:var(--bad)">⚠️ jaartallen nakijken</b>' : ''}</span></div>
        <a class="btn bacon" href="hhost.html?deck=${encodeURIComponent(k)}">▶ Speel op groot scherm</a>
        <a class="btn small ghost" href="#hitster/${encodeURIComponent(k)}">✏️ Bewerk</a>
        ${light ? '' : `<button class="btn small ghost icon" data-del="${esc(k)}">🗑</button>`}</div>`).join('') || '<div class="card muted">Nog geen decks. Laad de standaarddecks of maak er een uit de weekendplaylist.</div>'}</div>`;
  $('#std', el).onclick = async () => {
    const upd = {};
    for (const [k, d] of Object.entries(STANDARD_DECKS)) {
      upd[k] = { title: d.title, songs: d.songs.map(([artist, title, year]) => ({ artist, title, year })) };
    }
    await update(ref(db, 'hitster/decks'), upd);
    toast('Standaarddecks geladen 🎵', 'ok');
    mountHitsterAdmin(el, { light });
  };
  $('#fromPl', el).onclick = async () => {
    toast('Jaartallen opzoeken…');
    try {
      const songs = (await get(ref(db, 'playlist/songs'))).val() || {};
      const list = await deckFromPlaylist(songs);
      if (list.length < 5) return toast('Te weinig liedjes in de playlist', 'bad');
      await set(ref(db, 'hitster/decks/playlist'), { title: '🎧 Onze weekendplaylist', songs: list });
      toast(`Deck met ${list.length} liedjes gemaakt. Kijk de jaartallen na!`, 'ok');
      location.hash = 'hitster/playlist';
    } catch (e) { toast(e.message, 'bad'); }
  };
  $('#new', el).onclick = async () => {
    const k = uid();
    await set(ref(db, `hitster/decks/${k}`), { title: 'Nieuw deck', songs: [] });
    location.hash = `hitster/${k}`;
  };
  $$('[data-del]', el).forEach((b) => {
    b.onclick = async () => {
      if (!confirm(`"${decks[b.dataset.del].title}" verwijderen?`)) return;
      await remove(ref(db, `hitster/decks/${b.dataset.del}`));
      mountHitsterAdmin(el, { light });
    };
  });
}

function editDeck(el, id, deck) {
  const songs = [...(deck.songs || [])];
  let results = null;
  const draw = () => {
    el.innerHTML = `<a class="btn ghost small" href="#hitster">← Alle decks</a>
      <div class="card stack" style="margin-top:12px">
        <div class="field" style="margin:0"><label>Naam van het deck</label><input class="input" id="dtitle" value="${esc(deck.title)}"></div>
        <p class="muted" style="margin:0">Het <b>jaartal</b> bepaalt waar het kaartje hoort: gebruik het jaar van de eerste release (geen remaster).
          ${songs.some((s) => s.check) ? '<b style="color:var(--bad)">Liedjes met ⚠️ kwamen automatisch uit de catalogus: kijk die jaartallen na.</b>' : ''}</p>
        <div class="row"><input class="input grow" id="q" placeholder="Liedje toevoegen: zoek titel of artiest…"><button class="btn" id="go">Zoek</button></div>
        <div id="res">${results ? results.map((r, i) => `<div class="list-item" style="padding:4px 0"><span class="grow">${esc(r.artist)} – ${esc(r.title)} <span class="muted">(${r.year || '?'})</span></span>
          <button class="btn small" data-add="${i}">+ Toevoegen</button></div>`).join('') || '<p class="muted">Niets gevonden.</p>' : ''}</div>
      </div>
      <div class="hs-edit">${songs.map((s, i) => `<div class="hs-editrow ${s.check ? 'check' : ''}">
        <input class="input" type="number" min="1900" max="2100" value="${esc(s.year || '')}" data-year="${i}" style="width:90px">
        <span class="grow">${s.check ? '⚠️ ' : ''}<b>${esc(s.title)}</b> <span class="muted">· ${esc(s.artist)}</span></span>
        <button class="btn small ghost icon" data-rm="${i}" title="Verwijderen">🗑</button></div>`).join('') || '<div class="card muted">Nog geen liedjes.</div>'}</div>
      <div class="savebar"><span class="status">${songs.length} liedjes</span><button class="btn ok" id="save">Opslaan</button></div>`;
    $('#go', el).onclick = async () => {
      const t = $('#q', el).value.trim();
      if (t.length < 2) return;
      try { results = await searchSongs(t); } catch (e) { toast(e.message, 'bad'); results = []; }
      draw();
    };
    $('#q', el).onkeydown = (e) => { if (e.key === 'Enter') $('#go', el).click(); };
    $$('[data-add]', el).forEach((b) => {
      b.onclick = () => {
        const r = results[+b.dataset.add];
        songs.unshift({ artist: r.artist, title: r.title, year: r.year, preview: r.preview, cover: r.cover, tid: r.tid, check: true });
        results = null;
        draw();
      };
    });
    $$('[data-year]', el).forEach((i) => { i.onchange = () => { const s = songs[+i.dataset.year]; s.year = +i.value || null; delete s.check; i.closest('.hs-editrow').classList.remove('check'); }; });
    $$('[data-rm]', el).forEach((b) => { b.onclick = () => { songs.splice(+b.dataset.rm, 1); draw(); }; });
    $('#save', el).onclick = async () => {
      const bad = songs.filter((s) => !s.year);
      if (bad.length) return toast(`${bad.length} liedje(s) zonder jaartal`, 'bad');
      deck.title = $('#dtitle', el).value.trim() || deck.title;
      await set(ref(db, `hitster/decks/${id}`), { title: deck.title, songs: songs.map((s) => Object.fromEntries(Object.entries(s).filter(([, v]) => v != null && v !== ''))) });
      toast('Deck opgeslagen 🎵', 'ok');
      location.hash = 'hitster';
    };
  };
  draw();
}
