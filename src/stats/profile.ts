// The Eurth profile: one JSON file that carries a nation from tool to tool.
// Stats owns the "stats" section and nothing else. This module turns a nation
// into that section and back; reading, checking and saving the file itself is
// @eurth/profile's job, on the site.
//
// The section's first six fields are the ones the profile schema drafted.
// The rest are Stats' own, which the schema allows as extra keys.

import type { Report } from './check';
import { cleanName, cleanValue, type InputKey, type Inputs, type Nation } from './model';

/** The field in the profile's stats section for each input. */
export const PROFILE_FIELDS: { readonly [K in InputKey]: string } = {
  population: 'population',
  area: 'areaKm2',
  gdp: 'gdpUsd',
  gdpPpp: 'gdpPppUsd',
  growth: 'gdpGrowth',
  lifeExpectancy: 'lifeExpectancy',
  fertility: 'fertilityRate',
  urbanShare: 'urbanShare',
  capitalPopulation: 'capitalPopulation',
  military: 'activeMilitary',
  militarySpending: 'militarySpendingShare',
  governmentSpending: 'governmentSpendingShare',
};

/** The fields Stats adds beyond the schema's draft, for Foundations to document. */
export const EXTRA_FIELDS = [
  'gdpPppUsd',
  'fertilityRate',
  'urbanShare',
  'capitalPopulation',
  'militarySpendingShare',
  'governmentSpendingShare',
  'snapshot',
] as const;

const SUMMARY_MAX = 600;
const LINK_MAX = 4000;

/** The stats section as Stats writes it. */
export interface StatsSection {
  link?: string;
  summary?: string;
  updated: string;
  /** The date of the real-world snapshot the nation was last checked against, as YYYY-MM-DD. */
  snapshot: string;
  population?: number;
  areaKm2?: number;
  gdpUsd?: number;
  gdpPppUsd?: number;
  gdpGrowth?: number;
  lifeExpectancy?: number;
  fertilityRate?: number;
  urbanShare?: number;
  capitalPopulation?: number;
  activeMilitary?: number;
  militarySpendingShare?: number;
  governmentSpendingShare?: number;
}

type Loose = Record<string, unknown>;

