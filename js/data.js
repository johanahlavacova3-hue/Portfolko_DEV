/**
 * Načítání dat — JSON i CSV (Excel, Google Sheets publikovaný jako CSV).
 */

export async function loadJSON(url) {
  const res = await fetch(url, { cache: 'no-cache' });
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return res.json();
}

/** Jednoduchý CSV parser (uvozovky, čárky i nové řádky v buňkách). */
export function parseCSV(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  text = text.replace(/^﻿/, '');
  // Excel v CZ často ukládá se středníkem — poznáme podle hlavičky
  const firstLine = text.split(/\r?\n/, 1)[0];
  const sep = (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ',';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }

  const [head, ...body] = rows.filter((r) => r.some((c) => c.trim() !== ''));
  if (!head) return [];
  const keys = head.map((h) => h.trim().toLowerCase());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] ?? '').trim()])));
}

const list = (v) =>
  Array.isArray(v) ? v : String(v || '').split(/[|\r\n]+|;\s*/).map((s) => s.trim()).filter(Boolean);

export const slugify = (s) =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** České nadpisy sloupců z Excelu → interní klíče. */
const HEADERS = {
  id: 'id', 'název': 'title', nazev: 'title', title: 'title',
  datum: 'date', date: 'date', rok: 'year', year: 'year',
  popis: 'text', text: 'text',
  'typ (štítky)': 'tags', typ: 'tags', 'štítky': 'tags', tags: 'tags',
  'obrázky': 'images', obrazky: 'images', images: 'images',
  'obrázky / videa / 3d': 'images', 'média': 'images', media: 'images', soubory: 'images',
  'skrýt': 'hidden', skryt: 'hidden', hidden: 'hidden',
};
const remap = (row) => Object.fromEntries(Object.entries(row).map(([k, v]) =>
  [HEADERS[String(k).trim().toLowerCase()] || String(k).trim().toLowerCase(), v]));

/** Datum z Excelu (buňka typu datum, číslo nebo text) → DD.MM.RRRR */
function fmtDate(v) {
  if (v instanceof Date) {
    const d = new Date(v.getTime() + 12 * 3600e3); // ochrana proti posunu časového pásma
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
  }
  return String(v ?? '').trim();
}

/** Nadpisy listu „Média“ → interní klíče. */
const MEDIA_HEADERS = {
  'projekt (id)': 'project', projekt: 'project', id: 'project', project: 'project',
  soubor: 'src', src: 'src', file: 'src',
  popisek: 'caption', caption: 'caption',
  odkaz: 'link', link: 'link',
  'text odkazu': 'linkText', linktext: 'linkText',
};
const remapMedia = (row) => Object.fromEntries(Object.entries(row).map(([k, v]) =>
  [MEDIA_HEADERS[String(k).trim().toLowerCase()] || String(k).trim().toLowerCase(), String(v ?? '').trim()]));

/** Načte list „Práce“ a k němu list „Média“ (jeden řádek = jeden obrázek / video / 3D). */
async function loadXLSX(url) {
  const [XLSX, res] = await Promise.all([
    import('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/xlsx.mjs'),
    fetch(url, { cache: 'no-cache' }),
  ]);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  const wb = XLSX.read(await res.arrayBuffer(), { type: 'array', cellDates: true });
  const sheet = wb.Sheets['Práce'] || wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true }).map(remap);
  const mediaSheet = wb.Sheets['Média'] || wb.Sheets['Media'];
  if (mediaSheet) {
    const media = XLSX.utils.sheet_to_json(mediaSheet, { defval: '', raw: false }).map(remapMedia)
      .filter((m) => m.project && m.src);
    for (const r of rows) {
      const id = String(r.id || slugify(r.title || '')).trim();
      const own = media.filter((m) => m.project === id);
      if (own.length) r.images = own;
    }
  }
  return rows;
}

/** Položka média: „cesta“ nebo { src, caption, link, linkText } */
const mediaItem = (m) => (typeof m === 'string'
  ? { src: m.trim(), caption: '', link: '', linkText: '' }
  : { src: String(m.src || '').trim(), caption: String(m.caption || '').trim(),
      link: String(m.link || '').trim(), linkText: String(m.linkText || '').trim() });
const mediaList = (v) => (Array.isArray(v) ? v : list(v)).map(mediaItem).filter((m) => m.src);

/** Sjednotí projekt z JSON / CSV / Excelu do jednoho tvaru. */
function normalizeProject(p) {
  return {
    id: p.id || slugify(p.title || ''),
    title: p.title || '',
    date: fmtDate(p.date),
    // rok: sloupec „Rok“, jinak první čtyřčíslí z data (12.05.2026 → 2026, „2024 – současnost“ → 2024)
    year: String(p.year || (String(fmtDate(p.date)).match(/(\d{4})/) || [])[1] || ''),
    text: p.text || '',
    tags: list(p.tags),
    images: mediaList(p.images),
    hidden: ['1', 'true', 'ano', 'x', 'yes'].includes(String(p.hidden ?? '').toLowerCase()),
  };
}

export async function loadProjects(source) {
  let raw;
  if (/\.(xlsx|xls)($|\?)/i.test(source) || source.includes('format=xlsx')) {
    raw = await loadXLSX(source);
    return raw.map(normalizeProject).filter((p) => !p.hidden && (p.title || p.images.length));
  }
  const isCSV = /\.csv($|\?)|output=csv|format=csv/i.test(source);
  if (isCSV) {
    const res = await fetch(source, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${source}: ${res.status}`);
    raw = parseCSV(await res.text());
  } else {
    raw = (await loadJSON(source)).map(remap);
  }
  return raw.map(normalizeProject).filter((p) => !p.hidden && (p.title || p.images.length));
}
