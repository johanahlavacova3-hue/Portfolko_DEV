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
