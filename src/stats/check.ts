// The checks: one pure function from a nation's numbers to a list of
// verdicts, each with its value, where it sits among real countries, and one
// sentence of why.
//
// The rule, the same for every check:
//   Plausible  inside the typical band (the middle 90% of comparable real countries)
//   Stretch    outside the band, but no further out than a real country
//   Unlikely   beyond every comparable real country, or impossible
//
// Real countries are named for scale only. No sentence here judges one.

import { derive, type Derived } from './derive';
import { dollars, fixed, inWords, list, percent, plain } from './format';
import type { Inputs } from './model';
import { estimatePyramid, type Pyramid } from './pyramid';
import { ALL, RANGES, type Dimension, type Group, type Range, type Ranges, type Reference } from './ranges';
import { SNAPSHOT, nameOf, valueOf, type Country, type Metric } from './snapshot';

export type Verdict = 'plausible' | 'stretch' | 'unlikely';

export const VERDICTS: readonly Verdict[] = ['plausible', 'stretch', 'unlikely'];

/** The verdict as the page writes it. Always shown with its icon, never as colour alone. */
export const VERDICT_WORD: { readonly [K in Verdict]: string } = {
  plausible: 'Plausible',
  stretch: 'Stretch',
  unlikely: 'Unlikely',
};

/** What each verdict means, in one line. */
export const VERDICT_MEANING: { readonly [K in Verdict]: string } = {
  plausible: 'Inside the range where nine in ten comparable real countries sit.',
  stretch: 'Outside that range, but at least one real country is out there too. It needs a reason.',
  unlikely: 'Beyond every comparable real country today, or not possible at all.',
};

/** Which side of the typical band a value is on. */
export type Side = 'inside' | 'low' | 'high';

/** How a bar is scaled: evenly, by powers of ten, or by square root (for numbers that bunch near zero). */
export type Scale = 'linear' | 'log' | 'root';

export type CheckId =
  | 'density'
  | 'gdpPerPerson'
  | 'gdpPppPerPerson'
  | 'priceLevel'
  | 'growth'
  | 'lifeExpectancy'
  | 'fertility'
  | 'urbanShare'
  | 'capitalShare'
  | 'militaryPer1000'
  | 'militarySpending'
  | 'spendingPerSoldier'
  | 'governmentSpending';

export interface CheckSpec {
  id: CheckId;
  label: string;
  /** What the number is, in one line. */
  what: string;
  /** The snapshot metric real countries are read from. */
  metric: Metric;
  /** Which peers the nation is compared with. */
  dimension: Dimension;
  scale: Scale;
  /** 'high' for checks where only a high value can be out of line. */
  sides: 'both' | 'high';
  /** The nation's value, or nothing when the inputs it needs are missing. */
  value(inputs: Inputs, derived: Derived): number | undefined;
  /** The value with its unit: "94 per km²". */
  format(value: number): string;
  /** The value alone, for the first half of a range: "6.7". */
  number(value: number): string;
  /** A reason the numbers can't be true together, if there is one. */
  impossible?(inputs: Inputs, derived: Derived): string | undefined;
  /** For one-sided checks: what to say about a value below every real country. */
  belowNote?: string;
  /** A caveat about the real-world figures, shown with the check. */
  note?: string;
}

const oneDecimal = (value: number): string => fixed(value, 1);

