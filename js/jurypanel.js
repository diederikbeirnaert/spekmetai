// Jury-paneel: per matspeler de kleur aantikken (in volgorde van neerzetten) en 🔥 bij aanbranden.
// Wordt gebruikt op het hostscherm én op de jury-gsm; beide schrijven naar games/{code}/jury/{qkey}.
import { ART, esc, toast, av } from './common.js';
import { db, ref, set, onValue } from './fb.js';
import { COLORS } from './twister.js';

const clean = (v) => ({ picks: v?.picks || {}, order: (v?.order || []).filter(Boolean), burned: v?.burned || {} });

// matPlayers: [{ id, name, avatar }], colorCount: 2 (waar/niet waar) of 2–4
export function mountJuryPanel(el, { code, qkey, matPlayers, colorCount }) {
  const r = ref(db, `games/${code}/jury/${qkey}`);
  let data = clean(null);

  const render = () => {
    el.innerHTML = `<div class="jury">${matPlayers.map((p) => {
      const pick = data.picks[p.id];
      const pos = data.order.indexOf(p.id) + 1;
      const burned = !!data.burned[p.id];
      return `<div class="jury-row ${burned ? 'burned' : ''}">
        <span class="jury-who"><span class="jury-order">${pos || '·'}</span><span class="av">${av(p, p.id)}</span>${esc(p.name)}</span>
        <span class="jury-colors">${Array.from({ length: colorCount }, (_, c) => `
          <button class="jury-c a${c} ${pick === c ? 'sel' : ''}" data-u="${esc(p.id)}" data-c="${c}" title="${COLORS[c].name}">${ART.answer[c]}</button>`).join('')}
        </span>
        <button class="jury-burn ${burned ? 'on' : ''}" data-u="${esc(p.id)}" data-burn title="Aangebrand (gevallen / knie of elleboog op de mat)">🔥</button>
      </div>`;
    }).join('') || '<p class="muted">Niemand op de mat.</p>'}</div>`;
  };

  const unsub = onValue(r, (s) => { data = clean(s.val()); render(); });
  render();

  el.onclick = (e) => {
    const b = e.target.closest('button[data-u]');
    if (!b) return;
    const u = b.dataset.u;
    const next = structuredClone(data);
    if ('burn' in b.dataset) {
      if (next.burned[u]) delete next.burned[u];
      else next.burned[u] = true;
    } else {
      const c = +b.dataset.c;
      if (next.picks[u] === c) {
        delete next.picks[u];
        next.order = next.order.filter((x) => x !== u);
      } else {
        next.picks[u] = c;
        if (!next.order.includes(u)) next.order.push(u);
      }
    }
    navigator.vibrate?.(20);
    data = next;
    render();
    set(r, next).catch(() => toast('De jury kan nu niet meer aanpassen', 'bad'));
  };

  return () => { unsub(); el.onclick = null; };
}
