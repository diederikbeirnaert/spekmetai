// Raadkaart: weekendgangers prikken 1× per dag waar het weekend plaatsvindt.
// Het temperatuur-ei toont hoe warm je zit (van bevroren blauw tot gloeiend rood).
// Bij de onthulling staan alle avatars op de kaart met hun afstand, zoals bij GeoGuessr.
import { $, ART, esc, shell, toast, confetti, av, setAvatars, setSessionHint } from './common.js';
import {
  configured, db, ref, get, update, onValue, serverTimestamp, useAuth, currentUser, serverNow, notConfiguredHtml, watchAvatars, isAdmin,
} from './fb.js';
import {
  makeMap, eggPin, avatarPin, goalPin, tempEgg, tColor, tempFor, tempKey, fmtKm, dayIndex, dayLabel, TEMPS_HOT_FIRST, STEPS,
} from './mapkit.js';

shell('raadkaart');
const app = $('#app');
let user, member, admin = false, map, L;
let config = {}, reveal = null, last = null, guesses = {};
let draft = null, draftMarker = null, guessLayer = null, busy = false;

init();

async function init() {
  if (!configured) return void (app.innerHTML = notConfiguredHtml());
  app.innerHTML = `<div class="play-screen"><div class="wobble" style="width:120px">${ART.egg()}</div><p class="muted">Kaart opwarmen…</p></div>`;
  useAuth('local');
  user = await currentUser();
  member = user && !user.isAnonymous ? (await get(ref(db, `members/${user.uid}`)).catch(() => null))?.val() : null;
  // De admin mag meespelen om te testen (enkel in testmodus).
  admin = !member && (await isAdmin(user));
  if (admin) member = { name: 'Chef-kok' };
  if (!member) {
    app.innerHTML = `<div class="login-wrap slide-up"><div class="float" style="width:130px;margin:auto">${ART.egg()}</div>
      <h1>Waar bakken we?</h1><p>Log in als weekendganger om de locatie van het weekend te raden.</p>
      <a class="btn bacon big" href="login.html?next=raadkaart.html">Inloggen</a></div>`;
    return;
  }
  if (!admin) setSessionHint({ role: 'member', name: member.name, username: member.username });
  watchAvatars(setAvatars);
  renderShell();
  map = await makeMap($('#map'));
  L = window.L;
  guessLayer = L.layerGroup().addTo(map);
  map.on('click', onMapClick);

  onValue(ref(db, 'raadkaart/config'), (s) => { config = s.val() || {}; renderStatus(); });
  onValue(ref(db, 'raadkaart/reveal'), (s) => { reveal = s.val(); reveal ? renderReveal() : renderStatus(); });
  onValue(ref(db, `raadkaart/last/${user.uid}`), (s) => { last = s.val(); if (!busy) renderStatus(); });
  onValue(ref(db, `raadkaart/guesses/${user.uid}`), (s) => { guesses = s.val() || {}; if (!busy) renderGuesses(); });
  setInterval(() => { if (!reveal) renderCountdown(); }, 1000);
}

const today = () => dayIndex(serverNow());
const canGuess = () => config.open === true && !reveal && (admin ? config.test === true : config.test === true || !last || last.day < today());
const testBanner = () => (config.test ? '<div class="rk-test">🧪 Testmodus: onbeperkt raden. Deze gokken worden als test gemarkeerd.</div>' : '');
const myList = () => Object.values(guesses).sort((a, b) => a.day - b.day || (a.at || 0) - (b.at || 0));

function renderShell() {
  app.innerHTML = `
    <div class="rk-head slide-up">
      <h1 style="margin:0">🗺️ Waar bakken we?</h1>
      <p class="muted" style="margin:6px 0 0">Prik elke dag één keer waar jij denkt dat het weekend doorgaat. Het ei vertelt hoe warm je zit.</p>
    </div>
    <div class="rk-grid">
      <div class="card rk-mapcard"><div id="map" class="rk-map"></div></div>
      <aside class="rk-side">
        <div class="card center" id="status"></div>
        <div class="card" id="hist"></div>
      </aside>
    </div>`;
}