/** Every check, in the order the page shows them. */
export const CHECKS: readonly CheckSpec[] = [
  {
    id: 'density',
    label: 'Population density',
    what: 'People for every square kilometre of land.',
    metric: 'density',
    dimension: 'area',
    scale: 'log',
    sides: 'both',
    value: (_inputs, derived) => derived.density,
    format: (value) => `${plain(value, 3)} per km²`,
    number: (value) => plain(value, 3),
  },
  {
    id: 'gdpPerPerson',
    label: 'GDP per person',
    what: 'Nominal GDP shared out among everyone, in US dollars.',
    metric: 'gdpPerPerson',
    dimension: 'all',
    scale: 'log',
    sides: 'both',
    value: (_inputs, derived) => derived.gdpPerPerson,
    format: (value) => dollars(value),
    number: (value) => dollars(value),
  },
  {
    id: 'gdpPppPerPerson',
    label: 'GDP per person, PPP',
    what: 'GDP at purchasing power parity shared out among everyone, in international dollars.',
    metric: 'gdpPppPerPerson',
    dimension: 'all',
    scale: 'log',
    sides: 'both',
    value: (_inputs, derived) => derived.gdpPppPerPerson,
    format: (value) => `${dollars(value)} at PPP`,
    number: (value) => dollars(value),
  },
  {
    id: 'priceLevel',
    label: 'Price level',
    what: 'Nominal GDP against PPP GDP: how prices compare with the United States, where the United States is 100%.',
    metric: 'priceLevel',
    dimension: 'income',
    scale: 'linear',
    sides: 'both',
    value: (_inputs, derived) => derived.priceLevel,
    format: (value) => `${percent(value)} of US prices`,
    number: (value) => plain(value, 2),
  },
  {
    id: 'growth',
    label: 'GDP growth',
    what: 'Real GDP growth in an average year, after inflation.',
    metric: 'growth',
    dimension: 'income',
    scale: 'linear',
    sides: 'both',
    value: (inputs) => inputs.growth,
    format: (value) => `${percent(value)} a year`,
    number: (value) => percent(value).replace('%', ''),
    note: 'Real figures are ten-year averages, so one boom or one bad year doesn’t set the range.',
  },
  {
    id: 'lifeExpectancy',
    label: 'Life expectancy',
    what: 'How long a newborn would live at today’s death rates, in years.',
    metric: 'lifeExpectancy',
    dimension: 'income',
    scale: 'linear',
    sides: 'both',
    value: (inputs) => inputs.lifeExpectancy,
    format: (value) => `${oneDecimal(value)} years`,
    number: oneDecimal,
  },
  {
    id: 'fertility',
    label: 'Fertility rate',
    what: 'Children born to an average woman over her life.',
    metric: 'fertility',
    dimension: 'income',
    scale: 'linear',
    sides: 'both',
    value: (inputs) => inputs.fertility,
    format: (value) => `${fixed(value, 2)} births per woman`,
    number: (value) => fixed(value, 2),
  },
  {
    id: 'urbanShare',
    label: 'Urban share',
    what: 'The share of people living in towns and cities.',
    metric: 'urbanShare',
    dimension: 'income',
    scale: 'linear',
    sides: 'both',
    value: (inputs) => inputs.urbanShare,
    format: (value) => `${percent(value)} of people`,
    number: (value) => percent(value).replace('%', ''),
  },
  {
    id: 'capitalShare',
    label: 'Capital share',
    what: 'The share of everyone who lives in the capital.',
    metric: 'largestCityShare',
    dimension: 'population',
    scale: 'root',
    sides: 'high',
    value: (_inputs, derived) => derived.capitalShare,
    format: (value) => `${percent(value)} of people`,
    number: (value) => percent(value).replace('%', ''),
    impossible: (inputs, derived) => {
      if (derived.capitalShare !== undefined && derived.capitalShare > 100) {
        return 'More people in the capital than in the whole country.';
      }
      if (derived.capitalShareOfUrban !== undefined && derived.capitalShareOfUrban > 100) {
        return `More people in the capital than in all towns and cities together (${percent(inputs.urbanShare ?? 0)} of people are urban).`;
      }
      return undefined;
    },
    belowNote: 'A small capital for the country, which happens: not every capital is its country’s largest city.',
    note: 'Real figures are for each country’s largest city, which is the capital in most countries.',
  },
  {
    id: 'militaryPer1000',
    label: 'Military',
    what: 'Active military personnel for every 1,000 people.',
    metric: 'militaryPer1000',
    dimension: 'all',
    scale: 'root',
    sides: 'both',
    value: (_inputs, derived) => derived.militaryPer1000,
    format: (value) => `${plain(value, 2)} per 1,000 people`,
    number: (value) => plain(value, 2),
    impossible: (_inputs, derived) =>
      derived.militaryPer1000 !== undefined && derived.militaryPer1000 > 1000
        ? 'More soldiers than people.'
        : undefined,
    note: 'Real figures count paramilitary forces too, so they run a little high.',
  },
  {
    id: 'militarySpending',
    label: 'Military spending',
    what: 'A year of military spending as a share of GDP.',
    metric: 'militarySpending',
    dimension: 'all',
    scale: 'root',
    sides: 'both',
    value: (inputs) => inputs.militarySpending,
    format: (value) => `${percent(value)} of GDP`,
    number: (value) => percent(value).replace('%', ''),
    impossible: (inputs) =>
      inputs.militarySpending !== undefined &&
      inputs.governmentSpending !== undefined &&
      inputs.militarySpending > inputs.governmentSpending
        ? `The military spends more than the whole government (${percent(inputs.governmentSpending)} of GDP).`
        : undefined,
  },
  {
    id: 'spendingPerSoldier',
    label: 'Spending per soldier',
    what: 'A year of military spending for each active soldier, in US dollars.',
    metric: 'spendingPerSoldier',
    dimension: 'income',
    scale: 'log',
    sides: 'both',
    value: (_inputs, derived) => derived.spendingPerSoldier,
    format: (value) => `${dollars(value)} per soldier`,
    number: (value) => dollars(value),
  },
  {
    id: 'governmentSpending',
    label: 'Government spending',
    what: 'A year of government spending as a share of GDP.',
    metric: 'governmentSpending',
    dimension: 'income',
    scale: 'linear',
    sides: 'both',
    value: (inputs) => inputs.governmentSpending,
    format: (value) => `${percent(value)} of GDP`,
    number: (value) => percent(value).replace('%', ''),
    note: 'Real figures count central government only for most countries, so federal countries look smaller than they are.',
  },
];

