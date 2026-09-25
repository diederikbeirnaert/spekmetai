// Admin: inloggen, quizzen maken, weekendbrieven schrijven, instellingen.
import { $, $$, ART, esc, shell, toast, uid, parseMediaUrl, mediaHtml, compressImage, md, fmtDate } from './common.js';
import {
  configured, db, ref, get, set, update, remove, push, useAuth, currentUser, isAdmin, notConfiguredHtml,
  signInWithEmailAndPassword, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential,
} from './fb.js';

shell('admin');
const app = $('#app');
const EMAIL_KEY = 'smai.adminEmail';
const TYPES = { mc: 'Meerkeuze', tf: 'Waar / niet waar', open: 'Open antwoord', info: 'Infoslide' };
const TIMES = [5, 10, 15, 20, 30, 45, 60, 90, 120];

let user, dirty = false, quiz = null, letter = null;
const mediaCache = {};

window.addEventListener('beforeunload', (e) => { if (dirty) e.preventDefault(); });
window.addEventListener('hashchange', () => route());

init();

async function init() {
  if (!configured) return void (app.innerHTML = notConfiguredHtml());
  useAuth('local');
  user = await currentUser();
  if (!user || user.isAnonymous) return renderLogin();
  if (!(await isAdmin(user))) return renderNotAdmin();
  route();
}

/* ---------- Login ---------- */
function renderLogin() {
  let email = '';
  try { email = localStorage.getItem(EMAIL_KEY) || ''; } catch {}
  app.innerHTML = `<div class="login-wrap slide-up">
    <div class="wobble">${ART.logo.replace('class="logo-mark"', 'class="logo-big"')}</div>
    <h1>Keuken&shy;deur</h1>
    <form class="card" id="lf" style="text-align:left">
      <div class="field"><label for="em">E-mail</label><input class="input" id="em" type="email" autocomplete="username" value="${esc(email)}" required></div>
      <div class="field"><label for="pw">Wachtwoord</label><input class="input" id="pw" type="password" autocomplete="current-password" required></div>
      <button class="btn bacon big" style="width:100%">Binnen! 🍳</button>
    </form></div>`;
  $(email ? '#pw' : '#em').focus();
  $('#lf').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const cred = await signInWithEmailAndPassword(useAuth(), $('#em').value.trim(), $('#pw').value);
      try { localStorage.setItem(EMAIL_KEY, $('#em').value.trim()); } catch {}
      user = cred.user;
      if (!(await isAdmin(user))) return renderNotAdmin();
      route();
    } catch {
      toast('Verkeerde e-mail of wachtwoord', 'bad');
      $('#lf').classList.remove('shake'); void $('#lf').offsetWidth; $('#lf').classList.add('shake');
    }
  });
}

function renderNotAdmin() {
  app.innerHTML = `<div class="card stack" style="max-width:640px;margin:auto">
    <h2>Bijna! Nog één stapje 🥚</h2>
    <p>Je bent ingelogd, maar dit account is nog geen admin. Ga in de Firebase-console naar <b>Realtime Database → Data</b> en voeg dit toe:</p>
    <div class="notice"><code>admins</code> → <code>${esc(user.uid)}</code> : <code>true</code></div>
    <div class="row"><button class="btn" onclick="location.reload()">Opnieuw proberen</button><button class="btn ghost" id="lo">Uitloggen</button></div></div>`;
  $('#lo').onclick = () => signOut(useAuth()).then(() => location.reload());
}

/* ---------- Routing ---------- */
let currentHash = location.hash;
function route() {
  if (dirty && location.hash !== currentHash && !confirm('Je hebt niet-opgeslagen wijzigingen. Toch verdergaan?')) {
    history.replaceState(null, '', currentHash || location.pathname);
    return;
  }
  currentHash = location.hash;
  dirty = false;
  const [page, id] = location.hash.slice(1).split('/').map(decodeURIComponent);
  if (page === 'quiz') return editQuiz(id);
  if (page === 'letter') return editLetter(id);
  if (page === 'letters') return listLetters();
  if (page === 'settings') return settings();
  listQuizzes();
}

