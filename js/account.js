// Accountpagina: wie ben ik, snelkoppelingen, wachtwoord wijzigen, uitloggen.
import { $, ART, esc, shell, toast, setSessionHint, av, setAvatars } from './common.js?v=w1';
import { cachedMeta, hasFeature } from './weekend.js?v=w1';
import {
  configured, db, wref, ref, set, useAuth, currentUser, notConfiguredHtml, signOut, updatePassword,
  EmailAuthProvider, reauthenticateWithCredential, whoAmI, watchAvatars,
} from './fb.js?v=w1';

shell('account');
const app = $('#app');

init();

async function init() {
  if (!configured) return void (app.innerHTML = notConfiguredHtml());
  useAuth('local');
  const user = await currentUser();
  const me = await whoAmI(user);
  if (!me) { setSessionHint(null); return void location.replace('login.html?next=account.html'); }
  setSessionHint(me);
  const admin = me.role === 'admin';
  const meta = cachedMeta();
  const on = (k) => hasFeature(meta, k);
  if (!admin) watchAvatars(setAvatars);

  app.innerHTML = `<div class="login-wrap slide-up" style="max-width:480px">
    ${admin ? `<div class="wobble" style="width:130px;margin:auto">${ART.egg()}</div>` : `<div class="big-avatar pop-in">${av({ member: true }, user.uid)}</div>`}
    <h1 style="margin-bottom:6px">Hoi ${esc(me.name)}!</h1>
    <span class="pill ${admin ? '' : 'yolk'}">${me.head ? '👑 Hoofdchef' : me.owner ? '👩‍🍳 Weekendverantwoordelijke' : me.mod ? '🛡️ Weekendganger · admin light' : '🤫 Weekendganger'}</span>
    ${meta?.name ? `<p class="muted" style="margin:8px 0 0">${esc(meta.emoji || '🍳')} ${esc(meta.name)}</p>` : ''}
    <div class="card stack" style="margin-top:20px;text-align:left">
      <div><span class="muted">${me.head ? 'E-mail' : 'Gebruikersnaam'}</span><br><b>${esc(me.head ? me.email : me.username)}</b></div>
      <a class="btn big ${admin ? 'pan' : 'bacon'}" style="width:100%" href="${admin ? 'admin.html' : 'portaal.html'}">${admin ? '🍳 Naar de keuken' : on('missions') ? '🥚 Mijn geheime opdracht' : '🏠 Mijn portaal'}</a>
      ${admin ? '' : '<a class="btn big" style="width:100%" href="avatar.html">🎨 Mijn poppetje</a>'}
      ${admin || !on('raadkaart') ? '' : '<a class="btn big pan" style="width:100%" href="raadkaart.html">🗺️ Raad waar we heen gaan</a>'}
      ${admin || !on('playlist') ? '' : '<a class="btn big" style="width:100%" href="playlist.html">🎵 Weekendplaylist</a>'}
      ${me.mod ? '<a class="btn big" style="width:100%" href="admin.html">🛡️ Naar de keuken (admin light)</a>' : ''}
    </div>
    <form class="card" id="pwf" style="margin-top:16px;text-align:left">
      <h3>Wachtwoord wijzigen</h3>
      <div class="field"><input class="input" type="password" id="old" placeholder="Huidig wachtwoord" autocomplete="current-password" required></div>
      <div class="field"><input class="input" type="password" id="new" placeholder="Nieuw wachtwoord (min. 6 tekens)" minlength="6" autocomplete="new-password" required></div>
      <button class="btn" style="width:100%">Wijzigen</button>
    </form>
    <button class="btn ghost" id="lo" style="margin-top:16px">Uitloggen</button>
  </div>`;

  $('#pwf').onsubmit = async (e) => {
    e.preventDefault();
    try {
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, $('#old').value));
      await updatePassword(user, $('#new').value);
      toast('Wachtwoord gewijzigd 🔑', 'ok');
      e.target.reset();
    } catch (err) {
      toast(err.code === 'auth/weak-password' ? 'Nieuw wachtwoord is te zwak' : 'Huidig wachtwoord klopt niet', 'bad');
    }
  };
  $('#lo').onclick = async () => {
    await signOut(useAuth());
    setSessionHint(null);
    location.href = 'index.html';
  };
}
