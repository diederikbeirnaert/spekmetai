// Eén loginpagina voor iedereen: weekendgangers (gebruikersnaam) en de admin (e-mail).
import { $, ART, shell, toast, setSessionHint } from './common.js';
import {
  configured, useAuth, currentUser, notConfiguredHtml, signInWithEmailAndPassword, signOut, memberEmail, cleanUsername, whoAmI,
} from './fb.js';

shell('login');
const app = $('#app');
const next = new URLSearchParams(location.search).get('next');
const safeNext = /^[a-z]+\.html(#[\w/-]*)?$/.test(next || '') ? next : null;
// Stuur alleen door naar 'next' als die pagina bij je rol past (anders ontstaat er een lus).
const fits = (me, page) => !page || !(page.startsWith('portaal') && me.role !== 'member') && !(page.startsWith('admin') && me.role !== 'admin');
const home = (me) => (safeNext && fits(me, safeNext) ? safeNext : me.role === 'admin' ? 'admin.html' : 'portaal.html');

init();

async function init() {
  if (!configured) return void (app.innerHTML = notConfiguredHtml());
  useAuth('local');
  const me = await whoAmI(await currentUser());
  if (me) { setSessionHint(me); return void location.replace(home(me)); }
  setSessionHint(null);

  app.innerHTML = `<div class="login-wrap slide-up">
    <div class="wobble" style="width:130px;margin:auto">${ART.egg()}</div>
    <h1>Inloggen</h1>
    <p class="muted">Weekendganger? Gebruik de gebruikersnaam die je van de chef-kok kreeg.</p>
    <form class="card" id="lf" style="text-align:left">
      <div class="field"><label for="un">Gebruikersnaam of e-mail</label>
        <input class="input" id="un" autocomplete="username" autocapitalize="none" spellcheck="false" required></div>
      <div class="field"><label for="pw">Wachtwoord</label>
        <input class="input" id="pw" type="password" autocomplete="current-password" required></div>
      <button class="btn bacon big" style="width:100%">In de pan! 🍳</button>
    </form></div>`;
  $('#un').focus();
  $('#lf').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    const id = $('#un').value.trim();
    try {
      const email = id.includes('@') ? id : memberEmail(cleanUsername(id));
      const { user } = await signInWithEmailAndPassword(useAuth(), email, $('#pw').value);
      const me = await whoAmI(user);
      if (!me) {
        await signOut(useAuth());
        throw new Error('Dit account heeft (nog) geen toegang');
      }
      setSessionHint(me);
      location.replace(home(me));
    } catch (err) {
      btn.disabled = false;
      toast(err.message?.startsWith('Dit') ? err.message : 'Gebruikersnaam of wachtwoord klopt niet', 'bad');
      $('#lf').classList.remove('shake'); void $('#lf').offsetWidth; $('#lf').classList.add('shake');
    }
  });
}
