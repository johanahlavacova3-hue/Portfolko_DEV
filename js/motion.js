/**
 * Sdílené animace (inspirace A24): pomalé „expo“ křivky,
 * texty vyjíždějí zpod masky, obrázky se odkrývají clip-pathem.
 */
export const EASE_IN_OUT = 'cubic-bezier(.77,0,.175,1)';
export const EASE_OUT = 'cubic-bezier(.19,1,.22,1)';
export const EASE_IN = 'cubic-bezier(.6,0,.9,.4)';
export const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Obalí prvek maskou: <el class="rv"><span class="rv-i">…</span></el> */
export function mask(el) {
  if (el.classList.contains('rv')) return el.firstElementChild;
  const inner = document.createElement('span');
  inner.className = 'rv-i';
  while (el.firstChild) inner.appendChild(el.firstChild);
  el.appendChild(inner);
  el.classList.add('rv');
  return inner;
}

/** Postupné vyjetí prvků zpod masky. */
export function reveal(els, { delay = 0, stagger = 70, duration = 1300 } = {}) {
  return Promise.all([...els].map((el, i) => {
    const inner = mask(el);
    if (reduced) return Promise.resolve();
    return inner.animate(
      [{ transform: 'translate3d(0,110%,0)' }, { transform: 'translate3d(0,0,0)' }],
      { duration, delay: delay + i * stagger, easing: EASE_OUT, fill: 'backwards' },
    ).finished.catch(() => {});
  }));
}

/** Odjetí řádků nahoru (u výměny textu). */
export function conceal(inners, { stagger = 25, duration = 550 } = {}) {
  if (reduced) return Promise.resolve();
  return Promise.all([...inners].map((el, i) => el.animate(
    [{ transform: 'translate3d(0,0,0)' }, { transform: 'translate3d(0,-110%,0)' }],
    { duration, delay: i * stagger, easing: EASE_IN, fill: 'forwards' },
  ).finished.catch(() => {})));
}

/** Zobrazí stránku (skryté inline skriptem v <head>, aby neproblikla). */
export function showPage() {
  document.documentElement.classList.remove('rv-pending');
}

/* =========================================================
   Písmena – pokaždé jiná animace
   ========================================================= */
const LETTER_FX = {
  // písmena vyjedou zespodu (maska je uřízne)
  rise:    { kf: [{ transform: 'translate3d(0,110%,0)' }, { transform: 'none' }], dur: 900, st: 14, ease: EASE_OUT },
  // písmena spadnou shora
  drop:    { kf: [{ transform: 'translate3d(0,-110%,0)' }, { transform: 'none' }], dur: 900, st: 14, ease: EASE_OUT },
  // rozmazaná písmena zaostří
  blur:    { kf: [{ opacity: 0, filter: 'blur(8px)' }, { opacity: 1, filter: 'blur(0)' }], dur: 700, st: 12, ease: EASE_OUT },
  // psací stroj
  type:    { kf: [{ opacity: 0 }, { opacity: 1 }], dur: 1, st: 24, ease: 'linear' },
  // písmena naskočí v náhodném pořadí
  shuffle: { kf: [{ opacity: 0 }, { opacity: 1 }], dur: 240, st: 16, ease: 'linear', random: true },
  // písmena se vyklopí z náklonu
  tilt:    { kf: [{ transform: 'translate3d(0,70%,0) rotate(16deg)', opacity: 0 }, { transform: 'none', opacity: 1 }], dur: 950, st: 16, ease: EASE_OUT },
  // náhodné znaky se „dopočítají“ na správný text
  scramble: { scramble: true },
};
export const LETTER_VARIANTS = Object.keys(LETTER_FX);

/** Náhodná varianta, nikdy dvakrát stejná za sebou (ani mezi stránkami). */
export function nextVariant() {
  let last = '';
  try { last = sessionStorage.getItem('jh-fx') || ''; } catch {}
  const pool = LETTER_VARIANTS.filter((v) => v !== last);
  const v = pool[Math.floor(Math.random() * pool.length)];
  try { sessionStorage.setItem('jh-fx', v); } catch {}
  return v;
}

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#*+-/<>◆';

function scramble(el, text, delay) {
  return new Promise((resolve) => {
    const start = performance.now() + delay;
    const per = 16, settle = 280;
    const chars = [...text];
    const blank = chars.map((c) => (c.trim() ? ' ' : c)).join('');
    el.textContent = blank;
    const frame = (now) => {
      let out = '', done = true;
      chars.forEach((c, i) => {
        if (!c.trim()) { out += c; return; }
        const t = start + i * per;
        if (now < t) { out += ' '; done = false; }
        else if (now < t + settle) { out += GLYPHS[(Math.random() * GLYPHS.length) | 0]; done = false; }
        else out += c;
      });
      el.textContent = out;
      if (done) { el.textContent = text; resolve(); } else requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
}

/** Animuje text prvku po písmenech. Po dokončení vrátí čistý text. */
export function letters(el, variant, { delay = 0 } = {}) {
  const text = el.textContent;
  if (reduced || !text.trim()) return Promise.resolve();
  const fx = LETTER_FX[variant] || LETTER_FX.rise;
  if (fx.scramble) return scramble(el, text, delay);

  el.textContent = '';
  const spans = [];
  for (const ch of text) {
    if (!ch.trim()) { el.appendChild(document.createTextNode(ch)); continue; }
    const s = document.createElement('span');
    s.className = 'ch';
    s.textContent = ch;
    el.appendChild(s);
    spans.push(s);
  }
  const order = spans.map((_, i) => i);
  if (fx.random) order.sort(() => Math.random() - 0.5);
  return Promise.all(spans.map((s, i) => s.animate(fx.kf, {
    duration: fx.dur, delay: delay + order[i] * fx.st, easing: fx.ease, fill: 'backwards',
  }).finished.catch(() => {}))).then(() => { if (el.isConnected) el.textContent = text; });
}
