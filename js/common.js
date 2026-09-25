// Gedeelde stukjes: SVG-illustraties, header/footer, helpers.

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const normalize = (s) =>
  String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

export const AVATARS = ['🍳', '🥓', '🥚', '🧇', '🥞', '🥐', '🍅', '🍄', '🧀', '🥑', '🌭', '🍞', '☕', '🧃', '🐷', '🐔', '🤖', '👾', '🦄', '🐸'];

/* ---------- SVG-illustraties ---------- */
const INK = '#3A2618';

export const ART = {
  logo: `<svg class="logo-mark" viewBox="0 0 120 120" aria-hidden="true">
    <g transform="rotate(-22 60 60)">
      <path d="M4 76q10-9 20 0t20 0t20 0t20 0t20 0t20 0v16q-10-9-20 0t-20 0t-20 0t-20 0t-20 0t-20 0z" fill="#C8553D" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M6 82q9-8 18 0t20 0t20 0t20 0t20 0t18 0" stroke="#F6D5C3" stroke-width="3.5" fill="none"/>
    </g>
    <path d="M60 12c14 0 21 8 31 11s19 12 18 27-7 19-10 28-10 21-27 23-27-4-36-11S9 72 11 57s10-23 18-31 17-14 31-14z" fill="#fff" stroke="${INK}" stroke-width="3"/>
    <g stroke="#FB8500" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M60 37V25"/><path d="M81 58h11l5-6"/><path d="M42 70l-9 8h-8"/>
    </g>
    <g fill="#FB8500"><circle cx="60" cy="22" r="3.6"/><circle cx="99" cy="50" r="3.6"/><circle cx="22" cy="78" r="3.6"/></g>
    <circle cx="60" cy="58" r="21" fill="#FFB703" stroke="${INK}" stroke-width="3"/>
    <ellipse cx="51" cy="48" rx="6.5" ry="3.5" fill="#fff" opacity=".8" transform="rotate(-35 51 48)"/>
    <text x="60" y="66.5" text-anchor="middle" font-family="Fredoka, Nunito, sans-serif" font-weight="700" font-size="21" fill="${INK}">AI</text>
    <path class="sparkle" d="M99 10l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="#FFB703" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
  </svg>`,

  egg: (face = true) => `<svg viewBox="0 0 120 100" aria-hidden="true">
    <path d="M60 6c18 0 25 9 37 13s21 15 19 31-11 21-19 29-22 15-40 13S22 90 13 79 1 53 8 38s24-18 32-25S46 6 60 6z" fill="#fff" stroke="${INK}" stroke-width="3"/>
    <circle cx="60" cy="52" r="22" fill="#FFB703" stroke="${INK}" stroke-width="3"/>
    <ellipse cx="51" cy="42" rx="7" ry="4" fill="#fff" opacity=".8" transform="rotate(-35 51 42)"/>
    ${face ? `<g class="yolk-blink"><circle cx="52" cy="53" r="2.8" fill="${INK}"/><circle cx="68" cy="53" r="2.8" fill="${INK}"/></g>
    <path d="M54 60q6 5 12 0" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <circle cx="47" cy="59" r="3" fill="#FB8500" opacity=".5"/><circle cx="73" cy="59" r="3" fill="#FB8500" opacity=".5"/>` : ''}
  </svg>`,

  bacon: (face = false) => `<svg viewBox="0 0 170 60" aria-hidden="true">
    <path d="M6 18q15-12 30 0t30 0t30 0t30 0t30 0l2 28q-15-12-30 0t-30 0t-30 0t-30 0t-30 0z" fill="#C8553D" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M7 27q15-12 30 0t30 0t30 0t30 0t30 0" stroke="#F6D5C3" stroke-width="5" fill="none"/>
    <path d="M7 37q15-12 30 0t30 0t30 0t30 0t30 0" stroke="#8C2F1B" stroke-width="3" fill="none" opacity=".6"/>
    ${face ? `<circle cx="72" cy="30" r="2.6" fill="${INK}"/><circle cx="92" cy="30" r="2.6" fill="${INK}"/><path d="M77 36q5 4 10 0" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>` : ''}
  </svg>`,

  toast: `<svg viewBox="0 0 100 100" aria-hidden="true">
    <path d="M20 40c-14-4-14-30 8-32h44c22 2 22 28 8 32v48c0 4-3 6-6 6H26c-3 0-6-2-6-6z" fill="#D9A066" stroke="${INK}" stroke-width="3"/>
    <path d="M28 44c-9-3-9-20 5-22h34c14 2 14 19 5 22v40H28z" fill="#F7DDB0"/>
    <circle cx="42" cy="58" r="2.5" fill="${INK}"/><circle cx="58" cy="58" r="2.5" fill="${INK}"/>
    <path d="M45 66q5 4 10 0" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
  </svg>`,

  pan: `<svg viewBox="0 0 400 400" aria-hidden="true">
    <g class="steam" stroke="#C9B79C" stroke-width="7" fill="none" stroke-linecap="round">
      <path d="M150 70q-14-18 0-36t0-36"/><path d="M200 60q-14-18 0-36t0-36"/><path d="M250 70q-14-18 0-36t0-36"/>
    </g>
    <rect x="300" y="228" width="100" height="26" rx="13" transform="rotate(-28 300 240)" fill="${INK}"/>
    <circle cx="190" cy="235" r="150" fill="#2B2D42"/>
    <circle cx="190" cy="235" r="128" fill="#3D405B"/>
    <circle cx="190" cy="235" r="128" fill="none" stroke="#4C5070" stroke-width="6" stroke-dasharray="4 18"/>
    <g class="sizzle" style="transform-origin:130px 300px"><g transform="translate(70 270) rotate(-12) scale(.85)">${''}
      <path d="M6 18q15-12 30 0t30 0t30 0t30 0l2 28q-15-12-30 0t-30 0t-30 0t-30 0z" fill="#C8553D" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M7 27q15-12 30 0t30 0t30 0t30 0" stroke="#F6D5C3" stroke-width="6" fill="none"/></g></g>
    <g class="sizzle" style="transform-origin:250px 320px;animation-delay:.25s"><g transform="translate(180 300) rotate(8) scale(.85)">
      <path d="M6 18q15-12 30 0t30 0t30 0t30 0l2 28q-15-12-30 0t-30 0t-30 0t-30 0z" fill="#C8553D" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M7 27q15-12 30 0t30 0t30 0t30 0" stroke="#F6D5C3" stroke-width="6" fill="none"/></g></g>
    <g class="wobble" style="transform-origin:190px 200px"><g transform="translate(95 125) scale(1.6)">
      <path d="M60 6c18 0 25 9 37 13s21 15 19 31-11 21-19 29-22 15-40 13S22 90 13 79 1 53 8 38s24-18 32-25S46 6 60 6z" fill="#fff" stroke="${INK}" stroke-width="2.5"/>
      <circle cx="60" cy="52" r="22" fill="#FFB703" stroke="${INK}" stroke-width="2.5"/>
      <ellipse cx="51" cy="42" rx="7" ry="4" fill="#fff" opacity=".8" transform="rotate(-35 51 42)"/>
      <g class="yolk-blink"><circle cx="52" cy="53" r="2.8" fill="${INK}"/><circle cx="68" cy="53" r="2.8" fill="${INK}"/></g>
      <path d="M54 60q6 5 12 0" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      <circle cx="47" cy="59" r="3" fill="#FB8500" opacity=".5"/><circle cx="73" cy="59" r="3" fill="#FB8500" opacity=".5"/>
    </g></g>
    <path class="sparkle" d="M330 90l7 18 18 7-18 7-7 18-7-18-18-7 18-7z" fill="#FFB703" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path class="sparkle" style="animation-delay:.7s" d="M60 110l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" fill="#FFB703" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>
  </svg>`,

  // Antwoordiconen (wit op gekleurde tegel)
  answer: [
    `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M4 18q5-5 10 0t10 0t10 0t10 0v12q-5-5-10 0t-10 0t-10 0t-10 0z" fill="#fff"/></svg>`,
    `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="20" cy="26" r="15" fill="#fff"/><rect x="31" y="9" width="14" height="6" rx="3" transform="rotate(-35 31 12)" fill="#fff"/></svg>`,
    `<svg viewBox="0 0 48 48" aria-hidden="true"><path fill-rule="evenodd" fill="#fff" d="M24 4c8 0 11 4 16 6s8 7 7 13-5 9-8 13-9 8-17 7S9 40 6 35 2 23 5 17s10-8 13-10S18 4 24 4zm0 12a8 8 0 1 0 0 16a8 8 0 1 0 0-16z"/></svg>`,
    `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M10 20c-7-2-7-15 4-16h20c11 1 11 14 4 16v22c0 2-1 3-3 3H13c-2 0-3-1-3-3z" fill="#fff"/></svg>`,
  ],

  check: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22" fill="#fff"/><path d="M13 25l7 7 15-16" stroke="#2E9E5B" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  happyEgg: `<svg class="result-badge pop-in" viewBox="0 0 120 100" aria-hidden="true">
    <path d="M60 6c18 0 25 9 37 13s21 15 19 31-11 21-19 29-22 15-40 13S22 90 13 79 1 53 8 38s24-18 32-25S46 6 60 6z" fill="#fff" stroke="${INK}" stroke-width="3"/>
    <circle cx="60" cy="52" r="24" fill="#FFB703" stroke="${INK}" stroke-width="3"/>
    <path d="M49 50q3-5 6 0M65 50q3-5 6 0" stroke="${INK}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M50 58q10 11 20 0z" fill="${INK}"/>
    <circle cx="45" cy="58" r="3.5" fill="#FB8500" opacity=".55"/><circle cx="75" cy="58" r="3.5" fill="#FB8500" opacity=".55"/>
  </svg>`,

  crackedEgg: `<svg class="result-badge pop-in" viewBox="0 0 120 120" aria-hidden="true">
    <path d="M20 62c0-30 18-54 40-54s40 24 40 54l-10-8-9 10-9-10-9 10-9-10-9 10-9-10z" fill="#FFF3DD" stroke="${INK}" stroke-width="3" stroke-linejoin="round" transform="rotate(-10 60 40) translate(-4 -6)"/>
    <path d="M20 70l10-8 9 10 9-10 9 10 9-10 9 10 9-10 8 8c0 26-16 42-40 42S20 96 20 70z" fill="#FFF3DD" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M44 86q16-10 32 0" stroke="${INK}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M44 76l6 4M50 76l-6 4M70 76l6 4M76 76l-6 4" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>
  </svg>`,
};

// Binnenkant van een spiegelei-antwoordknop: dooier met icoon + tekst + stukje spek.
export const eggAnswerInner = (i, text) =>
  `<span class="strip">${ART.bacon()}</span><span class="yolk">${ART.answer[i]}</span><span class="txt">${esc(text)}</span>`;

/* ---------- Pagina-omlijsting ---------- */
export function shell(active = '') {
  const links = [
    ['index.html', 'Home', 'home'],
    ['play.html', 'Meedoen', 'play'],
    ['brief.html', 'Weekendbrief', 'brief'],
  ];
  const header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML = `
    <a class="brand" href="index.html" aria-label="SpekmetAI home">${ART.logo}<span class="wordmark">Spekmet<span class="ai">AI</span></span></a>
    <nav class="nav ${active === 'host' ? 'hidden' : ''}">${links.map(([href, label, key]) =>
      `<a href="${href}" class="${key === active ? 'active' : ''} ${key}-link">${label}</a>`).join('')}</nav>`;
  document.body.prepend(header);

  const bg = document.createElement('div');
  bg.className = 'bg-float';
  const items = [
    [ART.egg(false), 6, 18, 90, 0], [ART.bacon(), 80, 12, 140, -3], [ART.egg(false), 88, 62, 70, -7],
    [ART.bacon(), 4, 70, 120, -11], [ART.toast, 46, 88, 60, -5], [ART.egg(false), 55, 30, 50, -14],
  ];
  bg.innerHTML = items.map(([svg, x, y, w, d]) =>
    `<span style="left:${x}%;top:${y}%;width:${w}px;animation-delay:${d}s">${svg}</span>`).join('');
  document.body.prepend(bg);

  if (active !== 'host') {
    const footer = document.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML = `Gebakken met liefde 🍳🥓 · <a href="admin.html">admin</a>`;
    document.body.append(footer);
  }
}

/* ---------- Toast & confetti ---------- */
let toastWrap;
export function toast(msg, type = '') {
  toastWrap ||= document.body.appendChild(Object.assign(document.createElement('div'), { className: 'toast-wrap' }));
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  toastWrap.append(t);
  setTimeout(() => t.remove(), 3200);
}

export function confetti(n = 40) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const shapes = [ART.egg(false), ART.bacon(), ART.toast];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div');
    c.className = 'confetti';
    const size = 26 + Math.random() * 40;
    c.style.cssText = `left:${Math.random() * 100}vw;width:${size}px;animation-duration:${2.8 + Math.random() * 3}s;animation-delay:${Math.random() * 1.8}s;--rot:${(Math.random() - .5) * 1440}deg`;
    c.innerHTML = shapes[i % shapes.length];
    document.body.append(c);
    setTimeout(() => c.remove(), 8000);
  }
}

/* ---------- Media ---------- */
// Een mediaobject is { kind: 'image' | 'youtube' | 'drive', src }.
export function parseMediaUrl(url) {
  url = (url || '').trim();
  if (!url) return null;
  let m = url.match(/(?:youtube\.com\/(?:watch\?.*?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  if (m) {
    const t = url.match(/[?&](?:t|start)=(\d+)/);
    return { kind: 'youtube', src: m[1], start: t ? +t[1] : 0 };
  }
  m = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*?id=)([\w-]{20,})/);
  if (m) return { kind: 'drive', src: m[1] };
  return { kind: 'image', src: url };
}

export function mediaHtml(media, { autoplay = false, resolved } = {}) {
  if (!media) return '';
  if (media.kind === 'youtube') {
    const q = new URLSearchParams({ rel: '0', modestbranding: '1', autoplay: autoplay ? '1' : '0', start: media.start || 0 });
    return `<iframe class="embed" src="https://www.youtube-nocookie.com/embed/${esc(media.src)}?${q}" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>`;
  }
  if (media.kind === 'drive') {
    return `<iframe class="embed" src="https://drive.google.com/file/d/${esc(media.src)}/preview" allow="autoplay; fullscreen" allowfullscreen></iframe>`;
  }
  const src = resolved || media.src;
  return src ? `<img src="${esc(src)}" alt="" decoding="async">` : '';
}

// Afbeelding verkleinen voor snelle opslag en laden.
export async function compressImage(file, max = 1400) {
  if (file.type === 'image/gif' && file.size < 1.5e6) {
    return await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(file); });
  }
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  let out = c.toDataURL('image/webp', 0.82);
  if (!out.startsWith('data:image/webp')) out = c.toDataURL('image/jpeg', 0.85);
  return out;
}

/* ---------- Mini-markdown voor de weekendbrief ---------- */
export function md(text) {
  const safeUrl = (u) => (/^(https?:|mailto:|data:image\/)/i.test(u) ? u : '#');
  const inline = (s) => esc(s)
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, a, u) => `<img src="${safeUrl(u)}" alt="${a}" loading="lazy">`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) => `<a href="${safeUrl(u)}" target="_blank" rel="noopener">${t}</a>`)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>')
    .replace(/(^|\s)_(.+?)_/g, '$1<em>$2</em>');
  const out = [];
  let list = null, para = [];
  const flush = () => {
    if (para.length) out.push(`<p>${para.map(inline).join('<br>')}</p>`);
    if (list) out.push(`<ul>${list.map((l) => `<li>${inline(l)}</li>`).join('')}</ul>`);
    para = [];
    list = null;
  };
  for (const line of String(text || '').split('\n')) {
    let m;
    if (!line.trim()) flush();
    else if ((m = line.match(/^(#{1,3})\s+(.*)/))) { flush(); const l = m[1].length + 1; out.push(`<h${l}>${inline(m[2])}</h${l}>`); }
    else if ((m = line.match(/^>\s?(.*)/))) { flush(); out.push(`<blockquote>${inline(m[1])}</blockquote>`); }
    else if ((m = line.match(/^\s*[-*]\s+(.*)/))) { if (para.length) flush(); (list ||= []).push(m[1]); }
    else { if (list) flush(); para.push(line); }
  }
  flush();
  return out.join('\n');
}

export const fmtDate = (d) =>
  new Date(d).toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
