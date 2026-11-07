/** Minimal RFC 4180 CSV parser/serializer (quoted fields, escaped quotes, newlines in cells, CRLF, BOM). */

export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { cell += '"'; i += 2; continue; }
        inQuotes = false; i++; continue;
      }
      cell += c; i++; continue;
    }
    if (c === '"') { inQuotes = true; i++; continue; }
    if (c === ',') { row.push(cell); cell = ''; i++; continue; }
    if (c === '\r' || c === '\n') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); cell = ''; rows.push(row); row = []; i++; continue;
    }
    cell += c; i++;
  }
  if (inQuotes) throw new Error('CSV: unterminated quoted field');
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => !(r.length === 1 && r[0] === '')); // drop blank lines
}

const needsQuote = /[",\r\n]|^\s|\s$/;
export function toCsv(rows: readonly (readonly string[])[]): string {
  return rows.map((r) => r.map((c) => (needsQuote.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\n') + '\n';
}

/** Parse CSV with a header row into objects keyed by header name. */
export function parseCsvObjects(text: string): Record<string, string>[] {
  const [header, ...rows] = parseCsv(text);
  if (!header) return [];
  return rows.map((r, n) => {
    if (r.length !== header.length) throw new Error(`CSV row ${n + 2}: expected ${header.length} columns, got ${r.length}`);
    return Object.fromEntries(header.map((h, i) => [h, r[i]]));
  });
}
