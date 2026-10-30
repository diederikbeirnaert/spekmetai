// Weekends beheren.
//  - Hoofdadmin: weekends aanmaken/verwijderen, weekendverantwoordelijken aanmaken en toewijzen,
//    en het allereerste weekend (oude data op de root van de database) overzetten.
//  - Weekendverantwoordelijke: naam, data en functies van zijn weekend, en de uitnodigingslink.
import { $, $$, esc, toast } from './common.js?v=w1';
import { FEATURES, DEFAULT_FEATURES, cleanWeekendId, validWeekendId, weekendUrl, setWeekend, weekendId } from './weekend.js?v=w1';
import { db, ref, get, set, update, wref, wpath, createOwnerAccount, cleanUsername } from './fb.js?v=w1';

const val = async (p) => (await get(ref(db, p)).catch(() => null))?.val() ?? null;
const newInvite = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => 'abcdefghjkmnpqrstuvwxyz23456789'[b % 31]).join('');
const PW_WORDS = ['spekje', 'dooier', 'eitje', 'omelet', 'krokant', 'toastje', 'pannetje', 'zoutje', 'worstje', 'croque'];
const genPassword = () => PW_WORDS[Math.floor(Math.random() * PW_WORDS.length)] + (10 + Math.floor(Math.random() * 90));
const fmtRange = (w) => [w.from, w.to].filter(Boolean).map((d) => new Date(d).toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' })).join(' – ');
const listEntry = (m) => ({ name: m.name, emoji: m.emoji || '🍳', from: m.from || null, to: m.to || null, listed: m.listed !== false });

/* ---------- Uitnodigingslink ---------- */
export const inviteLink = (code, w = weekendId()) => `${weekendUrl(w)}?doemee=${code}`;

export function inviteCard(inv) {
  const link = inv.code ? inviteLink(inv.code) : '';
  return `<div class="card invite-card">
    <div class="row" style="justify-content:space-between"><h3 style="margin:0">💌 Uitnodigingslink</h3>
      ${inv.code ? `<span class="pill ${inv.open === false ? '' : 'yolk'}">${inv.open === false ? '🔒 Gesloten' : '✅ Open'}</span>` : ''}</div>
    <p class="muted" style="margin:6px 0 10px">Stuur deze link naar je weekendgangers: iedereen maakt zelf een account en bouwt zijn eigen poppetje.</p>
    ${inv.code ? `<div class="invite-link"><code>${esc(link)}</code></div>
      <div class="row" style="margin-top:10px">
        <button class="btn bacon" data-inv="copy">📋 Kopieer uitnodiging</button>
        <button class="btn ghost" data-inv="toggle">${inv.open === false ? '🔓 Weer openzetten' : '🔒 Sluiten (niemand kan nog meedoen)'}</button>
        <button class="btn ghost" data-inv="new" title="De oude link werkt dan niet meer">🔄 Nieuwe link</button></div>`
      : '<button class="btn bacon" data-inv="new">✨ Maak een uitnodigingslink</button>'}
  </div>`;
}

export function wireInviteCard(box, inv, refresh) {
  $$('[data-inv]', box).forEach((b) => {
    b.onclick = async () => {
      const act = b.dataset.inv;
      if (act === 'copy') {
        const meta = await val(wpath('meta'));
        const msg = `${meta?.emoji || '🍳'} Je bent uitgenodigd voor ${meta?.name || 'ons weekend'}!\nMaak je account en bouw je eigen poppetje:\n${inviteLink(inv.code)}`;
        try { await navigator.clipboard.writeText(msg); toast('Gekopieerd! Plak het in de groepschat 📋', 'ok'); }
        catch { prompt('Kopieer dit bericht:', msg); }
        return;
      }
      if (act === 'new' && inv.code && !confirm('Een nieuwe link maken? De oude link werkt dan niet meer (wie al meedoet, blijft erin).')) return;
      await update(wref('invite'), act === 'new' ? { code: newInvite(), open: true } : { open: inv.open === false });
      refresh();
    };
  });
}

/* ---------- Instellingen van één weekend ---------- */
export async function mountWeekendSettings(el, { onSaved } = {}) {
  const [meta, inv] = await Promise.all([val(wpath('meta')), val(wpath('invite'))]);
  const m = { features: { ...DEFAULT_FEATURES }, ...meta };
  m.features = { ...DEFAULT_FEATURES, ...(meta?.features || {}) };
  el.innerHTML = `<div class="stack">
    <div class="card stack">
      <h3 style="margin:0">⚙️ Het weekend</h3>
      <div class="row" style="align-items:flex-end">
        <div class="field" style="margin:0;width:90px"><label>Emoji</label><input class="input" id="wemoji" maxlength="4" value="${esc(m.emoji || '🍳')}" style="text-align:center;font-size:1.4rem"></div>
        <div class="field grow" style="margin:0"><label>Naam</label><input class="input" id="wname" maxlength="60" value="${esc(m.name || '')}"></div>
      </div>
      <div class="field" style="margin:0"><label>Ondertitel op de homepage (optioneel)</label><input class="input" id="wtag" maxlength="140" value="${esc(m.tagline || '')}" placeholder="Alles voor het sappigste weekend"></div>
      <div class="row">
        <div class="field" style="margin:0"><label>Van</label><input class="input" type="date" id="wfrom" value="${esc(m.from || '')}"></div>
        <div class="field" style="margin:0"><label>Tot</label><input class="input" type="date" id="wto" value="${esc(m.to || '')}"></div>
      </div>
      <label class="check-row"><input type="checkbox" id="wlisted" ${m.listed !== false ? 'checked' : ''}> Toon dit weekend in de lijst op de homepage (anders enkel via de link)</label>
      <p class="muted" style="margin:0">Link naar je weekend: <a href="${esc(weekendUrl(weekendId()))}" target="_blank"><b>${esc(weekendUrl(weekendId()).replace(/^https?:\/\//, ''))}</b></a></p>
    </div>
    <div class="card"><h3 style="margin-top:0">🧩 Functies</h3>
      <p class="muted" style="margin-top:0">Kies wat er in jullie weekend zit. Uitgeschakelde functies verdwijnen uit het menu en de homepage.</p>
      <div class="wk-feature-list">${FEATURES.map((f) => `<label class="check-row wk-feat"><input type="checkbox" data-feat="${f.key}" ${m.features[f.key] !== false ? 'checked' : ''}>
        <span><b>${f.icon} ${esc(f.name)}</b><br><span class="muted">${esc(f.desc)}</span></span></label>`).join('')}</div>
    </div>
    <div class="savebar"><span class="status" id="wstate">✔ Opgeslagen</span><button class="btn ok" id="wsave">Opslaan</button></div>
    <div id="winv"></div>
  </div>`;
  const drawInvite = async () => {
    const i = (await val(wpath('invite'))) || {};
    $('#winv', el).innerHTML = inviteCard(i);
    wireInviteCard($('#winv', el), i, drawInvite);
  };
  $('#winv', el).innerHTML = inviteCard(inv || {});
  wireInviteCard($('#winv', el), inv || {}, drawInvite);
  el.oninput = el.onchange = (e) => { if (e.target.closest('.savebar, #winv')) return; $('#wstate', el).textContent = '● Niet opgeslagen'; };
  $('#wsave', el).onclick = async () => {
    const next = {
      ...meta, name: $('#wname', el).value.trim(), emoji: $('#wemoji', el).value.trim() || '🍳', tagline: $('#wtag', el).value.trim() || null,
      from: $('#wfrom', el).value || null, to: $('#wto', el).value || null, listed: $('#wlisted', el).checked,
      features: Object.fromEntries($$('[data-feat]', el).map((c) => [c.dataset.feat, c.checked])),
    };
    if (!next.name) return toast('Geef het weekend een naam', 'bad');
    await set(wref('meta'), next);
    await set(ref(db, `weekendList/${weekendId()}`), listEntry(next));
    $('#wstate', el).textContent = '✔ Opgeslagen';
    toast('Weekend opgeslagen 🍳', 'ok');
    onSaved?.(next);
  };
}

/* ---------- Hoofdadmin: alle weekends ---------- */
export async function mountWeekends(el, { user }) {
  const [list, staff, legacy] = await Promise.all([val('weekendList'), val('staff'), val('members')]);
  const weekends = Object.entries(list || {}).sort((a, b) => String(b[1].from || '').localeCompare(String(a[1].from || '')));
  const owners = Object.fromEntries(await Promise.all(weekends.map(async ([id]) => [id, Object.keys((await val(wpath('owners', id))) || {})])));
  const people = Object.entries(staff || {}).sort((a, b) => a[1].name.localeCompare(b[1].name));
  const nameOf = (uid) => staff?.[uid]?.name || '?';

  el.innerHTML = `<div class="stack">
    ${legacy ? migrateCard() : ''}
    <div class="card"><h3 style="margin-top:0">✨ Nieuw weekend</h3>
      <form id="nwf" class="stack">
        <div class="row">
          <input class="input" id="nwemoji" maxlength="4" value="🏕️" style="width:70px;text-align:center;font-size:1.3rem" title="Emoji">
          <input class="input grow" id="nwname" maxlength="60" placeholder="Naam, bv. Ardennen 2026" required>
          <input class="input" id="nwid" maxlength="30" placeholder="link, bv. ardennen26" style="max-width:200px" autocapitalize="none" required>
        </div>
        <div class="row"><label class="muted">Van <input class="input" type="date" id="nwfrom"></label><label class="muted">Tot <input class="input" type="date" id="nwto"></label>
          <span class="muted grow" id="nwurl"></span><button class="btn bacon">+ Weekend aanmaken</button></div>
      </form></div>
    <div class="list">${weekends.map(([id, w]) => `
      <div class="card wk-admin" data-w="${esc(id)}">
        <div class="list-item">
          <span class="wk-emoji">${esc(w.emoji || '🍳')}</span>
          <div class="grow"><h3 style="margin:0">${esc(w.name)} ${id === weekendId() ? '<span class="pill yolk" style="font-size:.7rem">je zit hier</span>' : ''} ${w.listed === false ? '<span class="pill" style="font-size:.7rem">verborgen</span>' : ''}</h3>
            <span class="muted">${esc(fmtRange(w))} · <a href="${esc(weekendUrl(id))}" target="_blank">${esc(weekendUrl(id).replace(/^https?:\/\//, ''))}</a></span></div>
          <button class="btn small bacon" data-open>🍳 Beheren</button>
          <button class="btn small ghost icon" data-delw title="Weekend verwijderen">🗑</button>
        </div>
        <div class="wk-owners"><b>Weekendverantwoordelijken:</b>
          ${owners[id].map((u) => `<span class="pill">${esc(nameOf(u))} <button class="pill-x" data-rmowner="${esc(u)}" title="Weghalen">✕</button></span>`).join(' ') || '<span class="muted">nog niemand</span>'}
          <select class="input" data-addowner style="width:auto"><option value="">+ Verantwoordelijke toevoegen…</option>
            ${people.filter(([u]) => !owners[id].includes(u)).map(([u, p]) => `<option value="${esc(u)}">${esc(p.name)} (${esc(p.username)})</option>`).join('')}
            <option value="__new">✨ Nieuw account aanmaken…</option></select>
        </div>
      </div>`).join('') || '<div class="card muted">Nog geen weekends.</div>'}</div>
    <div class="card"><h3 style="margin-top:0">👩‍🍳 Weekendverantwoordelijken</h3>
      <p class="muted" style="margin-top:0">Accounts om weekends te beheren. Ze loggen in met hun gebruikersnaam (zonder weekend te kiezen).</p>
      <div class="list">${people.map(([u, p]) => `<div class="list-item"><div class="grow"><b>${esc(p.name)}</b> <span class="cred">👤 ${esc(p.username)}</span>
        ${p.password ? `<span class="cred">🔑 ${esc(p.password)}</span>` : ''}</div><button class="btn small" data-copyowner="${esc(u)}">📋 Login kopiëren</button></div>`).join('') || '<p class="muted">Nog geen.</p>'}</div>
    </div>
  </div>`;

  // Nieuw weekend
  let idEdited = false;
  const showUrl = () => { const id = cleanWeekendId($('#nwid', el).value); $('#nwurl', el).textContent = id ? weekendUrl(id).replace(/^https?:\/\//, '') : ''; };
  $('#nwid', el).oninput = () => { idEdited = true; showUrl(); };
  $('#nwname', el).oninput = () => { if (!idEdited) $('#nwid', el).value = cleanWeekendId($('#nwname', el).value).replace(/-/g, ''); showUrl(); };
  $('#nwf', el).onsubmit = async (e) => {
    e.preventDefault();
    const id = cleanWeekendId($('#nwid', el).value);
    if (!validWeekendId(id)) return toast('Kies een link van 2 tot 30 letters/cijfers (geen paginanaam zoals "admin")', 'bad');
    if (list?.[id] || (await val(wpath('meta', id)))) return toast('Dit weekend bestaat al', 'bad');
    const meta = { name: $('#nwname', el).value.trim(), emoji: $('#nwemoji', el).value.trim() || '🍳', from: $('#nwfrom', el).value || null,
      to: $('#nwto', el).value || null, listed: true, features: { ...DEFAULT_FEATURES }, createdAt: Date.now() };
    await update(ref(db), { [wpath('meta', id)]: meta, [wpath('invite', id)]: { code: newInvite(), open: true }, [`weekendList/${id}`]: listEntry(meta) });
    toast(`${meta.name} staat klaar 🍳`, 'ok');
    mountWeekends(el, { user });
  };

  $$('.wk-admin', el).forEach((card) => {
    const id = card.dataset.w;
    $('[data-open]', card).onclick = () => { setWeekend(id); location.hash = 'weekend'; location.reload(); };
    $('[data-delw]', card).onclick = async () => {
      const typed = prompt(`Weekend "${list[id].name}" met ALLE gegevens (weekendgangers, quizzen, scores…) verwijderen?\nTyp "${id}" om te bevestigen.`);
      if (typed !== id) return;
      const members = Object.keys((await val(wpath('members', id))) || {});
      const upd = { [wpath('', id)]: null, [`weekendList/${id}`]: null };
      for (const u of [...members, ...owners[id]]) upd[`userWeekends/${u}/${id}`] = null;
      await update(ref(db), upd);
      if (weekendId() === id) setWeekend(null);
      toast('Weekend verwijderd 🧹');
      mountWeekends(el, { user });
    };
    $$('[data-rmowner]', card).forEach((b) => {
      b.onclick = async () => {
        if (!confirm(`${nameOf(b.dataset.rmowner)} weghalen als verantwoordelijke van dit weekend?`)) return;
        await update(ref(db), { [wpath(`owners/${b.dataset.rmowner}`, id)]: null, [`userWeekends/${b.dataset.rmowner}/${id}`]: null });
        mountWeekends(el, { user });
      };
    });
    $('[data-addowner]', card).onchange = async (e) => {
      let uid = e.target.value;
      if (!uid) return;
      if (uid === '__new') {
        uid = await newOwner();
        if (!uid) return void (e.target.value = '');
      }
      await update(ref(db), { [wpath(`owners/${uid}`, id)]: true, [`userWeekends/${uid}/${id}`]: 'owner' });
      toast('Verantwoordelijke toegevoegd 👩‍🍳', 'ok');
      mountWeekends(el, { user });
    };
  });
  $$('[data-copyowner]', el).forEach((b) => {
    b.onclick = async () => {
      const p = staff[b.dataset.copyowner];
      const mine = Object.entries(owners).filter(([, us]) => us.includes(b.dataset.copyowner)).map(([w]) => list[w]?.name).filter(Boolean);
      const msg = `Hoi ${p.name}! 🍳\nJe kan ${mine.length ? mine.join(', ') : 'je weekend'} beheren op ${location.origin}/login.html\n\nGebruikersnaam: ${p.username}${p.password ? `\nWachtwoord: ${p.password}` : ''}\n\nKies bij het inloggen "Ik organiseer".`;
      try { await navigator.clipboard.writeText(msg); toast('Gekopieerd 📋', 'ok'); } catch { prompt('Kopieer dit bericht:', msg); }
    };
  });
  if (legacy) wireMigrate(el, () => mountWeekends(el, { user }));
}

// Nieuw account voor een weekendverantwoordelijke (de hoofdadmin blijft ingelogd).
async function newOwner() {
  const name = prompt('Naam van de weekendverantwoordelijke?')?.trim();
  if (!name) return null;
  const username = cleanUsername(prompt('Gebruikersnaam (letters en cijfers)?', cleanUsername(name)) || '');
  if (!username) return null;
  const password = prompt('Wachtwoord (min. 6 tekens)?', genPassword())?.trim();
  if (!password || password.length < 6) { toast('Wachtwoord moet minstens 6 tekens hebben', 'bad'); return null; }
  try {
    const uid = await createOwnerAccount(username, password);
    await set(ref(db, `staff/${uid}`), { name, username, password, createdAt: Date.now() });
    return uid;
  } catch (err) {
    toast(err.code === 'auth/email-already-in-use' ? 'Die gebruikersnaam bestaat al' : `Mislukt: ${err.message}`, 'bad');
    return null;
  }
}

/* ---------- Het eerste weekend overzetten ---------- */
// Vroeger stond alles op de root van de database. We kopiëren het naar weekends/{id}, zodat het een gewoon weekend wordt.
const LEGACY_KEYS = ['roster', 'moderators', 'quizzes', 'media', 'letters', 'members', 'missions', 'missionDrafts', 'avatars', 'raadkaart', 'playlist', 'scoreboard', 'hitster', 'juryPins'];

const migrateCard = () => `<div class="card notice stack" id="migrate">
  <h3 style="margin:0">📦 Jullie eerste weekend overzetten</h3>
  <p style="margin:0">De gegevens van het eerste weekend (weekendgangers, poppetjes, opdrachten, raadkaart, playlist, scorebord, quizzen, Hitster, brieven) staan nog op de oude plek.
    Zet ze over naar een eigen weekend; daarna kan je de oude kopie wissen.</p>
  <div class="row">
    <input class="input" id="mgemoji" value="🥓" maxlength="4" style="width:70px;text-align:center;font-size:1.3rem">
    <input class="input grow" id="mgname" value="SpekmetAI-weekend" maxlength="60">
    <input class="input" id="mgid" value="spekmetai" maxlength="30" style="max-width:180px" title="Link">
  </div>
  <div class="row"><label class="muted">Van <input class="input" type="date" id="mgfrom"></label><label class="muted">Tot <input class="input" type="date" id="mgto"></label>
    <button class="btn bacon" id="mggo">📦 Overzetten</button><button class="btn ghost" id="mgwipe">🧹 Oude kopie wissen</button></div>
</div>`;

function wireMigrate(el, refresh) {
  $('#mggo', el).onclick = async () => {
    const id = cleanWeekendId($('#mgid', el).value);
    if (!validWeekendId(id)) return toast('Ongeldige link', 'bad');
    if (await val(wpath('meta', id)) && !confirm(`Weekend "${id}" bestaat al. Gegevens erin overschrijven met de oude?`)) return;
    const btn = $('#mggo', el);
    btn.disabled = true;
    btn.textContent = 'Bezig…';
    try {
      const data = Object.fromEntries(await Promise.all(LEGACY_KEYS.map(async (k) => [k, await val(k)])));
      const meta = { name: $('#mgname', el).value.trim() || 'SpekmetAI-weekend', emoji: $('#mgemoji', el).value.trim() || '🥓',
        from: $('#mgfrom', el).value || null, to: $('#mgto', el).value || null, listed: true, legacy: true, features: { ...DEFAULT_FEATURES }, createdAt: Date.now() };
      // Namen bij de poppetjes zetten (de homepage toont ze in de line-up).
      for (const [uid, a] of Object.entries(data.avatars || {})) if (data.members?.[uid]) a.name = data.members[uid].name;
      const upd = { [wpath('meta', id)]: meta, [wpath('invite', id)]: { code: newInvite(), open: false }, [`weekendList/${id}`]: listEntry(meta) };
      for (const [k, v] of Object.entries(data)) if (v != null) upd[wpath(k, id)] = v;
      for (const uid of Object.keys(data.members || {})) upd[`userWeekends/${uid}/${id}`] = 'member';
      await update(ref(db), upd);
      setWeekend(id);
      toast('Overgezet! 🎉 Kijk alles na en wis daarna de oude kopie.', 'ok');
      refresh();
    } catch (err) {
      toast(`Overzetten mislukt: ${err.message}`, 'bad');
      btn.disabled = false;
      btn.textContent = '📦 Overzetten';
    }
  };
  $('#mgwipe', el).onclick = async () => {
    const done = Object.keys((await val('weekendList')) || {}).length;
    if (!done) return toast('Zet het weekend eerst over', 'bad');
    if (!confirm('De oude kopie op de root van de database wissen? Doe dit pas als het overgezette weekend goed werkt.')) return;
    await update(ref(db), Object.fromEntries([...LEGACY_KEYS, 'games', 'hgames'].map((k) => [k, null])));
    toast('Oude kopie gewist 🧹', 'ok');
    refresh();
  };
}
