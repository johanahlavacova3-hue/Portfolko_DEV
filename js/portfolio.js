/**
 * Portfolio: jedna obrazovka, obrázky se přepínají, texty stojí na místě.
 *
 * Ovládání (žádná tlačítka):
 *  - klik do pravé / levé půlky obrázku, swipe, tažení myší, šipky ← →
 *    → další / předchozí obrázek. Za posledním obrázkem práce plynule
 *      navazuje další práce.
 *  - kolečko myši, šipky ↑ ↓ → skok rovnou na další / předchozí práci
 *  - vodorovné gesto na touchpadu → obrázky
 * Kurzor nad obrázkem ukazuje směr a pořadí („02/03 ->“).
 */
import { loadProjects } from './data.js';
import { EASE_IN_OUT, EASE_OUT, reduced, conceal, reveal } from './motion.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const nn = (n) => String(n).padStart(2, '0');
const DUR = 1250;

export async function initPortfolio(root, source) {
  const frame = root.querySelector('.pf-frame');
  const f = {
    head: root.querySelector('.pf-head'),
    col2: root.querySelector('.pf-col2'),
    col3: root.querySelector('.pf-col3'),
    tags: root.querySelector('.pf-tags'),
  };

  let projects;
  try {
    projects = (await loadProjects(source)).filter((p) => p.images.length);
  } catch (e) {
    console.error(e);
    frame.innerHTML = `<p class="pf-msg">Projekty se nepodařilo načíst (${esc(source)}).<br>
      Zkontroluj cestu v js/config.js a že je web spuštěný přes server.</p>`;
    return;
  }
  if (!projects.length) {
    frame.innerHTML = '<p class="pf-msg">Zatím tu nic není — přidej práci do data/projects.json.</p>';
    return;
  }

  /* ---------- plochý seznam všech obrázků ---------- */
  const slides = [];
  projects.forEach((p, pi) => p.images.forEach((src, ii) => slides.push({ p, pi, ii, src })));
  const firstOf = (pi) => slides.findIndex((s) => s.pi === pi);

  // přednačtení
  const cache = new Map();
  const preload = (i) => {
    const s = slides[(i + slides.length) % slides.length];
    if (!cache.has(s.src)) {
      const img = new Image();
      img.decoding = 'async';
      img.src = s.src;
      cache.set(s.src, img.decode().catch(() => {}));
    }
    return cache.get(s.src);
  };

  /* ---------- počáteční pozice z URL (#id nebo #id/2) ---------- */
  let index = 0;
  const [hid, hn] = decodeURIComponent(location.hash.slice(1)).split('/');
  if (hid) {
    const pi = projects.findIndex((p) => p.id === hid);
    if (pi >= 0) index = firstOf(pi) + Math.min(Math.max((+hn || 1) - 1, 0), projects[pi].images.length - 1);
  }

  /* ---------- texty po řádcích ---------- */
  const measurer = document.createElement('div');
  measurer.className = 'pf-measure';
  f.col2.parentElement.appendChild(measurer);

  function splitLines(text) {
    const cs = getComputedStyle(f.col2);
    measurer.style.width = (f.col2.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) + 'px';
    const out = [];
    for (const para of String(text).split('\n')) {
      measurer.innerHTML = para.split(/\s+/).filter(Boolean)
        .map((w) => `<span>${esc(w)}</span>`).join(' ');
      let top = null;
      for (const s of measurer.children) {
        if (s.offsetTop !== top) { out.push([]); top = s.offsetTop; }
        out[out.length - 1].push(s.textContent);
      }
    }
    measurer.innerHTML = '';
    return out.map((l) => l.join(' '));
  }

  const line = (t) => `<span class="ln rv"><span class="rv-i">${esc(t) || '&nbsp;'}</span></span>`;

  function renderText(p) {
    f.head.innerHTML = line(p.title) + line(p.date);
    const lines = splitLines(p.text);
    const mobile = matchMedia('(max-width: 760px)').matches;
    const cut = mobile || lines.length <= 3 ? lines.length : Math.ceil(lines.length / 2);
    f.col2.innerHTML = lines.slice(0, cut).map(line).join('');
    f.col3.innerHTML = lines.slice(cut).map(line).join('');
    f.tags.innerHTML = p.tags.map(line).join('');
  }
  const textInners = () => [f.head, f.col2, f.col3, f.tags]
    .flatMap((el) => [...el.querySelectorAll('.rv-i')]);

  function textIn(delay = 0) {
    // sloupce postupně zleva, řádky ve sloupci s krátkým odstupem
    const cols = [f.head, f.col2, f.col3, f.tags];
    cols.forEach((col, c) => reveal(col.querySelectorAll('.ln'), {
      delay: delay + c * 90, stagger: 45, duration: 1200,
    }));
  }

  /* ---------- slidy ---------- */
  function makeSlide(s) {
    const el = document.createElement('div');
    el.className = 'pf-slide';
    el.innerHTML = `<img src="${esc(s.src)}" alt="${esc(s.p.title)} – ${s.ii + 1}" draggable="false">`;
    return el;
  }

  let current = makeSlide(slides[index]);
  frame.appendChild(current);
  renderText(slides[index].p);

  let busy = false;
  let queued = null;

  function updateHash() {
    const s = slides[index];
    try { history.replaceState(null, '', `#${s.p.id}${s.ii ? '/' + (s.ii + 1) : ''}`); } catch {}
  }

  /** dir: 'next' | 'prev' | 'down' | 'up' */
  async function go(to, dir) {
    to = (to + slides.length) % slides.length;
    if (to === index) return;
    if (busy) { queued = [to, dir]; return; }
    busy = true;

    const from = slides[index];
    const next = slides[to];
    const projectChange = from.pi !== next.pi;
    index = to;
    updateHash();
    updateCursor();

    await preload(to);
    const incoming = makeSlide(next);
    frame.appendChild(incoming);
    const outgoing = current;
    current = incoming;

    const clip = {
      next: 'inset(0 0 0 100%)', prev: 'inset(0 100% 0 0)',
      down: 'inset(100% 0 0 0)', up: 'inset(0 0 100% 0)',
    }[dir];
    const shift = {
      next: ['18%', '0'], prev: ['-18%', '0'], down: ['0', '18%'], up: ['0', '-18%'],
    }[dir];
    const away = {
      next: ['-14%', '0'], prev: ['14%', '0'], down: ['0', '-14%'], up: ['0', '14%'],
    }[dir];

    // text (jen při změně práce): staré řádky odjedou, nové vyjedou
    if (projectChange) {
      conceal(textInners()).then(() => { renderText(next.p); textIn(120); });
    }

    const opts = { duration: reduced ? 400 : DUR, easing: EASE_IN_OUT, fill: 'both' };
    const anims = reduced
      ? [incoming.animate([{ opacity: 0 }, { opacity: 1 }], opts)]
      : [
          incoming.animate([{ clipPath: clip }, { clipPath: 'inset(0 0 0 0)' }], opts),
          incoming.firstElementChild.animate([
            { transform: `translate3d(${shift[0]},${shift[1]},0) scale(1.18)` },
            { transform: 'translate3d(0,0,0) scale(1)' },
          ], opts),
          outgoing.firstElementChild.animate([
            { transform: 'translate3d(0,0,0) scale(1)' },
            { transform: `translate3d(${away[0]},${away[1]},0) scale(1.05)` },
          ], opts),
          outgoing.animate([{ opacity: 1 }, { opacity: 0.25 }], opts),
        ];

    await Promise.all(anims.map((a) => a.finished.catch(() => {})));
    outgoing.remove();
    anims.forEach((a) => { try { a.cancel(); } catch {} });
    busy = false;
    preload(index + 1);

    if (queued) { const q = queued; queued = null; go(...q); }
  }

  const nextImage = () => go(index + 1, 'next');
  const prevImage = () => go(index - 1, 'prev');
  const nextProject = () => go(firstOf((slides[index].pi + 1) % projects.length), 'down');
  const prevProject = () => {
    const s = slides[index];
    // první „nahoru“ vrátí na začátek aktuální práce, další skočí o práci zpět
    const target = s.ii > 0 ? s.pi : (s.pi - 1 + projects.length) % projects.length;
    go(firstOf(target), 'up');
  };

  /* ---------- kurzor ---------- */
  const cursor = document.querySelector('.cursor');
  const label = cursor?.querySelector('.cursor-label');
  let side = 1;
  let cx = 0, cy = 0, tx = 0, ty = 0, raf = 0;

  function updateCursor() {
    if (!label) return;
    const s = slides[index];
    const count = `${nn(s.ii + 1)}/${nn(s.p.images.length)}`;
    label.textContent = side > 0 ? `${count} ->` : `<- ${count}`;
  }
  const loop = () => {
    cx += (tx - cx) * 0.22; cy += (ty - cy) * 0.22;
    cursor.style.transform = `translate3d(${cx}px,${cy}px,0)`;
    raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.1 ? requestAnimationFrame(loop) : 0;
  };

  frame.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || !cursor) return;
    const r = frame.getBoundingClientRect();
    const s = e.clientX > r.left + r.width / 2 ? 1 : -1;
    if (s !== side) { side = s; updateCursor(); }
    tx = e.clientX; ty = e.clientY;
    if (!cursor.classList.contains('is-on')) { cx = tx; cy = ty; cursor.classList.add('is-on'); }
    if (!raf) raf = requestAnimationFrame(loop);
  });
  frame.addEventListener('pointerleave', () => cursor?.classList.remove('is-on'));

  /* ---------- klik / swipe / tažení ---------- */
  let down = null;
  frame.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
    frame.setPointerCapture(e.pointerId);
  });
  frame.addEventListener('pointermove', (e) => {
    if (!down || busy) return;
    const dx = e.clientX - down.x;
    current.firstElementChild.style.transform = `translate3d(${dx * 0.12}px,0,0) scale(${1 + Math.min(Math.abs(dx), 300) / 6000})`;
  });
  const release = (e) => {
    if (!down) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    const img = current.firstElementChild;
    if (img.style.transform) {
      img.animate([{ transform: img.style.transform }, { transform: 'none' }],
        { duration: 600, easing: EASE_OUT });
      img.style.transform = '';
    }
    down = null;
    if (e.type === 'pointercancel') return;
    const touch = e.pointerType !== 'mouse';
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      dx < 0 ? nextImage() : prevImage();
    } else if (!touch && Math.abs(dy) > 60) {
      dy < 0 ? nextProject() : prevProject();
    } else if (Math.abs(dx) < 6 && Math.abs(dy) < 6) {
      const r = frame.getBoundingClientRect();
      e.clientX > r.left + r.width / 2 ? nextImage() : prevImage();
    }
  };
  frame.addEventListener('pointerup', release);
  frame.addEventListener('pointercancel', release);

  /* ---------- kolečko / touchpad (jedno gesto = jeden krok) ---------- */
  let lastWheel = 0, used = false;
  window.addEventListener('wheel', (e) => {
    if (matchMedia('(max-width: 760px)').matches) return;
    e.preventDefault();
    const now = performance.now();
    if (now - lastWheel > 220) used = false;
    lastWheel = now;
    if (used || busy) return;
    const h = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    const d = h ? e.deltaX : e.deltaY;
    if (Math.abs(d) < 12) return;
    used = true;
    if (h) d > 0 ? nextImage() : prevImage();
    else d > 0 ? nextProject() : prevProject();
  }, { passive: false });

  /* ---------- klávesnice ---------- */
  window.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k === 'ArrowRight' || k === ' ') { e.preventDefault(); nextImage(); }
    else if (k === 'ArrowLeft') prevImage();
    else if (k === 'ArrowDown' || k === 'PageDown') { e.preventDefault(); nextProject(); }
    else if (k === 'ArrowUp' || k === 'PageUp') { e.preventDefault(); prevProject(); }
  });

  /* ---------- přepočet řádků při změně šířky ---------- */
  let rw = window.innerWidth;
  new ResizeObserver(() => {
    if (window.innerWidth === rw) return;
    rw = window.innerWidth;
    renderText(slides[index].p);
  }).observe(document.body);

  frame.classList.add('is-ready'); // až teď se schová systémový kurzor

  /* ---------- úvodní animace ---------- */
  await preload(index);
  preload(index + 1);
  updateCursor();
  if (!reduced) {
    current.animate([{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0 0 0 0)' }],
      { duration: 1500, easing: EASE_IN_OUT, fill: 'backwards', delay: 150 });
    current.firstElementChild.animate(
      [{ transform: 'translate3d(0,12%,0) scale(1.3)' }, { transform: 'none' }],
      { duration: 1900, easing: EASE_OUT, fill: 'backwards', delay: 150 });
  }
  textIn(reduced ? 0 : 700);
}
