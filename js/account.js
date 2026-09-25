// Accountpagina: wie ben ik, snelkoppelingen, wachtwoord wijzigen, uitloggen.
import { $, ART, esc, shell, toast, setSessionHint } from './common.js';
import {
  configured, db, ref, set, useAuth, currentUser, notConfiguredHtml, signOut, updatePassword,
  EmailAuthProvider, reauthenticateWithCredential, whoAmI,
} from './fb.js';

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

  app.innerHTML = `<div class="login-wrap slide-up" style="max-width:480px">
    <div class="wobble" style="width:130px;margin:auto">${ART.egg()}</div>
    <h1 style="margin-bottom:6px">Hoi ${esc(me.name)}!</h1>
    <span class="pill ${admin ? '' : 'yolk'}">${admin ? '👩‍🍳 Admin' : '🤫 Weekendganger'}</span>
    <div class="card stack" style="margin-top:20px;text-align:left">
      <div><span class="muted">${admin ? 'E-mail' : 'Gebruikersnaam'}</span><br><b>${esc(admin ? me.email : me.username)}</b></div>
      <a class="btn big ${admin ? 'pan' : 'bacon'}" style="width:100%" href="${admin ? 'admin.html' : 'portaal.html'}">${admin ? '🍳 Naar de keuken' : '🥚 Mijn geheime opdracht'}</a>
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
      // Zodat de admin de nieuwe login nog kan doorgeven / het account kan opruimen.
      if (!admin) await set(ref(db, `members/${user.uid}/password`), $('#new').value).catch(() => {});
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
