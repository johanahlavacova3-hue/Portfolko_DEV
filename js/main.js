import { CONFIG } from './config.js';
import { loadJSON } from './data.js';
import { mountAll } from './jh3d.js';
import { reveal, showPage } from './motion.js';
import { initPortfolio } from './portfolio.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const tel = (p) => 'tel:' + String(p).replace(/[^\d+]/g, '');

/* ---------- 3D logo ---------- */
mountAll();

/* ---------- Kontakty a About me ze site.json ---------- */
async function renderSite() {
  let site;
  try { site = await loadJSON(CONFIG.siteSource); } catch (e) { console.warn(e); return; }

  document.querySelectorAll('[data-href="tel"]').forEach((a) => (a.href = tel(site.phone)));

  document.querySelectorAll('[data-contact]').forEach((el) => {
    el.innerHTML = `
      <p>${esc(site.name)}<br>${esc(site.role)}</p>
      <p><a href="mailto:${esc(site.email)}">${esc(site.email)}</a><br>
         <a href="${tel(site.phone)}">${esc(site.phone)}</a></p>
      <p>IČO.: ${esc(site.ico)}</p>`;
  });

  document.querySelectorAll('[data-bind]').forEach((el) => {
    const v = el.dataset.bind.split('.').reduce((o, k) => o?.[k], site);
    if (v != null) el.textContent = v;
  });

  document.querySelectorAll('[data-list]').forEach((el) => {
    const v = el.dataset.list.split('.').reduce((o, k) => o?.[k], site);
    if (Array.isArray(v)) el.innerHTML = v.map((x) => `<span>${esc(x)}</span>`).join('');
  });
}

/* ---------- Úvodní animace stránky ---------- */
async function start() {
  await renderSite();
  showPage();

  // hlavička
  reveal(document.querySelectorAll('.site-header .logo, .site-header nav a'), { stagger: 80 });

  // obsah (úvod, about, 404)
  reveal(document.querySelectorAll(
    '[data-reveal], .big-links a, [data-contact] p, .about-col, .msg > *',
  ), { delay: 250, stagger: 90 });

  // portfolio
  const pf = document.querySelector('[data-portfolio]');
  if (pf) initPortfolio(pf, CONFIG.projectsSource);
}

start();
