// Ranges: for a metric and a group of real countries, where those countries
// sit. The typical band is the middle 90% of them; the full spread runs from
// the lowest to the highest.
//
// Groups: some numbers depend on how rich or how big a country is, so a
// nation is compared with its peers. Real countries are split into four
// equal quarters by GDP per person, by population or by land area, and a
// nation is compared with the quarter it would fall in.

import { SNAPSHOT, valueOf, type Country, type Metric, type Snapshot } from './snapshot';

/** What a group of peers is sorted by. */
export type Dimension = 'all' | 'income' | 'population' | 'area';
export type Quarter = 1 | 2 | 3 | 4;

export interface Group {
  dimension: Dimension;
  /** Which quarter, lowest first. Absent for 'all'. */
  quarter?: Quarter;
}

export const ALL: Group = { dimension: 'all' };

/** The snapshot metric each dimension is cut by. */
export const DIMENSION_METRIC: { readonly [K in Exclude<Dimension, 'all'>]: Metric } = {
  income: 'gdpPerPerson',
  population: 'population',
  area: 'area',
};

/** The typical band is the middle 90%: from the 5th to the 95th percentile. */
export const BAND_LOW = 0.05;
export const BAND_HIGH = 0.95;

/** A group with fewer countries than this is too thin to judge by; every country is used instead. */
export const MIN_PEERS = 20;

export interface Reference {
  country: Country;
  value: number;
}

export interface Range {
  metric: Metric;
  /** The group the range was asked for. */
  asked: Group;
  /** The group it was made from: `asked`, or every country when `asked` was too thin. */
  group: Group;
  /** How many countries it rests on. */
  n: number;
  /** The full spread. */
  min: number;
  max: number;
  /** The typical band. */
  low: number;
  high: number;
  median: number;
  lowest: Reference;
  highest: Reference;
  /** Every country in the group with a value, lowest first. */
  references: Reference[];
}

/** A percentile of sorted numbers, with straight-line interpolation between neighbours. */
export function quantile(sorted: readonly number[], fraction: number): number {
  if (sorted.length === 0) return NaN;
  const position = (sorted.length - 1) * Math.min(1, Math.max(0, fraction));
  const below = Math.floor(position);
  const above = Math.min(sorted.length - 1, below + 1);
  const first = sorted[below] ?? NaN;
  const second = sorted[above] ?? NaN;
  return first + (second - first) * (position - below);
}

export interface Ranges {
  /** The three values that split real countries into four quarters by a dimension. */
  cuts(dimension: Exclude<Dimension, 'all'>): readonly [number, number, number];
  /** The quarter a value falls in. A value on a cut belongs to the quarter above it. */
  quarterFor(dimension: Exclude<Dimension, 'all'>, value: number): Quarter;
  /** The group a nation with this value belongs to. Without a value, every country. */
  groupFor(dimension: Dimension, value: number | undefined): Group;
  /** The countries of a group. */
  members(group: Group): Country[];
  /**
   * Where a group's countries sit for a metric. `positiveOnly` leaves out
   * zeros, for metrics shown on a logarithmic scale.
   */
  rangeFor(metric: Metric, group: Group, positiveOnly?: boolean): Range | undefined;
}

/** Ranges over a snapshot. The site uses the one in the repo; tests can pass a small one of their own. */
export function createRanges(snapshot: Snapshot): Ranges {
  const cutCache = new Map<string, readonly [number, number, number]>();
  const rangeCache = new Map<string, Range | undefined>();

  function cuts(dimension: Exclude<Dimension, 'all'>): readonly [number, number, number] {
    const cached = cutCache.get(dimension);
    if (cached) return cached;
    const metric = DIMENSION_METRIC[dimension];
    const values = snapshot.countries
      .map((country) => valueOf(country, metric))
      .filter((value): value is number => value !== undefined)
      .sort((a, b) => a - b);
    const result = [quantile(values, 0.25), quantile(values, 0.5), quantile(values, 0.75)] as const;
    cutCache.set(dimension, result);
    return result;
  }

  function quarterFor(dimension: Exclude<Dimension, 'all'>, value: number): Quarter {
    const [first, second, third] = cuts(dimension);
    if (value < first) return 1;
    if (value < second) return 2;
    if (value < third) return 3;
    return 4;
  }

  function groupFor(dimension: Dimension, value: number | undefined): Group {
    if (dimension === 'all' || value === undefined || !Number.isFinite(value)) return ALL;
    return { dimension, quarter: quarterFor(dimension, value) };
  }

  function members(group: Group): Country[] {
    const { dimension, quarter } = group;
    if (dimension === 'all' || quarter === undefined) return snapshot.countries;
    const metric = DIMENSION_METRIC[dimension];
    return snapshot.countries.filter((country) => {
      const value = valueOf(country, metric);
      return value !== undefined && quarterFor(dimension, value) === quarter;
    });
  }

  function build(metric: Metric, asked: Group, group: Group, positiveOnly: boolean): Range | undefined {
    const references = members(group)
      .map((country) => ({ country, value: valueOf(country, metric) }))
      .filter((entry): entry is Reference => entry.value !== undefined && (!positiveOnly || entry.value > 0))
      .sort((a, b) => a.value - b.value || a.country.iso3.localeCompare(b.country.iso3));
    const lowest = references[0];
    const highest = references[references.length - 1];
    if (!lowest || !highest) return undefined;
    const values = references.map((entry) => entry.value);
    return {
      metric,
      asked,
      group,
      n: references.length,
      min: lowest.value,
      max: highest.value,
      low: quantile(values, BAND_LOW),
      high: quantile(values, BAND_HIGH),
      median: quantile(values, 0.5),
      lowest,
      highest,
      references,
    };
  }

  function rangeFor(metric: Metric, group: Group, positiveOnly = false): Range | undefined {
    const key = `${metric}|${group.dimension}|${group.quarter ?? 0}|${positiveOnly ? 1 : 0}`;
    if (rangeCache.has(key)) return rangeCache.get(key);
    let range = build(metric, group, group, positiveOnly);
    if (group.dimension !== 'all' && (!range || range.n < MIN_PEERS)) {
      range = build(metric, group, ALL, positiveOnly);
    }
    rangeCache.set(key, range);
    return range;
  }

  return { cuts, quarterFor, groupFor, members, rangeFor };
}

/** Ranges over the snapshot in the repo. */
export const RANGES: Ranges = createRanges(SNAPSHOT);
