// Mijn poppetje: je eigen avatar en signature move aanpassen.
// Een admin van het weekend kan met ?uid= ook het poppetje van iemand anders aanpassen.
import { $, esc, shell, toast, confetti, setSessionHint } from './common.js?v=w1';
import { configured, notConfiguredHtml, noWeekendHtml, useAuth, currentUser, whoAmI, wref, get, set, weekendId, isAdmin } from './fb.js?v=w1';
import { mountBuilder } from './avatarbuilder.js?v=w1';

shell('portaal');
const app = $('#app');

init();

async function init() {
  if (!configured) return void (app.innerHTML = notConfiguredHtml());
  useAuth('local');
  const user = await currentUser();
  const me = await whoAmI(user);
  if (!me) return void location.replace('login.html?next=avatar.html');
  if (!weekendId()) return void (app.innerHTML = noWeekendHtml());
  setSessionHint(me);
  const other = new URLSearchParams(location.search).get('uid');
  const uid = other && (await isAdmin(user)) ? other : user.uid;
  const cur = (await get(wref(`avatars/${uid}`))).val();
  // De namenlijst is alleen leesbaar voor admins; je eigen naam ken je al.
  const name = uid === user.uid ? me.name : (await get(wref(`roster/${uid}`))).val()?.name || '';
  if (me.role !== 'member' && uid === user.uid) {
    return void (app.innerHTML = '<div class="card center login-wrap"><h2>Alleen weekendgangers hebben een poppetje</h2><a class="btn" href="admin.html#members">Naar de weekendgangers</a></div>');
  }
  app.innerHTML = `<h1 class="center" style="margin-bottom:4px">${uid === user.uid ? 'Mijn poppetje' : `Poppetje van ${esc(name)}`} 🎨</h1>
    ${cur?.img && !cur.cfg ? '<p class="center muted" style="margin-top:0">Je hebt nu een getekende avatar. Bewaar je hier een nieuw poppetje, dan vervangt dat de tekening.</p>' : ''}
    <div id="ab"></div>`;
  mountBuilder($('#ab'), {
    initial: cur?.cfg ? cur : { bg: cur?.bg },
    onSave: async (a, btn) => {
      btn.disabled = true;
      try {
        await set(wref(`avatars/${uid}`), { ...a, name });
        confetti(30);
        toast('Poppetje bewaard 🎨', 'ok');
      } catch (err) { toast(`Opslaan mislukt: ${err.message}`, 'bad'); }
      btn.disabled = false;
    },
  });
}