function frame(active, html) {
  app.innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:10px">
      <h1 style="margin:0">Keuken <span class="wobble" style="display:inline-block;width:52px;vertical-align:middle">${ART.egg()}</span></h1>
      <a class="btn small ghost" href="host.html">▶ Host een quiz</a></div>
    <div class="tabs">
      <a class="tab ${active === 'quizzes' ? 'active' : ''}" href="#quizzes">🍳 Quizzen</a>
      <a class="tab ${active === 'letters' ? 'active' : ''}" href="#letters">✉️ Weekendbrief</a>
      <a class="tab ${active === 'settings' ? 'active' : ''}" href="#settings">⚙️ Instellingen</a>
    </div><div id="view">${html}</div>`;
}

/* ---------- Quizlijst ---------- */
async function listQuizzes() {
  frame('quizzes', '<div class="card muted">Laden…</div>');
  const all = (await get(ref(db, 'quizzes'))).val() || {};
  const list = Object.entries(all).sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0));
  $('#view').innerHTML = `
    <div class="row" style="margin-bottom:16px"><button class="btn bacon" id="new">+ Nieuwe quiz</button>
      ${list.length ? '' : '<button class="btn ghost" id="seed">Voorbeeldquiz laden</button>'}</div>
    <div class="list">${list.map(([id, q], i) => `
      <div class="card list-item slide-up" style="animation-delay:${i * 0.05}s">
        <div class="grow"><h3>${esc(q.title || 'Naamloze quiz')}</h3>
          <span class="muted">${(q.questions || []).length} vragen${q.updatedAt ? ` · bijgewerkt ${new Date(q.updatedAt).toLocaleDateString('nl-BE')}` : ''}</span></div>
        <a class="btn small" href="host.html?quiz=${encodeURIComponent(id)}">▶ Host</a>
        <a class="btn small ghost" href="#quiz/${encodeURIComponent(id)}">✏️ Bewerk</a>
        <button class="btn small ghost icon" data-dup="${esc(id)}" title="Dupliceren">⧉</button>
        <button class="btn small ghost icon" data-del="${esc(id)}" title="Verwijderen">🗑</button>
      </div>`).join('') || `<div class="card center"><div class="float" style="width:120px;margin:auto">${ART.egg()}</div><p>Nog geen quizzen. Tijd om te bakken!</p></div>`}
    </div>`;
  $('#new').onclick = () => { location.hash = `quiz/${uid()}`; };
  $('#seed')?.addEventListener('click', loadSeed);
  $$('[data-del]').forEach((b) => b.onclick = async () => {
    if (!confirm(`"${all[b.dataset.del].title}" verwijderen?`)) return;
    await remove(ref(db, `quizzes/${b.dataset.del}`));
    toast('Quiz verwijderd');
    listQuizzes();
  });
  $$('[data-dup]').forEach((b) => b.onclick = async () => {
    const q = structuredClone(all[b.dataset.dup]);
    q.title = `${q.title} (kopie)`;
    q.updatedAt = Date.now();
    await set(ref(db, `quizzes/${uid()}`), q);
    listQuizzes();
  });
}

async function loadSeed() {
  const seed = await (await fetch('data/db.json', { cache: 'no-store' })).json();
  await update(ref(db), Object.fromEntries(Object.entries(seed.quizzes || {}).map(([k, v]) => [`quizzes/${k}`, { ...v, updatedAt: Date.now() }])));
  toast('Voorbeeldquiz geladen 🍳', 'ok');
  listQuizzes();
}

/* ---------- Quiz-editor ---------- */
const blankQuestion = (type = 'mc') => ({
  id: uid(), type, text: '', media: null, time: 20, points: 'normal',
  options: type === 'tf' ? [{ text: 'Waar', correct: true }, { text: 'Niet waar', correct: false }]
    : type === 'mc' ? [0, 1, 2, 3].map((i) => ({ text: '', correct: i === 0 })) : [],
  answers: [],
});

async function editQuiz(id) {
  frame('quizzes', '<div class="card muted">Laden…</div>');
  const existing = (await get(ref(db, `quizzes/${id}`))).val();
  quiz = existing || { title: '', description: '', questions: [blankQuestion('mc')] };
  quiz.id = id;
  quiz.questions = (quiz.questions || []).filter(Boolean).map((q) => ({ options: [], answers: [], ...q }));
  if (!existing) dirty = true;
  renderQuiz();
}

function markDirty() {
  dirty = true;
  const s = $('#savestate');
  if (s) s.textContent = '● Niet opgeslagen';
}

function renderQuiz() {
  $('#view').innerHTML = `
    <a href="#quizzes" class="btn ghost small">← Alle quizzen</a>
    <div class="card stack" style="margin-top:14px">
      <div class="field"><label>Titel</label><input class="input" data-quiz="title" value="${esc(quiz.title)}" placeholder="Het Grote Ontbijtquiz" style="font-size:1.3rem;font-weight:800"></div>
      <div class="field" style="margin:0"><label>Beschrijving (optioneel)</label><input class="input" data-quiz="description" value="${esc(quiz.description || '')}"></div>
    </div>
    <div class="stack" id="qs" style="margin-top:16px">${quiz.questions.map(questionCard).join('')}</div>
    <div class="card" style="margin-top:16px"><b>Vraag toevoegen:</b>
      <div class="row" style="margin-top:10px">${Object.entries(TYPES).map(([t, l]) => `<button class="btn small ${t === 'mc' ? '' : 'ghost'}" data-add="${t}">+ ${l}</button>`).join('')}</div></div>
    <div class="savebar"><span class="status" id="savestate">${dirty ? '● Niet opgeslagen' : '✔ Opgeslagen'}</span>
      <button class="btn small ghost" id="hostq">▶ Host</button><button class="btn ok" id="save">Opslaan</button></div>`;
  loadPreviews();

  const view = $('#view');
  view.oninput = (e) => {
    const t = e.target;
    if (t.dataset.quiz) { quiz[t.dataset.quiz] = t.value; return markDirty(); }
    const q = quiz.questions[t.closest('[data-q]')?.dataset.q];
    if (!q) return;
    const f = t.dataset.f;
    if (f === 'text') q.text = t.value;
    else if (f === 'opt') q.options[+t.dataset.o].text = t.value;
    else if (f === 'answers') q.answers = t.value.split('\n').map((s) => s.trim()).filter(Boolean);
    else if (f === 'mediaUrl') { q.media = parseMediaUrl(t.value); showPreview(t.closest('[data-q]'), q); }
    markDirty();
  };
  view.onchange = (e) => {
    const t = e.target;
    const card = t.closest('[data-q]');
    const q = quiz.questions[card?.dataset.q];
    if (!q) return;
    const f = t.dataset.f;
    if (f === 'type') {
      const fresh = blankQuestion(t.value);
      Object.assign(q, { type: t.value, options: t.value === 'info' || t.value === 'open' ? [] : q.type === 'mc' && t.value === 'mc' ? q.options : fresh.options });
      rerenderCard(card);
    } else if (f === 'time') q.time = +t.value;
    else if (f === 'points') q.points = t.value;
    else if (f === 'correct') {
      if (q.type === 'tf') q.options.forEach((o, i) => { o.correct = i === +t.dataset.o; });
      else q.options[+t.dataset.o].correct = t.checked;
    } else if (f === 'upload' && t.files[0]) return upload(t.files[0], q, card);
    markDirty();
  };
  view.onclick = (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.id === 'save') return saveQuiz();
    if (b.id === 'hostq') return saveQuiz().then((ok) => { if (ok) location.href = `host.html?quiz=${encodeURIComponent(quiz.id)}`; });
    if (b.dataset.add) {
      quiz.questions.push(blankQuestion(b.dataset.add));
      markDirty();
      $('#qs').insertAdjacentHTML('beforeend', questionCard(quiz.questions.at(-1), quiz.questions.length - 1));
      $('#qs').lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const card = b.closest('[data-q]');
    if (!card) return;
    const i = +card.dataset.q;
    const q = quiz.questions[i];
    const act = b.dataset.act;
    if (act === 'up' && i > 0) [quiz.questions[i - 1], quiz.questions[i]] = [q, quiz.questions[i - 1]];
    else if (act === 'down' && i < quiz.questions.length - 1) [quiz.questions[i + 1], quiz.questions[i]] = [q, quiz.questions[i + 1]];
    else if (act === 'dup') quiz.questions.splice(i + 1, 0, { ...structuredClone(q), id: uid() });
    else if (act === 'del') { if (!confirm('Deze vraag verwijderen?')) return; quiz.questions.splice(i, 1); }
    else if (act === 'addopt' && q.options.length < 4) { q.options.push({ text: '', correct: false }); return markDirty(), rerenderCard(card); }
    else if (act === 'delopt') { q.options.splice(+b.dataset.o, 1); return markDirty(), rerenderCard(card); }
    else if (act === 'clearmedia') { q.media = null; return markDirty(), rerenderCard(card); }
    else if (act === 'pick') return card.querySelector('input[type=file]').click();
    else return;
    markDirty();
    renderQuestions();
  };
}

function renderQuestions() {
  $('#qs').innerHTML = quiz.questions.map(questionCard).join('');
  loadPreviews();
}

function rerenderCard(card) {
  const i = +card.dataset.q;
  card.outerHTML = questionCard(quiz.questions[i], i);
  loadPreviews();
}

function questionCard(q, i) {
  const mediaVal = q.media ? (q.media.src?.startsWith('db:') ? '' : q.media.kind === 'youtube'
    ? `https://youtu.be/${q.media.src}${q.media.start ? `?t=${q.media.start}` : ''}`
    : q.media.kind === 'drive' ? `https://drive.google.com/file/d/${q.media.src}/view` : q.media.src) : '';
  const opts = q.type === 'mc' || q.type === 'tf';
  return `<div class="card q-card type-${q.type}" data-q="${i}">
    <div class="q-head">
      <span class="q-num">${i + 1}</span>
      <select class="input" data-f="type" style="width:auto">${Object.entries(TYPES).map(([t, l]) => `<option value="${t}" ${t === q.type ? 'selected' : ''}>${l}</option>`).join('')}</select>
      ${q.type === 'info' ? '' : `
      <select class="input" data-f="time" style="width:auto" title="Tijd">${TIMES.map((t) => `<option value="${t}" ${t === (q.time || 20) ? 'selected' : ''}>⏱ ${t}s</option>`).join('')}</select>
      <select class="input" data-f="points" style="width:auto" title="Punten">
        <option value="normal" ${q.points === 'normal' ? 'selected' : ''}>🥓 Normaal</option>
        <option value="double" ${q.points === 'double' ? 'selected' : ''}>🥓🥓 Dubbel</option>
        <option value="none" ${q.points === 'none' ? 'selected' : ''}>Geen punten</option></select>`}
      <span class="spacer"></span>
      <button class="btn small ghost icon" data-act="up" title="Omhoog">↑</button>
      <button class="btn small ghost icon" data-act="down" title="Omlaag">↓</button>
      <button class="btn small ghost icon" data-act="dup" title="Dupliceren">⧉</button>
      <button class="btn small ghost icon" data-act="del" title="Verwijderen">🗑</button>
    </div>
    <div class="field"><label>${q.type === 'info' ? 'Tekst / zin' : 'Vraag'}</label>
      <textarea class="input" data-f="text" rows="2" placeholder="${q.type === 'info' ? 'Een leuke zin of uitleg…' : 'Wat is het lekkerste ontbijt?'}">${esc(q.text)}</textarea></div>
    <div class="field"><label>Media (afbeelding-URL, YouTube- of Google Drive-link)</label>
      <div class="row">
        <input class="input grow" data-f="mediaUrl" value="${esc(mediaVal)}" placeholder="${q.media?.src?.startsWith('db:') ? '📷 Geüploade afbeelding' : 'https://…'}">
        <button class="btn small ghost" data-act="pick">📷 Upload</button>
        ${q.media ? '<button class="btn small ghost icon" data-act="clearmedia" title="Media weg">✕</button>' : ''}
        <input type="file" accept="image/*" data-f="upload" hidden>
      </div>
      <div class="media-preview" data-preview></div></div>
    ${opts ? `<div class="field"><label>Antwoorden <span class="muted">(vink de juiste aan)</span></label>
      ${q.options.map((o, oi) => `<div class="opt-row">
        <span class="swatch" style="background:var(--a${oi})">${ART.answer[oi]}</span>
        <input class="input" data-f="opt" data-o="${oi}" value="${esc(o.text)}" ${q.type === 'tf' ? 'readonly' : ''} placeholder="Antwoord ${oi + 1}">
        <label class="correct"><input type="${q.type === 'tf' ? 'radio' : 'checkbox'}" name="c${q.id}" data-f="correct" data-o="${oi}" ${o.correct ? 'checked' : ''}> juist</label>
        ${q.type === 'mc' && q.options.length > 2 ? `<button class="btn small ghost icon" data-act="delopt" data-o="${oi}" title="Weg">✕</button>` : ''}
      </div>`).join('')}
      ${q.type === 'mc' && q.options.length < 4 ? '<button class="btn small ghost" data-act="addopt">+ Antwoord</button>' : ''}</div>` : ''}
    ${q.type === 'open' ? `<div class="field"><label>Goedgekeurde antwoorden <span class="muted">(één per lijn; hoofdletters en accenten tellen niet)</span></label>
      <textarea class="input" data-f="answers" rows="3" placeholder="spek met ei&#10;spek en eieren">${esc((q.answers || []).join('\n'))}</textarea></div>` : ''}
  </div>`;
}

