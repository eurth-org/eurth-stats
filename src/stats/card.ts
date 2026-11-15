// The results card: the checks as a picture, for sharing. One function draws
// it as SVG text at any size; the page turns that into PNG or WebP.
//
// A picture can't use the stylesheet's custom properties, so its colours come
// from the same tokens as plain values (HANDBOOK.md, Look).

import { faCircleCheck, faSquareXmark, faTriangleExclamation, type IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { resolveColors } from '@eurth/style';
import tokens from '@eurth/style/tokens.json';
import { VERDICTS, VERDICT_WORD, type Check, type Report, type Verdict } from './check';
import { describeNation, titleOf } from './describe';
import type { Nation } from './model';
import { dateInWords } from './snapshot';

export interface CardPalette {
  surface: string;
  raised: string;
  ink: string;
  muted: string;
  line: string;
  lineStrong: string;
  plausible: string;
  stretch: string;
  unlikely: string;
}

/** The card's colours for a theme, from @eurth/style's tokens. */
export function cardPalette(theme: 'dark' | 'light' = 'dark'): CardPalette {
  const colors = resolveColors(tokens as unknown as Parameters<typeof resolveColors>[0], theme);
  const pick = (name: string): string => {
    const value = colors[name];
    if (!value) throw new Error(`No colour token called ${name}`);
    return value;
  };
  return {
    surface: pick('surface'),
    raised: pick('surface-raised'),
    ink: pick('ink'),
    muted: pick('ink-muted'),
    line: pick('line'),
    lineStrong: pick('line-strong'),
    plausible: pick('success-text'),
    stretch: pick('caution-text'),
    unlikely: pick('danger-text'),
  };
}

/** Each verdict's icon: three different shapes, so the verdict never rests on colour. */
export const VERDICT_ICON: { readonly [K in Verdict]: IconDefinition } = {
  plausible: faCircleCheck,
  stretch: faTriangleExclamation,
  unlikely: faSquareXmark,
};

export interface CardOptions {
  width: number;
  height: number;
  palette?: CardPalette;
  /** The address printed on the card. */
  host?: string;
}

const SANS = 'system-ui, Arial, sans-serif';
const MONO = 'ui-monospace, Menlo, monospace';

function escape(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Text cut to fit a width, by a rough count of how wide letters run. */
function fit(text: string, width: number, size: number, wide = 0.56): string {
  const room = Math.max(1, Math.floor(width / (size * wide)));
  return text.length <= room ? text : `${text.slice(0, Math.max(1, room - 1)).trimEnd()}…`;
}

const round = (value: number): number => Math.round(value * 10) / 10;

function icon(definition: IconDefinition, x: number, y: number, size: number, fill: string): string {
  const [, height, , , path] = definition.icon;
  const scale = size / height;
  const d = Array.isArray(path) ? path.join(' ') : path;
  return `<path transform="translate(${round(x)} ${round(y)}) scale(${scale.toFixed(4)})" fill="${fill}" d="${d}"/>`;
}

/** The checks a card of this size has room for: what stands out first, then the rest in order. */
export function cardRows(checks: readonly Check[], room: number): { rows: Check[]; left: number } {
  if (checks.length <= room) return { rows: [...checks], left: 0 };
  const shown = Math.max(0, room - 1);
  const out = checks.filter((check) => check.verdict !== 'plausible');
  const keep = new Set<Check>(out.slice(0, shown));
  for (const check of checks) {
    if (keep.size >= shown) break;
    keep.add(check);
  }
  return { rows: checks.filter((check) => keep.has(check)), left: checks.length - keep.size };
}

/** The results card as SVG text. Every word in it is escaped: a nation's name is someone else's input. */
export function cardSvg(nation: Nation, report: Report, options: CardOptions): string {
  const { width, height } = options;
  const palette = options.palette ?? cardPalette('dark');
  const host = options.host ?? 'stats.eurth.org';
  // Type scales with the card: against its width when it is wide, a little larger when it is tall.
  const unit = width >= height ? width / 1200 : width / 900;
  const pad = 56 * unit;
  const inner = width - pad * 2;
  const parts: string[] = [];
  const text = (
    x: number, y: number, content: string, size: number,
    more: { fill?: string; weight?: number; family?: string; anchor?: string; spacing?: number } = {},
  ): void => {
    parts.push(
      `<text x="${round(x)}" y="${round(y)}" font-family="${more.family ?? SANS}" font-size="${round(size)}" font-weight="${more.weight ?? 400}" fill="${more.fill ?? palette.ink}"${more.anchor ? ` text-anchor="${more.anchor}"` : ''}${more.spacing ? ` letter-spacing="${round(more.spacing)}"` : ''}>${escape(content)}</text>`,
    );
  };

  parts.push(`<rect width="${width}" height="${height}" fill="${palette.surface}"/>`);

  // The heading: what this is, whose it is, and how it came out.
  let y = pad + 18 * unit;
  text(pad, y, 'PLAUSIBILITY CHECK', 18 * unit, { fill: palette.muted, weight: 700, spacing: 1.5 * unit });
  y += 54 * unit;
  text(pad, y, fit(titleOf(nation), inner, 44 * unit), 44 * unit, { weight: 700 });
  y += 44 * unit;
  let x = pad;
  const counted = VERDICTS.filter((verdict) => report.counts[verdict] > 0);
  if (counted.length === 0) {
    text(pad, y, 'Nothing to check yet', 24 * unit, { fill: palette.muted, weight: 700 });
  }
  for (const verdict of counted) {
    const label = `${report.counts[verdict]} ${VERDICT_WORD[verdict].toLowerCase()}`;
    parts.push(icon(VERDICT_ICON[verdict], x, y - 21 * unit, 24 * unit, palette[verdict]));
    text(x + 32 * unit, y, label, 24 * unit, { fill: palette[verdict], weight: 700 });
    x += (32 + label.length * 13.5 + 28) * unit;
  }

  // The foot: where it was made, and what the ranges rest on.
  const footY = height - pad;
  text(pad, footY, host, 22 * unit, { weight: 700 });
  text(width - pad, footY, `Real-world data: World Bank and SIPRI, ${dateInWords(report.snapshotDate)}`, 16 * unit, {
    fill: palette.muted,
    anchor: 'end',
  });

  // The checks, one a row: its name, its value, where it sits, and the verdict.
  const top = y + 30 * unit;
  const bottom = footY - 44 * unit;
  const least = 34 * unit;
  const room = Math.max(1, Math.floor((bottom - top) / least));
  const { rows, left } = cardRows(report.checks, room);
  const lines = rows.length + (left > 0 ? 1 : 0);
  const rowHeight = Math.min(76 * unit, (bottom - top) / Math.max(1, lines));
  const labelSize = Math.min(22 * unit, rowHeight * 0.5);
  const valueSize = labelSize * 0.86;
  const columns = {
    label: pad,
    value: pad + inner * 0.3,
    bar: pad + inner * 0.56,
    barEnd: pad + inner * 0.81,
    verdict: pad + inner * 0.845,
  };

  rows.forEach((check, index) => {
    const rowTop = top + index * rowHeight;
    const middle = rowTop + rowHeight / 2;
    const baseline = middle + labelSize * 0.35;
    parts.push(`<rect x="${round(pad)}" y="${round(rowTop)}" width="${round(inner)}" height="${round(Math.max(1, unit))}" fill="${palette.line}"/>`);
    text(columns.label, baseline, fit(check.label, columns.value - columns.label - 12 * unit, labelSize), labelSize, { weight: 700 });
    text(columns.value, baseline, fit(check.valueText, columns.bar - columns.value - 16 * unit, valueSize, 0.61), valueSize, {
      family: MONO,
      fill: palette.muted,
    });

    const barWidth = columns.barEnd - columns.bar;
    const thick = Math.max(6, 10 * unit);
    const at = (position: number): number => columns.bar + barWidth * position;
    parts.push(
      `<rect x="${round(at(check.bar.spreadStart))}" y="${round(middle - thick / 2)}" width="${round(Math.max(thick, at(check.bar.spreadEnd) - at(check.bar.spreadStart)))}" height="${round(thick)}" rx="${round(thick / 2)}" fill="${palette.raised}" stroke="${palette.line}" stroke-width="${round(unit)}"/>`,
      `<rect x="${round(at(check.bar.bandStart))}" y="${round(middle - thick / 2)}" width="${round(Math.max(thick, at(check.bar.bandEnd) - at(check.bar.bandStart)))}" height="${round(thick)}" rx="${round(thick / 2)}" fill="${palette.raised}" stroke="${palette.lineStrong}" stroke-width="${round(1.5 * unit)}"/>`,
      `<circle cx="${round(at(check.bar.marker))}" cy="${round(middle)}" r="${round(thick * 0.8)}" fill="${palette[check.verdict]}" stroke="${palette.surface}" stroke-width="${round(2 * unit)}"/>`,
    );

    parts.push(icon(VERDICT_ICON[check.verdict], columns.verdict, middle - labelSize * 0.5, labelSize, palette[check.verdict]));
    text(columns.verdict + labelSize * 1.35, baseline, VERDICT_WORD[check.verdict], labelSize * 0.9, {
      fill: palette[check.verdict],
      weight: 700,
    });
  });

  if (left > 0) {
    const rowTop = top + rows.length * rowHeight;
    parts.push(`<rect x="${round(pad)}" y="${round(rowTop)}" width="${round(inner)}" height="${round(Math.max(1, unit))}" fill="${palette.line}"/>`);
    const allFine = report.checks.filter((check) => !rows.includes(check)).every((check) => check.verdict === 'plausible');
    text(pad, rowTop + rowHeight / 2 + labelSize * 0.35, `and ${left} more${allFine ? ', all plausible' : ''}`, labelSize, { fill: palette.muted });
  }

  const description = describeNation(nation, report);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img" aria-labelledby="card-title card-desc">`,
    `<title id="card-title">${escape(`${titleOf(nation)}: plausibility check`)}</title>`,
    `<desc id="card-desc">${escape(description)}</desc>`,
    ...parts,
    '</svg>',
  ].join('');
}

/**
 * A small picture of what the tool does, for the site's sharing image: a handful of checks,
 * each a name, a range bar and its verdict's icon. Drawn from a real report, so it shows real bars.
 */
export function sampleArt(report: Report, palette: CardPalette = cardPalette('dark'), count = 6): string {
  const width = 416;
  const row = 84;
  const pad = 28;
  const checks = cardRows(report.checks, count + 1).rows.slice(0, count);
  const height = pad * 2 + row * checks.length;
  const parts: string[] = [`<rect width="${width}" height="${height}" rx="12" fill="${palette.raised}"/>`];
  checks.forEach((check, index) => {
    const top = pad + index * row;
    const barY = top + 52;
    const barStart = pad;
    const barWidth = width - pad * 2 - 56;
    const at = (position: number): number => round(barStart + barWidth * position);
    parts.push(
      `<text x="${pad}" y="${top + 26}" font-family="${SANS}" font-size="24" font-weight="700" fill="${palette.ink}">${escape(fit(check.label, barWidth, 24))}</text>`,
      `<rect x="${at(check.bar.spreadStart)}" y="${barY - 6}" width="${round(Math.max(12, at(check.bar.spreadEnd) - at(check.bar.spreadStart)))}" height="12" rx="6" fill="${palette.surface}"/>`,
      `<rect x="${at(check.bar.bandStart)}" y="${barY - 7}" width="${round(Math.max(14, at(check.bar.bandEnd) - at(check.bar.bandStart)))}" height="14" rx="7" fill="${palette.surface}" stroke="${palette.lineStrong}" stroke-width="2"/>`,
      `<circle cx="${at(check.bar.marker)}" cy="${barY}" r="11" fill="${palette[check.verdict]}" stroke="${palette.raised}" stroke-width="3"/>`,
      icon(VERDICT_ICON[check.verdict], width - pad - 36, barY - 18, 36, palette[check.verdict]),
    );
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true">${parts.join('')}</svg>`;
}
