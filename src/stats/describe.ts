// The result in words: for screen readers, for "Copy description" and for
// sharing. Plain text, one fact a line.

import { VERDICT_WORD, type Report } from './check';
import { fixed, percent } from './format';
import { cleanName, type Nation } from './model';
import type { Pyramid } from './pyramid';
import { dateInWords } from './snapshot';

function lowerFirst(text: string): string {
  // "GDP per person" keeps its capitals; "Population density" doesn't.
  return /^[A-Z]{2}/.test(text) ? text : text.charAt(0).toLowerCase() + text.slice(1);
}

/** What to call the nation when it has no name yet. */
export function titleOf(nation: Nation): string {
  return cleanName(nation.name) || 'This nation';
}

/** The pyramid in a sentence. */
export function describePyramid(pyramid: Pyramid): string {
  const heading =
    pyramid.shape === 'growing'
      ? 'a growing population'
      : pyramid.shape === 'shrinking'
        ? 'a shrinking population'
        : 'a steady population';
  return `Estimated age structure: ${percent(pyramid.under15)} under 15, ${percent(pyramid.workingAge)} aged 15 to 64 and ${percent(pyramid.over64)} aged 65 or over; median age ${fixed(pyramid.medianAge, 0)}; ${heading} in the long run.`;
}

/** One or two sentences: the summary, and what stands out. For sharing. */
export function shortDescription(nation: Nation, report: Report): string {
  const title = titleOf(nation);
  if (report.checks.length === 0) return `${title}: not enough numbers to check yet.`;
  const out = report.checks.filter((check) => check.verdict !== 'plausible');
  const head = `${title}, checked against real countries: ${report.summary}.`;
  if (out.length === 0) return head;
  const named = out.slice(0, 3).map((check) => `${lowerFirst(check.label)} (${check.valueText})`);
  const more = out.length > 3 ? ` and ${out.length - 3} more` : '';
  return `${head} Standing out: ${named.join(', ')}${more}.`;
}

/** The whole result, a line for each fact. */
export function describeNation(nation: Nation, report: Report): string {
  const title = titleOf(nation);
  const lines: string[] = [];
  if (report.checks.length === 0) {
    lines.push(`${title}: nothing to check yet. Enter a few more numbers.`);
  } else {
    lines.push(`${title}, checked against real countries: ${report.summary}.`);
  }
  if (report.scale.length > 0) {
    const scale = report.scale.map(
      (line) => `${lowerFirst(line.label)} ${line.valueText} (${lowerFirst(line.comparison).replace(/\.$/, '')})`,
    );
    lines.push(`For scale: ${scale.join('; ')}.`);
  }
  for (const check of report.checks) {
    lines.push(`${VERDICT_WORD[check.verdict]}: ${lowerFirst(check.label)}, ${check.valueText}. ${check.reason}`);
  }
  if (report.pyramid) lines.push(describePyramid(report.pyramid));
  if (report.checks.length > 0) {
    lines.push(`Real-world ranges from World Bank and SIPRI data, gathered ${dateInWords(report.snapshotDate)}.`);
  }
  return lines.join('\n');
}
