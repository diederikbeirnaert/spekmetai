// Meedoen via de uitnodigingslink: account maken in het weekend en meteen je eigen poppetje bouwen.
// Link: doemee.html?w=weekend&c=uitnodigingscode (of korter: spekmetai.tech/weekend?doemee=code)
import { $, ART, esc, shell, toast, confetti, setSessionHint } from './common.js?v=w1';
import { cacheMeta } from './weekend.js?v=w1';
import {
  configured, notConfiguredHtml, useAuth, currentUser, joinWeekend, whoAmI, cleanUsername, wref, set, loadMeta, weekendId, setWeekend,
} from './fb.js?v=w1';
import { mountBuilder } from './avatarbuilder.js?v=w1';

const params = new URLSearchParams(location.search);
const invite = (params.get('c') || '').trim();
shell('portaal');
const app = $('#app');

init();

async function init() {
  if (!configured) return void (app.innerHTML = notConfiguredHtml());
  const w = weekendId();
  if (!w || !invite) return void (app.innerHTML = `<div class="card center login-wrap"><h2>Deze uitnodiging is onvolledig 🥚</h2>
    <p class="muted">Vraag de weekendverantwoordelijke om de link nog eens te sturen.</p></div>`);
  useAuth('local');
  const meta = await loadMeta(w);
  if (!meta) return void (app.innerHTML = '<div class="card center login-wrap"><h2>Dit weekend bestaat niet (meer) 🍳</h2></div>');
  cacheMeta(w, meta);
  // Al ingelogd als weekendganger van dit weekend? Dan meteen naar je poppetje.
  const me = await whoAmI(await currentUser());
  if (me?.role === 'member' && me.w === w) { setSessionHint(me); return void location.replace('avatar.html'); }
  setWeekend(w);
  renderForm(meta);
}

function renderForm(meta) {
  app.innerHTML = `<div class="login-wrap slide-up" style="max-width:480px">
    <div class="big-emoji pop-in">${esc(meta.emoji || '🍳')}</div>
    <h1 style="margin:0">${esc(meta.name)}</h1>
    <p class="muted">Je bent uitgenodigd! Maak je account en bouw daarna je eigen poppetje.</p>
    <form class="card" id="jf" style="text-align:left">
      <div class="field"><label for="jn">Jouw naam</label><input class="input" id="jn" maxlength="30" autocomplete="given-name" required></div>
      <div class="field"><label for="ju">Gebruikersnaam (om in te loggen)</label>
        <input class="input" id="ju" maxlength="20" autocapitalize="none" spellcheck="false" autocomplete="username" required></div>
      <div class="field"><label for="jp">Kies een wachtwoord (min. 6 tekens)</label>
        <input class="input" id="jp" type="password" minlength="6" autocomplete="new-password" required></div>
      <button class="btn bacon big" style="width:100%">Ik doe mee! 🍳</button>
      <p class="muted" style="margin:10px 0 0;font-size:.85rem">Al een account voor dit weekend? <a href="login.html">Log in</a></p>
    </form></div>`;
  let edited = false;
  $('#ju').oninput = () => { edited = true; };
  $('#jn').oninput = () => { if (!edited) $('#ju').value = cleanUsername($('#jn').value); };
  $('#jn').focus();
  $('#jf').onsubmit = async (e) => {
    e.preventDefault();
    const name = $('#jn').value.trim();
    const username = cleanUsername($('#ju').value);
    if (!username) return toast('Kies een gebruikersnaam (letters en cijfers)', 'bad');
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    try {
      const user = await joinWeekend(weekendId(), invite, { name, username, password: $('#jp').value });
      setSessionHint({ role: 'member', name, username, w: weekendId() });
      renderBuilder(user, name);
    } catch (err) {
      btn.disabled = false;
      toast({
        'auth/email-already-in-use': 'Die gebruikersnaam is al bezet in dit weekend',
        'auth/weak-password': 'Wachtwoord moet minstens 6 tekens hebben',
        'smai/invite': 'Deze uitnodiging is niet (meer) geldig. Vraag een nieuwe link.',
      }[err.code] || `Mislukt: ${err.message}`, 'bad');
    }
  };
}

function renderBuilder(user, name) {
  app.innerHTML = `<h1 class="center" style="margin-bottom:4px">Hoi ${esc(name)}! Bouw je poppetje 🎨</h1>
    <p class="center muted" style="margin-top:0">Zo sta je op het scorebord, in de quiz en in Hitster.</p><div id="ab"></div>`;
  mountBuilder($('#ab'), {
    saveLabel: 'Klaar! In de pan 🍳',
    onSave: async (a, btn) => {
      btn.disabled = true;
      try {
        await set(wref(`avatars/${user.uid}`), { ...a, name });
        confetti(50);
        app.innerHTML = `<div class="play-screen"><div class="wobble" style="width:130px">${ART.egg()}</div>
          <h1>Je zit erin! 🎉</h1><p class="muted">Welkom in het weekend.</p><a class="btn bacon big" href="portaal.html">Naar mijn portaal</a></div>`;
      } catch (err) { btn.disabled = false; toast(`Opslaan mislukt: ${err.message}`, 'bad'); }
    },
  });
}