async function resolveMedia(m) {
  if (!m?.src?.startsWith('db:')) return m?.src;
  const id = m.src.slice(3);
  mediaCache[id] ??= (await get(ref(db, `media/${id}/data`))).val();
  return mediaCache[id];
}

function showPreview(card, q) {
  const el = card.querySelector('[data-preview]');
  if (!q.media) return void (el.innerHTML = '');
  resolveMedia(q.media).then((src) => { el.innerHTML = mediaHtml(q.media, { resolved: src }); });
}

function loadPreviews() {
  $$('[data-q]').forEach((card) => { const q = quiz.questions[card.dataset.q]; if (q) showPreview(card, q); });
}

async function upload(file, q, card) {
  toast('Afbeelding aan het bakken…');
  try {
    const data = await compressImage(file);
    if (data.length > 3e6) return toast('Afbeelding is te groot', 'bad');
    const r = push(ref(db, 'media'));
    await set(r, { data, name: file.name.slice(0, 80), at: Date.now() });
    mediaCache[r.key] = data;
    q.media = { kind: 'image', src: `db:${r.key}` };
    markDirty();
    rerenderCard(card);
    toast('Afbeelding toegevoegd 📷', 'ok');
  } catch (e) {
    toast(`Upload mislukt: ${e.message}`, 'bad');
  }
}