const SPECS = new Map<CheckId, CheckSpec>(CHECKS.map((spec) => [spec.id, spec]));

export function checkSpec(id: CheckId): CheckSpec {
  const spec = SPECS.get(id);
  if (!spec) throw new Error(`No such check: ${id}`);
  return spec;
}

/** The verdict for a value against a range. The edges of the band and of the spread count as inside. */
export function judge(value: number, range: Range, sides: 'both' | 'high' = 'both'): { verdict: Verdict; side: Side } {
  if (value > range.max) return { verdict: 'unlikely', side: 'high' };
  if (value > range.high) return { verdict: 'stretch', side: 'high' };
  if (value < range.low) {
    if (sides === 'high') return { verdict: 'plausible', side: 'low' };
    return { verdict: value < range.min ? 'unlikely' : 'stretch', side: 'low' };
  }
  return { verdict: 'plausible', side: 'inside' };
}

/** Where things sit on a range bar, each from 0 (left) to 1 (right). */
export interface Bar {
  marker: number;
  bandStart: number;
  bandEnd: number;
  /** Where the track of the real spread starts and ends. 0 or 1 when it runs off the bar (see `clipped`). */
  spreadStart: number;
  spreadEnd: number;
  /** Set when the value is beyond every real country on that side; the marker is then pinned to that end. */
  beyond: 'low' | 'high' | null;
  /** True on a side where the real spread runs on past the end of the bar. */
  clipped: { low: boolean; high: boolean };
}

/** The room left at each end of a bar, so a marker past the end of the spread is still on the bar. */
const BAR_MARGIN = 0.06;
/**
 * How far past the typical band a bar reaches, in band widths. One far-out country (a war, an
 * oil boom) would otherwise squeeze the band into a sliver; the track then runs off the bar instead.
 */
const BAR_REACH = 2;

function onScale(scale: Scale, value: number, floor: number): number {
  if (scale === 'log') return Math.log(Math.max(value, floor));
  if (scale === 'root') return Math.sqrt(Math.max(value, 0));
  return value;
}

