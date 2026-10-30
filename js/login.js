// Eén loginpagina voor iedereen: weekendgangers en weekendverantwoordelijken (gebruikersnaam), de hoofdadmin (e-mail).
// Weekendgangers hebben een account per weekend, dus ze kiezen eerst hun weekend.
import { $, ART, esc, shell, toast, setSessionHint } from './common.js?v=w1';
import { configured, useAuth, currentUser, notConfiguredHtml, signOut, whoAmI, signInFlexible, restGet, weekendId, setWeekend } from './fb.js?v=w1';

shell('login');
const app = $('#app');
const next = new URLSearchParams(location.search).get('next');
const safeNext = /^[a-z]+\.html(\?[\w=&-]*)?(#[\w/-]*)?$/.test(next || '') ? next : null;
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
  const weekends = Object.entries((await restGet('weekendList').catch(() => null)) || {}).sort((a, b) => a[1].name.localeCompare(b[1].name));
  const cur = weekendId();

  app.innerHTML = `<div class="login-wrap slide-up">
    <div class="wobble" style="width:130px;margin:auto">${ART.egg()}</div>
    <h1>Inloggen</h1>
    <p class="muted">Weekendganger? Kies je weekend en gebruik de gebruikersnaam die je bij het meedoen koos.</p>
    <form class="card" id="lf" style="text-align:left">
      <div class="field"><label for="wk">Weekend</label>
        <select class="input" id="wk"><option value="">— Ik organiseer (weekendverantwoordelijke of hoofdchef)</option>
          ${weekends.map(([id, w]) => `<option value="${esc(id)}" ${id === cur ? 'selected' : ''}>${esc(w.emoji || '🍳')} ${esc(w.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="un">Gebruikersnaam (of e-mail)</label>
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
    try {
      if ($('#wk').value) setWeekend($('#wk').value);
      const user = await signInFlexible($('#un').value.trim(), $('#pw').value);
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