function onMapClick(e) {
  if (reveal || busy) return;
  if (!canGuess()) return toast(config.open ? 'Morgen mag je opnieuw raden 🥚' : 'De raadkaart is nog dicht', 'bad');
  draft = { lat: +e.latlng.lat.toFixed(5), lng: +e.latlng.lng.toFixed(5) };
  draftMarker?.remove();
  draftMarker = L.marker([draft.lat, draft.lng], { icon: eggPin(L, '#FFFFFF', 'Mijn gok?') }).addTo(map);
  renderStatus();
}

function renderStatus() {
  const el = $('#status');
  if (!el || reveal) return;
  const mine = myList();
  const latest = mine.at(-1);
  if (admin && !config.test) {
    el.innerHTML = `<div class="wobble" style="width:110px;margin:auto">${ART.egg()}</div><h3>Admin-weergave</h3>
      <p class="muted">Zet de 🧪 testmodus aan in de admin om zelf te testen.</p>`;
    return;
  }
  if (!config.open) {
    el.innerHTML = `<div class="wobble" style="width:110px;margin:auto">${ART.egg()}</div><h3>De kaart is nog dicht</h3><p class="muted">Binnenkort mag je beginnen raden!</p>`;
    return;
  }
  if (canGuess()) {
    el.innerHTML = testBanner() + (draft
      ? `${tempEgg(Math.floor(STEPS / 2), 'rk-egg')}<h3>Hier gokken?</h3>
         <p class="muted">Je mag vandaag maar één keer. Klik ergens anders om te verschuiven.</p>
         <button class="btn bacon big" id="go" style="width:100%">🍳 Bak mijn gok</button>`
      : `${latest ? tempEgg(latest.t, 'rk-egg') : `<div class="float" style="width:110px;margin:auto">${ART.egg()}</div>`}
         <h3>Je mag vandaag raden!</h3><p class="muted">Tik op de kaart waar jij denkt dat we heen gaan.</p>`);
    $('#go')?.addEventListener('click', submitGuess);
    return;
  }
  el.innerHTML = `${latest ? tempEgg(latest.t, 'rk-egg pop-in') : ''}
    <h3>${latest ? 'Je gok van vandaag zit erin' : 'Vandaag al geraden'}</h3>
    <p class="muted">Morgen mag je opnieuw. Nog <b id="cd"></b>.</p>`;
  renderCountdown();
}