export function barFor(value: number, range: Range, scale: Scale): Bar {
  // On a logarithmic bar nothing can sit at or below zero; such a value is pinned to the left end.
  const floor = range.min > 0 ? range.min / 1e6 : Number.MIN_VALUE;
  const at = (x: number): number => onScale(scale, x, floor);
  const reach = (at(range.high) - at(range.low)) * BAR_REACH;
  const clipped = {
    low: reach > 0 && at(range.min) < at(range.low) - reach,
    high: reach > 0 && at(range.max) > at(range.high) + reach,
  };
  const start = clipped.low ? at(range.low) - reach : at(range.min);
  const end = clipped.high ? at(range.high) + reach : at(range.max);
  const span = end - start;
  const place = (x: number): number => {
    const fraction = span > 0 ? (at(x) - start) / span : 0.5;
    const position = BAR_MARGIN + (1 - 2 * BAR_MARGIN) * fraction;
    return Math.round(Math.min(1, Math.max(0, position)) * 10000) / 10000;
  };
  return {
    marker: place(value),
    bandStart: place(range.low),
    bandEnd: place(range.high),
    spreadStart: clipped.low ? 0 : place(range.min),
    spreadEnd: clipped.high ? 1 : place(range.max),
    beyond: value > range.max ? 'high' : value < range.min ? 'low' : null,
    clipped,
  };
}

export interface NamedValue {
  /** The country's name as it reads in a sentence. */
  name: string;
  value: number;
  valueText: string;
}

export interface Check {
  id: CheckId;
  label: string;
  what: string;
  value: number;
  /** The value with its unit: "94 per km²". */
  valueText: string;
  verdict: Verdict;
  /** "Plausible", "Stretch" or "Unlikely". */
  verdictWord: string;
  side: Side;
  /** True when the numbers can't be true together, whatever real countries do. */
  impossible: boolean;
  /** One sentence of why, with a real country for scale. */
  reason: string;
  /** The peers the value was compared with. */
  group: Group;
  /** "real countries", "countries of similar income" and so on. */
  groupLabel: string;
  /** How many real countries the comparison rests on. */
  peers: number;
  /** The typical band. */
  typical: { low: number; high: number; text: string };
  /** The full spread, with the countries at each end. */
  spread: { lowest: NamedValue; highest: NamedValue };
  bar: Bar;
  note?: string;
}

/** A line of scale for a raw size: no verdict, only a real country to picture it by. */
export interface ScaleLine {
  id: 'population' | 'area' | 'gdp' | 'gdpPpp';
  label: string;
  value: number;
  valueText: string;
  comparison: string;
}

export interface Counts {
  plausible: number;
  stretch: number;
  unlikely: number;
}

export interface Report {
  checks: Check[];
  scale: ScaleLine[];
  counts: Counts;
  /** "4 plausible, 1 stretch, 1 unlikely". */
  summary: string;
  /** The estimated pyramid, when fertility and life expectancy were both given. */
  pyramid?: Pyramid;
  /** True for a population of exactly 1: the page answers "A nation of one. Bold." */
  nationOfOne: boolean;
  /** The day the real-world numbers were gathered, as YYYY-MM-DD. */
  snapshotDate: string;
}

/** The words for a group of peers. */
export function groupWords(group: Group): { plural: string; one: string; any: string } {
  switch (group.dimension) {
    case 'income':
      return {
        plural: 'countries of similar income',
        one: 'a country of similar income',
        any: 'any country of similar income',
      };
    case 'population':
      return {
        plural: 'countries of similar population',
        one: 'a country of similar population',
        any: 'any country of similar population',
      };
    case 'area':
      return {
        plural: 'countries of similar area',
        one: 'a country of similar area',
        any: 'any country of similar area',
      };
    default:
      return { plural: 'real countries', one: 'a real country', any: 'any real country' };
  }
}

function populationOf(country: Country): number {
  return valueOf(country, 'population') ?? 0;
}

/** Of a few candidates, the one most people could picture: the most populous. */
function familiar(references: readonly Reference[]): Reference | undefined {
  let best: Reference | undefined;
  for (const reference of references) {
    if (!best || populationOf(reference.country) > populationOf(best.country)) best = reference;
  }
  return best;
}

function closeEnough(scale: Scale, value: number, other: number, range: Range): boolean {
  if (scale === 'log') return value > 0 && other > 0 && Math.abs(Math.log(value / other)) <= Math.log(1.05);
  return Math.abs(value - other) <= (range.high - range.low) * 0.04;
}

