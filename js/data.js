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
  Array.isArray(v) ? v : String(v || '').split(/[|\n]|;\s*/).map((s) => s.trim()).filter(Boolean);

export const slugify = (s) =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Sjednotí projekt z JSON / CSV do jednoho tvaru. */
function normalizeProject(p) {
  return {
    id: p.id || slugify(p.title || ''),
    title: p.title || '',
    date: p.date || '',
    text: p.text || '',
    tags: list(p.tags),
    images: list(p.images),
    hidden: ['1', 'true', 'ano', 'x', 'yes'].includes(String(p.hidden ?? '').toLowerCase()),
  };
}

export async function loadProjects(source) {
  let raw;
  const isCSV = /\.csv($|\?)|output=csv|format=csv/i.test(source);
  if (isCSV) {
    const res = await fetch(source, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${source}: ${res.status}`);
    raw = parseCSV(await res.text());
  } else {
    raw = await loadJSON(source);
  }
  return raw.map(normalizeProject).filter((p) => !p.hidden && (p.title || p.images.length));
}
