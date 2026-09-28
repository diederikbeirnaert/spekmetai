// Jury-gsm: met code + pin binnen, dan per vraag de kleuren van de matspelers aantikken.
import { $, ART, esc, shell, toast } from './common.js';
import { configured, db, ref, get, set, onValue, useAuth, ensureAnon, notConfiguredHtml } from './fb.js';
import { LIMBS, COLORS } from './twister.js';
import { mountJuryPanel } from './jurypanel.js';

shell('jury');
const app = $('#app');
const SKEY = 'smai.jury';
let user, code, state = {}, current = {}, mat = {}, players = {};
let lastKey = '', unsubPanel = null;

boot();

async function boot() {
  if (!configured) return void (app.innerHTML = notConfiguredHtml());
  useAuth('session');
  user = await ensureAnon();
  let saved = null;
  try { saved = sessionStorage.getItem(SKEY); } catch {}
  if (saved && (await get(ref(db, `games/${saved}/jurors/${user.uid}`)).catch(() => null))?.exists()) return connect(saved);
  renderJoin(new URLSearchParams(location.search).get('code') || '');
}

function renderJoin(prefill) {
  app.innerHTML = `<div class="login-wrap slide-up">
    <div style="font-size:4rem">👩‍⚖️</div>
    <h1>Jury</h1>
    <p class="muted">De code en pin staan op het grote scherm in de lobby.</p>
    <form class="card" id="jf" style="text-align:left">
      <div class="field"><label for="c">Quizcode</label><input class="input" id="c" inputmode="numeric" maxlength="6" value="${esc(prefill)}" required></div>
      <div class="field"><label for="p">Jury-pin</label><input class="input" id="p" inputmode="numeric" maxlength="4" required></div>
      <button class="btn bacon big" style="width:100%">Ik ben de jury ⚖️</button>
    </form></div>`;
  $(prefill ? '#p' : '#c').focus();
  $('#jf').onsubmit = async (e) => {
    e.preventDefault();
    const c = $('#c').value.replace(/\D/g, '');
    try {
      await set(ref(db, `games/${c}/jurors/${user.uid}`), $('#p').value.trim());
      try { sessionStorage.setItem(SKEY, c); } catch {}
      connect(c);
    } catch {
      toast('Code of pin klopt niet', 'bad');
    }
  };
}

function connect(c) {
  code = c;
  const base = `games/${c}`;
  onValue(ref(db, `${base}/state`), (s) => { state = s.val() || { phase: 'gone' }; render(); });
  onValue(ref(db, `${base}/current`), (s) => { current = s.val() || {}; render(); });
  onValue(ref(db, `${base}/mat`), (s) => { mat = s.val() || {}; lastKey = ''; render(); });
  onValue(ref(db, `${base}/players`), (s) => { players = s.val() || {}; render(true); });
  try { navigator.wakeLock?.request('screen'); } catch {}
}

const matPlayers = () => Object.keys(mat).filter((id) => players[id]).map((id) => ({ id, ...players[id] }));
const limb = () => LIMBS[current.limb];

function render(playersOnly = false) {
  const panelPhase = ['question', 'freeze'].includes(state.phase) && current.twister;
  const key = [state.phase, state.qkey, current.limb, Object.keys(mat).join(), panelPhase].join('|');
  if (key === lastKey) {
    if (playersOnly && state.phase === 'reveal') showReveal();
    return;
  }
  lastKey = key;
  unsubPanel?.();
  unsubPanel = null;
  const head = `<div class="play-top"><span class="pill">⚖️ Jury · ${esc(code)}</span>
    ${limb() ? `<span class="pill yolk">${limb().icon} ${esc(limb().name)}</span>` : ''}</div>`;

  if (state.phase === 'gone') {
    app.innerHTML = `<div class="play-screen"><h2>Dit spel bestaat niet meer</h2><a class="btn" href="jury.html">Andere code</a></div>`;
    return;
  }
  if (panelPhase) {
    const legend = (current.options || []).map((t, i) =>
      `<span class="jury-legend"><i class="tw-dot" style="background:${COLORS[i].hex}"></i>${esc(t)}</span>`).join('');
    app.innerHTML = `${head}
      <h2 class="center" style="margin:12px 0 6px">${state.phase === 'freeze' ? '🥶 FREEZE!' : esc(current.text)}</h2>
      <div class="jury-legends">${legend}</div>
      <p class="muted center" style="margin:4px 0">Tik de kleur aan <b>in de volgorde</b> waarin ze neerzetten. 🔥 = aangebrand.</p>
      <div id="panel"></div>`;
    unsubPanel = mountJuryPanel($('#panel'), { code, qkey: state.qkey, matPlayers: matPlayers(), colorCount: (current.options || []).length || 2 });
    return;
  }
  if (state.phase === 'reveal') return showReveal();
  const msg = {
    lobby: 'Wachten tot de quiz start…',
    intro: current.twister ? `${limb() ? `${limb().icon} ${limb().name}!` : '🌀 De spinner draait…'}` : 'Deze vraag is zonder mat.',
    scoreboard: 'Tussenstand op het grote scherm.',
    end: 'De quiz is gedaan. Bedankt, jury! 🙏',
  }[state.phase] || '';
  app.innerHTML = `${head}<div class="play-screen">
    <div class="wobble" style="width:110px">${ART.egg()}</div>
    <h2>${esc(msg)}</h2>
    ${state.phase === 'intro' && current.text ? `<p>${esc(current.text)}</p>` : ''}
    <div class="mat-roster" style="color:#fff"><b>🥓 Op de mat</b>${matPlayers().map((p) => `<span>${esc(p.avatar)} ${esc(p.name)}</span>`).join('') || '<span>niemand</span>'}</div>
  </div>`;
}

function showReveal() {
  const rows = Object.values(players).filter((p) => p.last?.q === state.qkey && p.last.mat).map((p) => {
    const l = p.last;
    return `<div class="jury-row ${l.burned ? 'burned' : ''}"><span class="jury-who"><span class="av">${esc(p.avatar)}</span>${esc(p.name)}</span>
      <b>${l.burned ? '🔥' : l.ok ? '✔' : '✘'} ${l.pts > 0 ? '+' : ''}${l.pts}</b></div>`;
  }).join('');
  app.innerHTML = `<div class="play-top"><span class="pill">⚖️ Jury · ${esc(code)}</span></div>
    <h2 class="center">Onthuld!</h2><div class="jury">${rows || '<p class="muted center">Even rekenen…</p>'}</div>`;
}