/** "About the same as Spain." or "Between Greece and Spain.", from the countries nearest the value. */
function nearest(value: number, range: Range, scale: Scale): string | undefined {
  const same = familiar(range.references.filter((reference) => closeEnough(scale, value, reference.value, range)));
  if (same) return `About the same as ${nameOf(same.country)}.`;
  const below = familiar(range.references.filter((reference) => reference.value < value).slice(-3));
  const above = familiar(range.references.filter((reference) => reference.value > value).slice(0, 3));
  if (below && above) return `Between ${nameOf(below.country)} and ${nameOf(above.country)}.`;
  return undefined;
}

function beyondTail(value: number, range: Range, side: 'low' | 'high'): string {
  const word = side === 'high' ? 'higher' : 'lower';
  const beyond = range.references.filter((reference) => (side === 'high' ? reference.value > value : reference.value < value));
  if (beyond.length === 0) {
    const edge = side === 'high' ? range.highest : range.lowest;
    return `only ${nameOf(edge.country)} matches it`;
  }
  if (beyond.length <= 2) {
    const names = beyond.map((reference) => nameOf(reference.country));
    return `only ${list(names)} ${beyond.length === 1 ? 'is' : 'are'} ${word}`;
  }
  const known = [...beyond].sort((a, b) => populationOf(b.country) - populationOf(a.country)).slice(0, 2);
  return `${beyond.length} are ${word}, among them ${list(known.map((reference) => nameOf(reference.country)))}`;
}

function typicalText(spec: CheckSpec, range: Range): string {
  if (spec.sides === 'high') return `up to ${spec.format(range.high)}`;
  return `${spec.number(range.low)} to ${spec.format(range.high)}`;
}

function reasonFor(spec: CheckSpec, value: number, range: Range, verdict: Verdict, side: Side): string {
  const words = groupWords(range.group);
  if (verdict === 'unlikely') {
    const edge = side === 'high' ? range.highest : range.lowest;
    return `${side === 'high' ? 'Higher' : 'Lower'} than ${words.any}: the ${side === 'high' ? 'highest' : 'lowest'} is ${nameOf(edge.country)}, at ${spec.format(edge.value)}.`;
  }
  if (verdict === 'stretch' && side !== 'inside') {
    return `${side === 'high' ? 'High' : 'Low'} for ${words.one}: ${typicalText(spec, range)} is typical, and ${beyondTail(value, range, side)}.`;
  }
  if (value < range.min && spec.belowNote) return spec.belowNote;
  return nearest(value, range, spec.scale) ?? `Inside the typical range for ${words.plural}: ${typicalText(spec, range)}.`;
}

function named(spec: CheckSpec, reference: Reference): NamedValue {
  return { name: nameOf(reference.country), value: reference.value, valueText: spec.format(reference.value) };
}

/** The value that decides which peers a check uses. */
function groupValue(dimension: Dimension, inputs: Inputs, derived: Derived): number | undefined {
  if (dimension === 'income') return derived.gdpPerPerson;
  if (dimension === 'population') return inputs.population !== undefined && inputs.population > 0 ? inputs.population : undefined;
  if (dimension === 'area') return inputs.area !== undefined && inputs.area > 0 ? inputs.area : undefined;
  return undefined;
}

/** One check for a nation, or nothing when the numbers it needs weren't given. */
export function runCheck(spec: CheckSpec, inputs: Inputs, derived: Derived, ranges: Ranges = RANGES): Check | undefined {
  const value = spec.value(inputs, derived);
  if (value === undefined || !Number.isFinite(value)) return undefined;
  const asked = ranges.groupFor(spec.dimension, groupValue(spec.dimension, inputs, derived));
  const range = ranges.rangeFor(spec.metric, asked, spec.scale === 'log') ?? ranges.rangeFor(spec.metric, ALL, spec.scale === 'log');
  if (!range) return undefined;

  const impossible = spec.impossible?.(inputs, derived);
  const judged = judge(value, range, spec.sides);
  const verdict: Verdict = impossible ? 'unlikely' : judged.verdict;
  const side: Side = impossible && judged.side === 'inside' ? 'high' : judged.side;

  const check: Check = {
    id: spec.id,
    label: spec.label,
    what: spec.what,
    value,
    valueText: spec.format(value),
    verdict,
    verdictWord: VERDICT_WORD[verdict],
    side,
    impossible: impossible !== undefined,
    reason: impossible ?? reasonFor(spec, value, range, judged.verdict, judged.side),
    group: range.group,
    groupLabel: groupWords(range.group).plural,
    peers: range.n,
    typical: { low: range.low, high: range.high, text: typicalText(spec, range) },
    spread: { lowest: named(spec, range.lowest), highest: named(spec, range.highest) },
    bar: barFor(value, range, spec.scale),
  };
  if (spec.note) check.note = spec.note;
  return check;
}