function renderCountdown() {
  const el = $('#cd');
  if (!el) return;
  const ms = Math.max(0, (today() + 1) * 86400000 - 7200000 - serverNow());
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  el.textContent = `${h}u ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
  if (ms === 0) renderStatus();
}

// De database controleert zelf welke temperatuur klopt: we proberen alle 40 tegelijk, alleen de juiste
// wordt aanvaard. Zo blijft de echte locatie geheim en heb je toch meteen antwoord.
async function submitGuess() {
  if (!draft || busy) return;
  busy = true;
  const el = $('#status');
  let frame = 0;
  const anim = setInterval(() => {
    el.querySelector('.temp-egg')?.replaceWith(Object.assign(document.createElement('div'), { innerHTML: tempEgg(frame, 'rk-egg') }).firstElementChild);
    frame = (frame + 3) % STEPS;
  }, 120);
  el.querySelector('h3').textContent = 'Het ei warmt op…';
  el.querySelector('#go')?.remove();
  const day = today();
  // In testmodus mag je vaker per dag gokken, dus krijgt elke testgok een eigen sleutel.
  const key = config.test ? `${day}-test-${Date.now().toString(36)}` : `${day}`;
  const attempts = TEMPS_HOT_FIRST.map((t) => update(ref(db, 'raadkaart'), {
    [`last/${user.uid}`]: { day, at: serverTimestamp() },
    [`guesses/${user.uid}/${key}`]: { ...draft, t, tk: tempKey(t), day, at: serverTimestamp(), ...(config.test ? { test: true } : {}) },
  }).then(() => t));
  const results = await Promise.allSettled(attempts);
  const hit = results.find((r) => r.status === 'fulfilled')?.value ?? null;
  await new Promise((r) => setTimeout(r, 600)); // even laten opwarmen voor het effect
  clearInterval(anim);
  busy = false;
  draftMarker?.remove();
  draftMarker = null;
  draft = null;
  const [g, l] = await Promise.all([get(ref(db, `raadkaart/guesses/${user.uid}`)), get(ref(db, `raadkaart/last/${user.uid}`))]);
  guesses = g.val() || {};
  last = l.val();
  renderGuesses();
  if (hit == null) return toast('Raden lukte niet. Misschien heb je vandaag al gegokt?', 'bad');
  navigator.vibrate?.(hit > STEPS - 8 ? [60, 40, 60] : 40);
  if (hit >= STEPS - 4) confetti(hit === STEPS - 1 ? 80 : 30);
}

function renderGuesses() {
  if (!guessLayer || reveal) return;
  guessLayer.clearLayers();
  const mine = myList();
  mine.forEach((g) => L.marker([g.lat, g.lng], { icon: eggPin(L, tColor(g.t), `${g.test ? '🧪 ' : ''}${dayLabel(g.day)}`) }).addTo(guessLayer));
  const hist = $('#hist');
  hist.innerHTML = `<h3>Mijn gokken</h3>
    <div class="rk-scale"><span>🧊</span><div class="rk-bar">${mine.map((g) => `<i style="left:${(g.t / (STEPS - 1)) * 100}%;background:${tColor(g.t)}"></i>`).join('')}</div><span>🔥</span></div>
    ${mine.length ? `<ol class="rk-list">${[...mine].reverse().map((g) => `<li><span class="rk-dot" style="background:${tColor(g.t)}"></span>${esc(dayLabel(g.day))}${g.test ? ' <span class="pill" style="font-size:.7rem">🧪 test</span>' : ''}</li>`).join('')}</ol>`
      : '<p class="muted">Nog geen gokken.</p>'}`;
  if (mine.length && !draft) map.setView([mine.at(-1).lat, mine.at(-1).lng], Math.max(map.getZoom(), 6));
  renderStatus();
}

/* ---------- Onthulling ---------- */
function renderReveal() {
  const goal = [reveal.lat, reveal.lng];
  guessLayer.clearLayers();
  draftMarker?.remove();
  const results = reveal.results || [];
  const bounds = [goal];
  L.marker(goal, { icon: goalPin(L), zIndexOffset: 1000 }).addTo(guessLayer).bindTooltip(esc(reveal.name || 'Hier!'), { permanent: true, direction: 'top', offset: [0, -60], className: 'goal-label' });
  results.forEach((r, i) => {
    const color = tColor(tempFor(r.km));
    L.polyline([[r.lat, r.lng], goal], { color, weight: 4, dashArray: '8 8', opacity: 0.9 }).addTo(guessLayer);
    L.marker([r.lat, r.lng], { icon: avatarPin(L, av({ member: true }, r.uid), `${i + 1}. ${r.name} · ${fmtKm(r.km)}`), zIndexOffset: 500 - i }).addTo(guessLayer);
    bounds.push([r.lat, r.lng]);
  });
  // Buiten competitie: grijs op de kaart, niet in de ranking.
  (reveal.others || []).forEach((r) => {
    L.polyline([[r.lat, r.lng], goal], { color: '#9A8C7E', weight: 3, dashArray: '4 8', opacity: 0.7 }).addTo(guessLayer);
    L.marker([r.lat, r.lng], { icon: avatarPin(L, av({ member: true }, r.uid), `${r.name} · ${fmtKm(r.km)} · buiten competitie`), zIndexOffset: -100 }).addTo(guessLayer)
      .getElement()?.classList.add('rk-outside');
    bounds.push([r.lat, r.lng]);
  });
  map.fitBounds(bounds, { padding: [60, 60], maxZoom: 11 });
  const winner = results[0];
  $('#status').innerHTML = `<div class="rk-crack pop-in">${tempEgg(STEPS - 1)}</div>
    <h2 style="margin:6px 0">📍 We bakken in ${esc(reveal.name || '…')}!</h2>
    ${winner ? `<p><b>${esc(winner.name)}</b> zat het dichtst: ${fmtKm(winner.km)} 🏆<br><span class="muted">en krijgt ×1,2 punten op de quiz!</span></p>` : ''}`;
  $('#hist').innerHTML = `<h3>Ranking</h3><ol class="rk-rank">${results.map((r, i) => `
    <li class="${r.uid === user.uid ? 'me' : ''}"><span class="rk-pos">${i === 0 ? '🏆' : i + 1}</span>${av({ member: true }, r.uid)}
      <b>${esc(r.name)}</b><span class="rk-km" style="background:${tColor(tempFor(r.km))}">${fmtKm(r.km)}</span></li>`).join('') || '<li class="muted">Niemand heeft gegokt.</li>'}</ol>`;
  confetti(40);
}
