// Portaal voor weekendgangers: inloggen en de geheime opdracht onthullen door het ei te flippen.
import { $, ART, esc, shell, confetti, setSessionHint, av, setAvatars, avatarOf } from './common.js?v=w1';
import { cachedMeta, hasFeature } from './weekend.js?v=w1';
import {
  configured, db, wref, ref, get, set, serverTimestamp, useAuth, currentUser, notConfiguredHtml, signOut, watchAvatars, weekendId, whoAmI,
} from './fb.js?v=w1';

shell('portaal');
const app = $('#app');
let user, member, mission;
const on = (k) => hasFeature(cachedMeta(), k);

init();

async function init() {
  if (!configured) return void (app.innerHTML = notConfiguredHtml());
  app.innerHTML = `<div class="play-screen"><div class="wobble" style="width:120px">${ART.egg()}</div><p class="muted">Pan opwarmen…</p></div>`;
  useAuth('local');
  user = await currentUser();
  if (user && !user.isAnonymous) await whoAmI(user); // springt zo nodig naar het weekend van deze gebruiker
  if (user && !user.isAnonymous && (await loadMember())) {
    setSessionHint({ role: 'member', name: member.name, username: member.username, w: weekendId() });
    watchAvatars((all) => { setAvatars(all); if (!on('missions') && !$('#mission')) renderHome(); });
    return renderPan();
  }
  // Ingelogd, maar geen weekendganger (bv. de admin): niet doorsturen, anders ontstaat er een lus.
  if (user && !user.isAnonymous) return renderNotMember();
  renderLogin();
}

async function loadMember() {
  try {
    member = (await get(wref(`members/${user.uid}`))).val();
    if (!member) return false;
    mission = on('missions') ? (await get(wref(`missions/${user.uid}`)).catch(() => null))?.val() : null;
    return true;
  } catch {
    return false;
  }
}

function renderLogin() {
  setSessionHint(null);
  location.replace('login.html?next=portaal.html');
}

function renderNotMember() {
  app.innerHTML = `<div class="login-wrap slide-up">
    <div class="wobble" style="width:120px;margin:auto">${ART.egg()}</div>
    <h2>Dit portaal is voor weekendgangers</h2>
    <p class="muted">Je bent ingelogd als admin. De weekendgangers en opdrachten beheer je in de keuken.</p>
    <div class="row" style="justify-content:center">
      <a class="btn pan" href="admin.html#members">🍳 Naar de opdrachten</a>
      <button class="btn ghost" id="lo">Inloggen als weekendganger</button>
    </div></div>`;
  $('#lo').onclick = () => signOut(useAuth()).then(() => { setSessionHint(null); location.replace('login.html?next=portaal.html'); });
}

function renderPan() {
  if (!on('missions')) return renderHome();
  const has = !!mission?.text;
  app.innerHTML = `<div class="play-screen">
    <a class="big-avatar pop-in" href="avatar.html" title="Pas je poppetje aan">${av({ member: true }, user.uid)}</a>
    <h1 style="margin:0">Hoi ${esc(member.name)} 👋</h1>
    <p class="muted" style="margin:0">${has ? 'Er ligt iets in je pan…' : 'Je opdracht wordt nog gebakken. Kom later terug!'}</p>
    <div class="flip-stage ${has ? '' : 'waiting'}" id="stage">
      <div class="flip-pan" id="pan">${ART.panEmpty}</div>
      <button class="flip-egg" id="egg" aria-label="Flip het ei" ${has ? '' : 'disabled'}>
        <span class="face front">${ART.egg()}</span>
        <span class="face back">${ART.eggBack}</span>
      </button>
    </div>
    ${has ? '<p class="flip-hint float" id="hint">👆 Tik op het ei om het te flippen!</p>' : ''}
    <div id="mission"></div>
    ${links()}
    <button class="btn ghost small" id="lo">Uitloggen</button>
  </div>`;
  $('#lo').onclick = logout;
  if (has) $('#egg').onclick = flip;
}

// Zonder geheime opdrachten: gewoon je poppetje en de snelkoppelingen van het weekend.
function renderHome() {
  const a = avatarOf(user.uid);
  app.innerHTML = `<div class="play-screen">
    <a class="big-avatar pop-in" href="avatar.html" title="Pas je poppetje aan">${av({ member: true }, user.uid)}</a>
    <h1 style="margin:0">Hoi ${esc(member.name)} 👋</h1>
    <p class="muted" style="margin:0">${a?.cfg || a?.img ? 'Klaar voor het weekend!' : 'Je hebt nog geen poppetje. Bouw er snel een!'}</p>
    ${links()}
    <button class="btn ghost small" id="lo">Uitloggen</button></div>`;
  $('#lo').onclick = logout;
}

const links = () => `<div class="row" style="justify-content:center">
    <a class="btn" href="avatar.html">🎨 Mijn poppetje</a>
    ${on('raadkaart') ? '<a class="btn pan" href="raadkaart.html">🗺️ Raad waar we heen gaan</a>' : ''}
    ${on('playlist') ? '<a class="btn" href="playlist.html">🎵 Weekendplaylist</a>' : ''}</div>`;
const logout = () => signOut(useAuth()).then(() => { setSessionHint(null); location.href = 'index.html'; });

function flip() {
  const egg = $('#egg');
  if (egg.classList.contains('flipping')) return;
  navigator.vibrate?.(40);
  $('#hint')?.remove();
  $('#pan').classList.add('shake-pan');
  egg.classList.add('flipping');
  if (!mission.revealedAt) {
    set(wref(`missions/${user.uid}/revealedAt`), serverTimestamp()).catch(() => {});
    mission.revealedAt = Date.now();
  }
  setTimeout(() => {
    egg.classList.add('burst');
    navigator.vibrate?.([30, 50, 30]);
    showMission();
  }, 1700);
}

function showMission() {
  $('#stage').classList.add('done');
  $('#mission').innerHTML = `<div class="mission-card">
      <div class="mission-yolk">🤫</div>
      <span class="letter-date">Jouw geheime opdracht</span>
      <p class="mission-text">${esc(mission.text).replace(/\n/g, '<br>')}</p>
      <p class="muted" style="margin:0">Vertel het aan niemand… 🤐</p>
    </div>
    <button class="btn pan" id="hide" style="margin-top:18px">🙈 Verberg (iemand kijkt mee!)</button>`;
  confetti(40);
  $('#hide').onclick = renderPan;
}
