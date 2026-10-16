// Geheime opdrachten met concepten: wat je typt is eerst een concept (missionDrafts/{uid}, onzichtbaar
// voor de weekendganger). Pas bij "Delen" komt het in missions/{uid}, en dus in het portaal.
import { $, $$, esc, toast } from './common.js';
import { db, ref, get, set, update } from './fb.js';

const fmtTime = (t) => new Date(t).toLocaleString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const shared = (missions, id) => missions[id]?.text || '';
// Het concept; zonder concept geldt de gedeelde tekst.
const draftOf = (missions, drafts, id) => (drafts[id] ? drafts[id].text || '' : shared(missions, id));

export async function loadMissions() {
  const [missions, drafts] = await Promise.all(['missions', 'missionDrafts'].map(async (k) => (await get(ref(db, k)).catch(() => null))?.val() || {}));
  return { missions, drafts };
}

function statusOf(missions, drafts, id) {
  const pub = shared(missions, id);
  const draft = draftOf(missions, drafts, id);
  if (!pub && !draft) return { key: 'none', html: '<span class="pill" style="background:var(--muted)">Nog geen opdracht</span>' };
  if (!pub) return { key: 'draft', html: '<span class="pill" style="background:#7a6f99">📝 Concept, nog niet gedeeld</span>' };
  if (draft !== pub) return { key: 'changed', html: '<span class="pill" style="background:#c9822a">✏️ Wijziging nog niet gedeeld</span>' };
  const ms = missions[id];
  return { key: 'shared', html: ms.revealedAt ? `<span class="pill" style="background:var(--ok)">✅ Gedeeld · geopend ${esc(fmtTime(ms.revealedAt))}</span>`
    : '<span class="pill yolk">✅ Gedeeld · 🥚 nog niet geopend</span>' };
}

// Bovenaan de lijst: tellers en de grote knop om alles in één keer te delen.
export function missionsToolbar(ids, { missions, drafts }) {
  const st = ids.map((id) => statusOf(missions, drafts, id).key);
  const pending = st.filter((k) => k === 'draft' || k === 'changed').length;
  const opened = ids.filter((id) => missions[id]?.revealedAt && statusOf(missions, drafts, id).key === 'shared').length;
  return `<div class="card mission-bar">
    <div class="grow">
      <b>🤫 Geheime opdrachten</b>
      <p class="muted" style="margin:4px 0 0">Wat je typt is eerst een <b>concept</b>: de weekendganger ziet het pas als je deelt.</p>
      <div class="row" style="margin-top:8px;gap:6px">
        <span class="pill yolk">✅ ${st.filter((k) => k === 'shared').length} gedeeld</span>
        <span class="pill" style="background:#7a6f99">📝 ${pending} klaar om te delen</span>
        <span class="pill" style="background:var(--ok)">🍳 ${opened} geopend</span>
      </div>
    </div>
    <button class="btn bacon big" id="shareall" ${pending ? '' : 'disabled'}>📤 Deel alle opdrachten${pending ? ` (${pending})` : ''}</button>
  </div>`;
}

export function missionField(id, { missions, drafts }) {
  const st = statusOf(missions, drafts, id);
  return `<div class="mission-field" data-mission-id="${esc(id)}">
    <div class="row" style="justify-content:space-between;margin:14px 0 6px"><label style="font-weight:800">Geheime opdracht</label><span data-mstatus>${st.html}</span></div>
    <textarea class="input" data-mission placeholder="bv. Laat iemand anders onopgemerkt 3x 'spek' zeggen…">${esc(draftOf(missions, drafts, id))}</textarea>
    <div class="row" style="margin-top:8px">
      <button class="btn small" data-msave disabled>💾 Bewaar concept</button>
      <button class="btn small ok" data-mshare ${st.key === 'draft' || st.key === 'changed' ? '' : 'disabled'}>📤 Nu delen</button>
      ${shared(missions, id) ? '<button class="btn small ghost" data-munshare title="Weer verbergen voor deze persoon">🙈 Verbergen</button>' : ''}
      <small class="muted">Na het delen van een gewijzigde opdracht moet de persoon het ei opnieuw flippen.</small>
    </div>
  </div>`;
}

// Knoppen activeren. `state` = { missions, drafts }; `names` = { uid: naam }; `refresh` tekent de lijst opnieuw.
export function wireMissions(root, ids, state, names, refresh) {
  const { missions, drafts } = state;
  const publish = (id, text) => (text
    ? { [`missions/${id}`]: { text, updatedAt: Date.now() }, [`missionDrafts/${id}`]: { text, updatedAt: Date.now() } }
    : { [`missions/${id}`]: null, [`missionDrafts/${id}`]: null });

  $$('[data-mission-id]', root).forEach((box) => {
    const id = box.dataset.missionId;
    const ta = $('[data-mission]', box);
    const save = $('[data-msave]', box);
    const share = $('[data-mshare]', box);
    ta.oninput = () => {
      save.disabled = ta.value.trim() === draftOf(missions, drafts, id).trim();
      share.disabled = ta.value.trim() === shared(missions, id).trim();
    };
    save.onclick = async () => {
      const text = ta.value.trim();
      await set(ref(db, `missionDrafts/${id}`), { text, updatedAt: Date.now() });
      toast(`Concept voor ${names[id] || 'deze persoon'} bewaard 📝 (nog niet gedeeld)`, 'ok');
      refresh();
    };
    share.onclick = async () => {
      const text = ta.value.trim();
      if (!confirm(text ? `De opdracht nu delen met ${names[id] || 'deze persoon'}?` : `De opdracht van ${names[id] || 'deze persoon'} wissen?`)) return;
      await update(ref(db), publish(id, text));
      toast(text ? `Opdracht gedeeld met ${names[id] || 'deze persoon'} 📤` : 'Opdracht gewist', 'ok');
      refresh();
    };
    $('[data-munshare]', box)?.addEventListener('click', async () => {
      if (!confirm(`De opdracht weer verbergen voor ${names[id] || 'deze persoon'}? De tekst blijft als concept bewaard.`)) return;
      await update(ref(db), { [`missions/${id}`]: null, [`missionDrafts/${id}`]: { text: shared(missions, id), updatedAt: Date.now() } });
      toast('Opdracht verborgen 🙈', 'ok');
      refresh();
    });
  });

  $('#shareall', root)?.addEventListener('click', async () => {
    // Wat nog in een tekstvak staat maar niet bewaard is, gaat ook mee.
    const texts = Object.fromEntries(ids.map((id) => [id, $(`[data-mission-id="${id}"] [data-mission]`, root)?.value.trim() ?? draftOf(missions, drafts, id)]));
    const todo = ids.filter((id) => texts[id] !== shared(missions, id).trim() && (texts[id] || shared(missions, id)));
    if (!todo.length) return toast('Alles is al gedeeld');
    if (!confirm(`${todo.length} ${todo.length === 1 ? 'opdracht' : 'opdrachten'} nu delen? Iedereen kan zijn opdracht dan meteen openen in het portaal.`)) return;
    await update(ref(db), Object.assign({}, ...todo.map((id) => publish(id, texts[id]))));
    toast(`${todo.length} ${todo.length === 1 ? 'opdracht' : 'opdrachten'} gedeeld 📤🎉`, 'ok');
    refresh();
  });
}