function isObject(value: unknown): value is Loose {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function own(object: Loose, key: string): unknown {
  return Object.prototype.hasOwnProperty.call(object, key) ? object[key] : undefined;
}

/** One line for tools that only show a line: what was checked and how it came out. */
export function summarise(nation: Nation, report: Report): string {
  const name = cleanName(nation.name);
  const who = name === '' ? 'This nation' : name;
  const total = report.checks.length;
  let text: string;
  if (total === 0) {
    text = `${who} has numbers on file, but too few to check yet.`;
  } else if (report.counts.stretch === 0 && report.counts.unlikely === 0) {
    text = `${who}: ${total === 1 ? 'the one number checked is' : `all ${total} numbers checked are`} within real-world ranges.`;
  } else {
    const stand = report.checks.filter((check) => check.verdict !== 'plausible').map((check) => check.label.toLowerCase());
    text = `${who}: ${report.summary} against real-world ranges. Standing out: ${stand.join(', ')}.`;
  }
  return text.length > SUMMARY_MAX ? `${text.slice(0, SUMMARY_MAX - 1)}…` : text;
}

/**
 * The stats section for a nation. `now` is the moment of saving and `link`
 * the nation's share link; a link that isn't https, or is too long for the
 * profile, is left out.
 */
export function toStatsSection(nation: Nation, report: Report, now: Date, link?: string): StatsSection {
  const section: StatsSection = {
    summary: summarise(nation, report),
    updated: now.toISOString().replace(/\.\d{3}Z$/, 'Z'),
    snapshot: report.snapshotDate,
  };
  if (link !== undefined && /^https:\/\/[!-~]+$/.test(link) && link.length <= LINK_MAX) section.link = link;
  const fields = section as unknown as Loose;
  for (const key of Object.keys(PROFILE_FIELDS) as InputKey[]) {
    const value = nation.inputs[key];
    if (value === undefined) continue;
    const clean = cleanValue(key, value);
    if (clean !== undefined) fields[PROFILE_FIELDS[key]] = clean;
  }
  return section;
}

/**
 * A profile with its stats section replaced by `section`. Every other
 * section, and every key Stats doesn't know (inside its own section too), is
 * carried over untouched. Numbers the nation no longer has are removed.
 * On the site, @eurth/profile's setSection does the writing; this is the same
 * rule in plain code, so it can be tested here.
 */
export function withStatsSection(profile: unknown, section: StatsSection): Loose {
  const base: Loose = isObject(profile) ? { ...profile } : {};
  const before = own(base, 'stats');
  const kept: Loose = isObject(before) ? { ...before } : {};
  for (const field of [...Object.values(PROFILE_FIELDS), 'link', 'summary', 'updated', 'snapshot']) delete kept[field];
  base.stats = { ...kept, ...section };
  return base;
}

/** What Stats takes from Governmint's section. */
export interface GovernmentRead {
  form?: string;
  summary?: string;
  link?: string;
  /**
   * Defence as a share of all government spending, in per cent, when the
   * section carries Governmint's budget (`budget.defence`). It doesn't yet.
   */
  defenceShareOfBudget?: number;
}

export interface ProfileRead {
  nation: Nation;
  /** True when the profile had a stats section with at least one number. */
  found: boolean;
  /** The snapshot date the saved nation was last checked against. */
  snapshot?: string;
  /** What Governmint's section holds that Stats can use. */
  government?: GovernmentRead;
}

/** Plain text on one line, at most `max` long; nothing for anything else. */
function text(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const clean = value
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
    .trim();
  return clean === '' ? undefined : clean;
}

function readGovernment(value: unknown): GovernmentRead | undefined {
  if (!isObject(value)) return undefined;
  const result: GovernmentRead = {};
  const form = text(own(value, 'form'), 80);
  if (form !== undefined) result.form = form;
  const summary = text(own(value, 'summary'), SUMMARY_MAX);
  if (summary !== undefined) result.summary = summary;
  const link = own(value, 'link');
  if (typeof link === 'string' && /^https:\/\/[!-~]+$/.test(link) && link.length <= LINK_MAX) result.link = link;
  const budget = own(value, 'budget');
  if (isObject(budget)) {
    const defence = own(budget, 'defence');
    if (typeof defence === 'number' && Number.isFinite(defence) && defence >= 0 && defence <= 100) {
      result.defenceShareOfBudget = defence;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * The nation in a profile: its numbers from the stats section, its name from
 * identity (or meta), and what Governmint's section holds. Takes anything and
 * never throws; a file without a stats section gives an empty nation with the name.
 */
export function fromProfile(profile: unknown): ProfileRead {
  const root: Loose = isObject(profile) ? profile : {};
  const identity = own(root, 'identity');
  const meta = own(root, 'meta');
  const name =
    cleanName(isObject(identity) ? (own(identity, 'officialName') ?? own(identity, 'commonName')) : undefined) ||
    cleanName(isObject(meta) ? own(meta, 'nation') : undefined);

  const inputs: { [K in InputKey]?: number } = {};
  const stats = own(root, 'stats');
  let snapshot: string | undefined;
  if (isObject(stats)) {
    for (const key of Object.keys(PROFILE_FIELDS) as InputKey[]) {
      const value = cleanValue(key, own(stats, PROFILE_FIELDS[key]));
      if (value !== undefined) inputs[key] = value;
    }
    const saved = own(stats, 'snapshot');
    if (typeof saved === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(saved)) snapshot = saved;
  }

  const read: ProfileRead = { nation: { name, inputs }, found: Object.keys(inputs).length > 0 };
  if (snapshot !== undefined) read.snapshot = snapshot;
  const government = readGovernment(own(root, 'government'));
  if (government) read.government = government;
  return read;
}

/**
 * Military spending as a share of GDP, as Governmint's budget implies it:
 * government spending (% of GDP) times defence's share of that spending.
 * Nothing when either half is missing.
 */
export function impliedMilitarySpending(inputs: Inputs, government: GovernmentRead | undefined): number | undefined {
  const share = government?.defenceShareOfBudget;
  if (share === undefined || inputs.governmentSpending === undefined) return undefined;
  return (inputs.governmentSpending * share) / 100;
}