function validate() {
  if (!quiz.title.trim()) return 'Geef de quiz een titel';
  for (const [i, q] of quiz.questions.entries()) {
    const n = `Vraag ${i + 1}`;
    if (q.type !== 'info' && !q.text.trim()) return `${n}: vul de vraag in`;
    if (q.type === 'mc') {
      if (q.options.some((o) => !o.text.trim())) return `${n}: vul alle antwoorden in (of verwijder er een)`;
      if (!q.options.some((o) => o.correct)) return `${n}: duid minstens één juist antwoord aan`;
    }
    if (q.type === 'open' && !(q.answers || []).length) return `${n}: geef minstens één goedgekeurd antwoord`;
  }
  return null;
}

async function saveQuiz() {
  const err = validate();
  if (err) { toast(err, 'bad'); return false; }
  const { id, ...data } = quiz;
  data.updatedAt = Date.now();
  data.questions = data.questions.map((q) => ({
    id: q.id, type: q.type, text: q.text.trim(), media: q.media || null, time: q.time || 20, points: q.points || 'normal',
    options: q.type === 'mc' || q.type === 'tf' ? q.options.map((o) => ({ text: o.text.trim(), correct: !!o.correct })) : null,
    answers: q.type === 'open' ? q.answers : null,
  }));
  try {
    await set(ref(db, `quizzes/${id}`), data);
    dirty = false;
    $('#savestate').textContent = '✔ Opgeslagen';
    toast('Quiz opgeslagen 🍳', 'ok');
    return true;
  } catch (e) {
    toast(`Opslaan mislukt: ${e.message}`, 'bad');
    return false;
  }
}

