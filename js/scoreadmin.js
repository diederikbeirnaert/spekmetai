// Admin-tabblad "Scorebord": punten uitdelen voor spelletjes (volgens volgorde of vrij),
// en (alleen de hoofdadmin) rondes aanpassen of verwijderen.
import { $, $$, esc, toast, uid, av, setAvatars } from './common.js';
import { db, ref, get, set, remove, onValue, watchAvatars } from './fb.js';
import { totals, orderPoints, sortedEntries, KIND_ICON, standings, animateFigures } from './scoreboard.js';

let unsub = null;

export async function mountScoreAdmin(el, { light = false } = {}) {
  unsub?.();
  const roster = (await get(ref(db, 'roster')).catch(() => null))?.val() || {};
  const people = Object.entries(roster).map(([id, m]) => ({ id, name: m.name })).sort((a, b) => a.name.localeCompare(b.name));
  const names = Object.fromEntries(people.map((p) => [p.id, p.name]));
  watchAvatars(setAvatars);
  let entries = {};
  let config = {}; // { test: true } = testmodus: nieuwe punten zijn testpunten
  // Formulier: wie in welke volgorde eindigde, of vrije punten per persoon.
  let form = { id: null, title: '', kind: 'game', mode: 'order', order: [], free: {} };

  const editing = () => !!form.id;
  const preview = () => (form.mode === 'order' ? orderPoints(form.order)
    : Object.fromEntries(Object.entries(form.free).filter(([, v]) => v !== '' && !Number.isNaN(Number(v))).map(([k, v]) => [k, Number(v)])));

  function render() {
    if (!document.contains(el)) { unsub?.(); return; }
    const list = totals(entries, { includeTest: !!config.test });
    const testCount = Object.values(entries).filter((e) => e.test).length;
    const rounds = sortedEntries(entries);
    const pts = preview();
    el.innerHTML = `
      <div class="pl-grid">
        <div class="pl-main">
          <div class="card stack sb-testbar ${config.test ? 'on' : ''}">
            <div class="row" style="justify-content:space-between">
              ${light ? `<b>${config.test ? '🧪 Testmodus staat aan: nieuwe punten zijn testpunten' : '🧪 Testmodus staat uit'}</b>`
                : `<label class="check-row"><input type="checkbox" id="sbtest" ${config.test ? 'checked' : ''}>
                  <span><b>🧪 Testmodus</b><br><span class="muted" style="font-weight:700">Nieuwe punten (ook uit quizzen) worden testpunten. Ze tellen alleen mee zolang de testmodus aan staat.</span></span></label>
                <button class="btn small ghost" id="sbclear" ${testCount ? '' : 'disabled'}>🧪 Testpunten wissen (${testCount})</button>`}
            </div>
          </div>
          <div class="card stack" id="sbform">
            <h3 style="margin:0">${editing() ? '✏️ Ronde aanpassen' : '➕ Punten uitdelen'}</h3>
            <div class="row">
              <input class="input grow" id="sbtitle" maxlength="80" placeholder="Naam van het spel, bv. Bierpong of Petanque" value="${esc(form.title)}">
              <select class="input" id="sbkind" style="width:auto">
                <option value="game" ${form.kind === 'game' ? 'selected' : ''}>🎲 Spel</option>
                <option value="quiz" ${form.kind === 'quiz' ? 'selected' : ''}>🍳 Quiz</option>
                <option value="bonus" ${form.kind === 'bonus' ? 'selected' : ''}>⭐ Bonus/straf</option>
              </select>
            </div>
            <div class="sb-tabs">
              <button type="button" class="${form.mode === 'order' ? 'active' : ''}" data-mode="order">🏁 Volgens volgorde</button>
              <button type="button" class="${form.mode === 'free' ? 'active' : ''}" data-mode="free">✍️ Vrije punten</button>
            </div>
            ${form.mode === 'order' ? `
              <p class="muted" style="margin:0">Tik de spelers aan <b>in de volgorde waarin ze eindigden</b> (winnaar eerst). Wie niet meedeed, laat je weg.
                Met ${form.order.length || 'n'} spelers krijgt de eerste ${form.order.length || 'n'} punten, de laatste 1.</p>
              <div class="sb-people">${people.map((p) => {
                const pos = form.order.indexOf(p.id);
                return `<button type="button" class="sb-person ${pos >= 0 ? 'on' : ''}" data-pick="${esc(p.id)}">
                  ${pos >= 0 ? `<span class="sb-badge">${pos + 1}</span>` : ''}${av({ member: true }, p.id)}<span>${esc(p.name)}</span>
                  ${pos >= 0 ? `<b>+${pts[p.id]}</b>` : ''}</button>`;
              }).join('') || '<p class="muted">Nog geen weekendgangers.</p>'}</div>
              ${form.order.length ? '<button type="button" class="btn small ghost" id="sbreset">↺ Volgorde wissen</button>' : ''}`
            : `
              <p class="muted" style="margin:0">Vul per persoon punten in (ook min mag, bv. −2 als straf). Leeg = deed niet mee.</p>
              <div class="sb-free">${people.map((p) => `<label class="sb-freerow">${av({ member: true }, p.id)}<span>${esc(p.name)}</span>
                <input class="input" type="number" step="1" data-free="${esc(p.id)}" value="${esc(form.free[p.id] ?? '')}" placeholder="–"></label>`).join('')}</div>`}
            <div class="row">
              <button class="btn ok" id="sbsave" ${Object.keys(pts).length && form.title.trim() ? '' : 'disabled'}>${editing() ? '💾 Wijziging opslaan' : '🏆 Punten toekennen'}</button>
              ${editing() ? '<button class="btn ghost" id="sbcancel">Annuleren</button>' : ''}
            </div>
          </div>
          <div class="pl-listhead"><h2 style="margin:0">Rondes (${rounds.length})</h2><small class="muted">nieuwste eerst</small></div>
          <ol class="sb-rounds">${rounds.map((e) => `<li data-entry="${esc(e.id)}">
              <div class="sb-roundhead"><b>${KIND_ICON[e.kind] || '🎲'} ${esc(e.title)}</b>${e.test ? '<span class="pill" style="font-size:.75rem;background:#4F9FE0">🧪 test</span>' : ''}
                <small class="muted">${esc(new Date(e.at).toLocaleString('nl-BE', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }))}</small>
                ${light ? '' : `<span class="sb-actions"><button class="btn small ghost icon" data-edit title="Aanpassen">✏️</button>
                  <button class="btn small ghost icon" data-del title="Verwijderen">🗑</button></span>`}</div>
              <div class="sb-chips">${Object.entries(e.points || {}).sort((a, b) => b[1] - a[1]).map(([u, p]) =>
                `<span class="sb-chip">${av({ member: true }, u)} ${esc(e.names?.[u] || names[u] || '?')} <b>${p > 0 ? '+' : ''}${p}</b></span>`).join('')}</div>
            </li>`).join('') || '<li class="card muted">Nog geen punten uitgedeeld.</li>'}</ol>
        </div>
        <aside class="pl-side">
          <div class="card"><h3 style="margin-top:0">🏆 Tussenstand</h3>${standings(list)}</div>
          ${light ? '<div class="card muted">Je kan punten toevoegen. Aanpassen of verwijderen kan alleen de hoofdadmin.</div>' : ''}
        </aside>
      </div>`;
    animateFigures(el);
    wire();
  }

  function wire() {
    $('#sbtest', el)?.addEventListener('change', (e) => set(ref(db, 'scoreboard/config/test'), e.target.checked || null));
    $('#sbclear', el)?.addEventListener('click', async () => {
      const ids = Object.entries(entries).filter(([, e]) => e.test).map(([k]) => k);
      if (!confirm(`${ids.length} testronde(s) wissen?`)) return;
      await Promise.all(ids.map((k) => remove(ref(db, `scoreboard/entries/${k}`))));
      toast('Testpunten gewist 🧪', 'ok');
    });
    $('#sbtitle', el).oninput = (e) => { form.title = e.target.value; $('#sbsave', el).disabled = !(Object.keys(preview()).length && form.title.trim()); };
    $('#sbkind', el).onchange = (e) => { form.kind = e.target.value; };
    $$('[data-mode]', el).forEach((b) => { b.onclick = () => { form.mode = b.dataset.mode; render(); }; });
    $$('[data-pick]', el).forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.pick;
        form.order = form.order.includes(id) ? form.order.filter((x) => x !== id) : [...form.order, id];
        render();
      };
    });
    $('#sbreset', el)?.addEventListener('click', () => { form.order = []; render(); });
    $$('[data-free]', el).forEach((i) => {
      i.oninput = () => { form.free[i.dataset.free] = i.value; $('#sbsave', el).disabled = !(Object.keys(preview()).length && form.title.trim()); };
    });
    $('#sbcancel', el)?.addEventListener('click', () => { form = { id: null, title: '', kind: 'game', mode: 'order', order: [], free: {} }; render(); });
    $('#sbsave', el).onclick = async () => {
      const points = preview();
      const id = form.id || `g${uid()}`;
      const old = entries[form.id] || {};
      const entry = {
        ...old, title: form.title.trim(), kind: form.kind, at: old.at || Date.now(), points,
        ...(form.id ? {} : config.test ? { test: true } : {}),
        names: Object.fromEntries(Object.keys(points).map((u) => [u, names[u] || old.names?.[u] || '?'])),
      };
      try {
        await set(ref(db, `scoreboard/entries/${id}`), entry);
        toast(editing() ? 'Ronde aangepast ✏️' : `Punten toegekend aan ${Object.keys(points).length} spelers 🏆`, 'ok');
        form = { id: null, title: '', kind: 'game', mode: 'order', order: [], free: {} };
      } catch {
        toast('Opslaan lukte niet', 'bad');
      }
    };
    $$('[data-entry]', el).forEach((li) => {
      const e = entries[li.dataset.entry];
      $('[data-del]', li)?.addEventListener('click', async () => {
        if (!confirm(`"${e.title}" en de punten ervan verwijderen?`)) return;
        await remove(ref(db, `scoreboard/entries/${li.dataset.entry}`));
        toast('Ronde verwijderd');
      });
      $('[data-edit]', li)?.addEventListener('click', () => {
        // Aanpassen gebeurt altijd met vrije punten, zodat ook quizpunten exact te wijzigen zijn.
        form = { id: li.dataset.entry, title: e.title, kind: e.kind || 'game', mode: 'free', order: [], free: { ...e.points } };
        render();
        $('#sbform', el).scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  const u1 = onValue(ref(db, 'scoreboard/entries'), (s) => { entries = s.val() || {}; render(); }, () => {});
  const u2 = onValue(ref(db, 'scoreboard/config'), (s) => { config = s.val() || {}; render(); }, () => {});
  unsub = () => { u1(); u2(); };
}
