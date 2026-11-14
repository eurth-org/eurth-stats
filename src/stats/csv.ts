// The checks as a CSV file, for a spreadsheet: one row a check, with the
// numbers behind each verdict.

import { VERDICT_WORD, type Report } from './check';

export const CSV_COLUMNS = [
  'Check',
  'Value',
  'Value in words',
  'Verdict',
  'Why',
  'Compared with',
  'Countries compared',
  'Typical from',
  'Typical to',
  'Lowest country',
  'Lowest',
  'Highest country',
  'Highest',
] as const;

type Cell = string | number;

/**
 * One cell. Text is quoted when it needs to be, and text that a spreadsheet
 * would run as a formula (it starts with =, +, - or @) gets a leading
 * apostrophe, so a nation's name can't do anything on opening. Numbers go in bare.
 */
export function csvCell(value: Cell): string {
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  let text = value.replace(/\r\n?/g, '\n');
  if (/^[=+\-@\t]/.test(text)) text = `'${text}`;
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function tidy(value: number): number {
  return Number(value.toPrecision(6));
}

/** The checks, then the scale lines, as CSV text with a header row. Lines end as RFC 4180 asks. */
export function checksCsv(report: Report): string {
  const rows: Cell[][] = [[...CSV_COLUMNS]];
  for (const check of report.checks) {
    rows.push([
      check.label,
      tidy(check.value),
      check.valueText,
      VERDICT_WORD[check.verdict],
      check.reason,
      check.groupLabel,
      check.peers,
      tidy(check.typical.low),
      tidy(check.typical.high),
      check.spread.lowest.name,
      tidy(check.spread.lowest.value),
      check.spread.highest.name,
      tidy(check.spread.highest.value),
    ]);
  }
  for (const line of report.scale) {
    rows.push([line.label, tidy(line.value), line.valueText, '', line.comparison, 'real countries', '', '', '', '', '', '', '']);
  }
  return `${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}