interface ScaleSpec {
  id: ScaleLine['id'];
  label: string;
  metric: Metric;
  format(value: number): string;
  more: string;
  less: string;
  most: string;
  least: string;
}

const SCALES: readonly ScaleSpec[] = [
  {
    id: 'population',
    label: 'Population',
    metric: 'population',
    format: (value) => `${inWords(value)} people`,
    more: 'More people',
    less: 'Fewer people',
    most: 'most populous',
    least: 'least populous',
  },
  {
    id: 'area',
    label: 'Area',
    metric: 'area',
    format: (value) => `${inWords(value)} km²`,
    more: 'Larger',
    less: 'Smaller',
    most: 'largest',
    least: 'smallest',
  },
  {
    id: 'gdp',
    label: 'GDP, nominal',
    metric: 'gdp',
    format: (value) => dollars(value),
    more: 'A larger economy',
    less: 'A smaller economy',
    most: 'largest',
    least: 'smallest',
  },
  {
    id: 'gdpPpp',
    label: 'GDP, PPP',
    metric: 'gdpPpp',
    format: (value) => `${dollars(value)} at PPP`,
    more: 'A larger economy',
    less: 'A smaller economy',
    most: 'largest',
    least: 'smallest',
  },
];

/** The raw sizes, each with a real country to picture it by. Sizes get no verdict: big or small is a choice. */
export function scaleLines(inputs: Inputs, ranges: Ranges = RANGES): ScaleLine[] {
  const lines: ScaleLine[] = [];
  for (const spec of SCALES) {
    const value = inputs[spec.id];
    if (value === undefined) continue;
    const range = ranges.rangeFor(spec.metric, ALL, true);
    if (!range) continue;
    let comparison: string;
    if (value > range.max) {
      comparison = `${spec.more} than any real country: the ${spec.most} is ${nameOf(range.highest.country)}, at ${spec.format(range.max)}.`;
    } else if (value < range.min) {
      comparison = `${spec.less} than any real country: the ${spec.least} is ${nameOf(range.lowest.country)}, at ${spec.format(range.min)}.`;
    } else {
      comparison = nearest(value, range, 'log') ?? `About the same as ${nameOf(range.lowest.country)}.`;
    }
    lines.push({ id: spec.id, label: spec.label, value, valueText: spec.format(value), comparison });
  }
  return lines;
}

/** "4 plausible, 1 stretch, 1 unlikely"; verdicts nobody got are left out. */
export function summaryLine(counts: Counts): string {
  const parts = VERDICTS.filter((verdict) => counts[verdict] > 0).map(
    (verdict) => `${counts[verdict]} ${VERDICT_WORD[verdict].toLowerCase()}`,
  );
  return parts.length > 0 ? parts.join(', ') : 'Nothing to check yet';
}

/** Every check a nation's numbers allow, with the summary, the scale lines and the pyramid. */
export function checkNation(inputs: Inputs, ranges: Ranges = RANGES): Report {
  const derived = derive(inputs);
  const checks = CHECKS.map((spec) => runCheck(spec, inputs, derived, ranges)).filter(
    (check): check is Check => check !== undefined,
  );
  const counts: Counts = { plausible: 0, stretch: 0, unlikely: 0 };
  for (const check of checks) counts[check.verdict]++;

  const report: Report = {
    checks,
    scale: scaleLines(inputs, ranges),
    counts,
    summary: summaryLine(counts),
    nationOfOne: inputs.population === 1,
    snapshotDate: SNAPSHOT.date,
  };
  const pyramid = estimatePyramid(inputs.fertility, inputs.lifeExpectancy);
  if (pyramid) report.pyramid = pyramid;
  return report;
}