/* ---------- Weekendbrief ---------- */
async function listLetters() {
  frame('letters', '<div class="card muted">Laden…</div>');
  const all = (await get(ref(db, 'letters'))).val() || {};
  const list = Object.entries(all).sort((a, b) => String(b[1].date).localeCompare(String(a[1].date)));
  $('#view').innerHTML = `
    <div class="row" style="margin-bottom:16px"><button class="btn bacon" id="new">+ Nieuwe brief</button></div>
    <div class="list">${list.map(([id, l]) => `
      <div class="card list-item"><div class="grow"><span class="letter-date">${esc(fmtDate(l.date))}</span>
        <h3 style="margin-top:6px">${esc(l.title)} ${l.published === false ? '<span class="pill" style="font-size:.7rem">concept</span>' : ''}</h3></div>
        <a class="btn small ghost" href="#letter/${encodeURIComponent(id)}">✏️ Bewerk</a></div>`).join('') ||
      '<div class="card muted">Nog geen weekendbrieven.</div>'}</div>`;
  $('#new').onclick = () => { location.hash = `letter/${uid()}`; };
}

async function editLetter(id) {
  frame('letters', '<div class="card muted">Laden…</div>');
  const existing = (await get(ref(db, `letters/${id}`))).val();
  letter = existing || { title: '', date: new Date().toISOString().slice(0, 10), body: '', published: true };
  $('#view').innerHTML = `
    <a href="#letters" class="btn ghost small">← Alle brieven</a>
    <div class="card stack" style="margin-top:14px">
      <div class="row"><div class="field grow"><label>Titel</label><input class="input" id="lt" value="${esc(letter.title)}"></div>
        <div class="field"><label>Datum</label><input class="input" type="date" id="ld" value="${esc(letter.date)}"></div></div>
      <div class="field"><label>Tekst <span class="muted"># titel, **vet**, *schuin*, - lijstje, [link](https://…), ![foto](https://…)</span></label>
        <textarea class="input" id="lb" rows="14">${esc(letter.body)}</textarea></div>
      <label class="row" style="gap:8px;font-weight:800"><input type="checkbox" id="lp" ${letter.published !== false ? 'checked' : ''}> Gepubliceerd</label>
    </div>
    <h3 style="margin-top:20px">Voorbeeld</h3>
    <div class="card paper prose" id="lprev"></div>
    <div class="savebar"><span class="status" id="savestate">${existing ? '✔ Opgeslagen' : '● Nieuw'}</span>
      ${existing ? '<button class="btn small ghost" id="ldel">🗑 Verwijderen</button>' : ''}
      <button class="btn ok" id="lsave">Opslaan</button></div>`;
  const preview = () => { $('#lprev').innerHTML = `<h1>${esc($('#lt').value)}</h1>${md($('#lb').value)}`; };
  preview();
  $('#view').oninput = () => { preview(); markDirty(); };
  $('#lsave').onclick = async () => {
    const data = { title: $('#lt').value.trim(), date: $('#ld').value, body: $('#lb').value, published: $('#lp').checked, updatedAt: Date.now() };
    if (!data.title) return toast('Geef de brief een titel', 'bad');
    await set(ref(db, `letters/${id}`), data);
    dirty = false;
    $('#savestate').textContent = '✔ Opgeslagen';
    toast('Weekendbrief opgeslagen ✉️', 'ok');
  };
  $('#ldel')?.addEventListener('click', async () => {
    if (!confirm('Deze brief verwijderen?')) return;
    await remove(ref(db, `letters/${id}`));
    dirty = false;
    location.hash = 'letters';
  });
}

