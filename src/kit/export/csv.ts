// CSV helpers shared by client-side report generation and the mock backend.

/** Quotes a cell and neutralises spreadsheet formulas (CWE-1236). */
export function sanitizeCsvCell(value: unknown): string {
  if (value === undefined || value === null) return '""';
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

/** Builds a UTF-8 CSV (with BOM so spreadsheet apps detect the encoding). */
export function toCsv(rows: unknown[][]): string {
  return '﻿' + rows.map((r) => r.map(sanitizeCsvCell).join(',')).join('\r\n');
}
