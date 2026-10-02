/**
 * Výběr prací před galerií: podle roku a podle typu (štítků).
 * Odkazy vedou na galerie.html?rok=2026 nebo galerie.html?typ=robotika.
 */
import { loadProjects, slugify } from './data.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export async function renderSelection(root, source) {
  let projects = [];
  try { projects = await loadProjects(source); } catch (e) { console.error(e); }

  const count = (map, key, label) => {
    if (!key) return;
    const k = map.get(key) || { label, n: 0 };
    k.n++; map.set(key, k);
  };
  const years = new Map(), tags = new Map();
  for (const p of projects) {
    count(years, p.year, p.year);
    for (const t of p.tags) count(tags, slugify(t), t);
  }

  const link = (param, key, { label, n }) =>
    `<a href="galerie.html?${param}=${encodeURIComponent(key)}" data-filter="${param}:${esc(key)}">` +
    `${esc(label)} <span class="count">(${n})</span> -&gt;</a>`;

  const yearEl = root.querySelector('[data-select="year"]');
  const tagEl = root.querySelector('[data-select="tag"]');
  if (yearEl) {
    yearEl.innerHTML = [...years].sort((a, b) => b[0].localeCompare(a[0]))
      .map(([k, v]) => link('rok', k, v)).join('') || '<span>—</span>';
  }
  if (tagEl) {
    tagEl.innerHTML = [...tags].sort((a, b) => a[1].label.localeCompare(b[1].label, 'cs'))
      .map(([k, v]) => link('typ', k, v)).join('') || '<span>—</span>';
  }

  // záloha filtru i pro prostředí, kde se ?parametry neposílají (náhled)
  root.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-filter], a[href="galerie.html"]');
    if (!a) return;
    try { sessionStorage.setItem('jh-filter', a.dataset.filter || ''); } catch {}
  });
}