/* ---------- Instellingen ---------- */
function settings() {
  frame('settings', `<div class="stack">
    <div class="card"><h3>Wachtwoord wijzigen</h3>
      <form id="pwf" class="row"><input class="input grow" type="password" id="old" placeholder="Huidig wachtwoord" autocomplete="current-password" required>
        <input class="input grow" type="password" id="new" placeholder="Nieuw (min. 6 tekens)" minlength="6" autocomplete="new-password" required>
        <button class="btn">Wijzigen</button></form></div>
    <div class="card"><h3>Back-up (JSON)</h3>
      <p class="muted">Alle quizzen, afbeeldingen en weekendbrieven in één <code>db.json</code>-bestand.</p>
      <div class="row"><button class="btn" id="exp">⬇ Exporteren</button>
        <button class="btn ghost" id="imp">⬆ Importeren</button><input type="file" id="impf" accept="application/json,.json" hidden></div></div>
    <div class="card"><h3>Opruimen</h3><p class="muted">Oude spellen (ouder dan een dag) worden automatisch gewist. Dit wist <b>alle</b> spellen.</p>
      <button class="btn ghost" id="clr">🧹 Alle spellen wissen</button></div>
    <div class="card"><h3>Account</h3><p class="muted">Ingelogd als ${esc(user.email)}</p><button class="btn pan" id="lo">Uitloggen</button></div>
  </div>`);
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
  $('#exp').onclick = async () => {
    const [quizzes, letters, media] = await Promise.all(['quizzes', 'letters', 'media'].map(async (k) => (await get(ref(db, k))).val() || {}));
    const blob = new Blob([JSON.stringify({ quizzes, letters, media }, null, 2)], { type: 'application/json' });
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'db.json' });
    a.click();
    URL.revokeObjectURL(a.href);
  };
  $('#imp').onclick = () => $('#impf').click();
  $('#impf').onchange = async (e) => {
    try {
      const data = JSON.parse(await e.target.files[0].text());
      const upd = {};
      for (const k of ['quizzes', 'letters', 'media']) for (const [id, v] of Object.entries(data[k] || {})) upd[`${k}/${id}`] = v;
      if (!confirm(`${Object.keys(upd).length} items importeren? Items met hetzelfde id worden overschreven.`)) return;
      await update(ref(db), upd);
      toast('Geïmporteerd ✔', 'ok');
    } catch (err) {
      toast(`Import mislukt: ${err.message}`, 'bad');
    }
    e.target.value = '';
  };
  $('#clr').onclick = async () => {
    if (!confirm('Alle lopende en oude spellen wissen?')) return;
    await remove(ref(db, 'games'));
    toast('Pan is weer proper 🧹', 'ok');
  };
  $('#lo').onclick = () => signOut(useAuth()).then(() => location.reload());
}
