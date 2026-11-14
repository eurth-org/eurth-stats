// Every verdict boundary, for every check and every group of peers, tested
// against the snapshot. The expected ranges are worked out here from the raw
// JSON, without the engine's own range code, so the two must agree.

import { describe, expect, it } from 'vitest';
import raw from '../src/data/snapshot.json';
import { CHECKS, checkNation, type CheckId, type CheckSpec, type Verdict } from '../src/stats/check';
import type { Inputs } from '../src/stats/model';

type RawCountry = { iso3: string; name: string; values: Record<string, [number, number] | undefined> };
const countries = (raw as unknown as { countries: RawCountry[] }).countries;

const DIMENSION_METRIC = { income: 'gdpPerPerson', population: 'population', area: 'area' } as const;
type Cut = keyof typeof DIMENSION_METRIC;

function percentile(sorted: number[], fraction: number): number {
  const position = (sorted.length - 1) * fraction;
  const below = Math.floor(position);
  const above = Math.min(sorted.length - 1, below + 1);
  return sorted[below]! + (sorted[above]! - sorted[below]!) * (position - below);
}

function valuesOf(metric: string, from: RawCountry[]): number[] {
  return from
    .map((country) => country.values[metric]?.[0])
    .filter((value): value is number => value !== undefined)
    .sort((a, b) => a - b);
}

function cuts(dimension: Cut): [number, number, number] {
  const all = valuesOf(DIMENSION_METRIC[dimension], countries);
  return [percentile(all, 0.25), percentile(all, 0.5), percentile(all, 0.75)];
}

function quarterOf(dimension: Cut, value: number): number {
  const [a, b, c] = cuts(dimension);
  return value < a ? 1 : value < b ? 2 : value < c ? 3 : 4;
}

interface Expected {
  n: number;
  min: number;
  low: number;
  high: number;
  max: number;
  usedAll: boolean;
}

function expectedRange(spec: CheckSpec, quarter: number | undefined): Expected {
  const keep = (values: number[]) => (spec.scale === 'log' ? values.filter((value) => value > 0) : values);
  let usedAll = spec.dimension === 'all' || quarter === undefined;
  let values = keep(valuesOf(spec.metric, countries));
  if (!usedAll) {
    const dimension = spec.dimension as Cut;
    const peers = countries.filter((country) => {
      const value = country.values[DIMENSION_METRIC[dimension]]?.[0];
      return value !== undefined && quarterOf(dimension, value) === quarter;
    });
    const own = keep(valuesOf(spec.metric, peers));
    if (own.length >= 20) values = own;
    else usedAll = true;
  }
  return {
    n: values.length,
    min: values[0]!,
    low: percentile(values, 0.05),
    high: percentile(values, 0.95),
    max: values[values.length - 1]!,
    usedAll,
  };
}

/** A value inside each quarter of a dimension, well away from the cuts. */
function inQuarter(dimension: Cut, quarter: number): number {
  const [a, b, c] = cuts(dimension);
  return [a / 2, Math.sqrt(a * b), Math.sqrt(b * c), c * 2][quarter - 1]!;
}

const PEOPLE = 10_000_000;

/** Inputs that give a check exactly `target`, for a nation in `quarter` of the check's dimension. */
function inputsFor(id: CheckId, target: number, quarter: number | undefined): Inputs {
  const gdp = quarter === undefined ? undefined : inQuarter('income', quarter) * PEOPLE;
  const withIncome = gdp === undefined ? {} : { population: PEOPLE, gdp };
  switch (id) {
    case 'density': {
      const area = quarter === undefined ? 100_000 : inQuarter('area', quarter);
      return { area, population: target * area };
    }
    case 'gdpPerPerson':
      return { population: PEOPLE, gdp: target * PEOPLE };
    case 'gdpPppPerPerson':
      return { population: PEOPLE, gdpPpp: target * PEOPLE };
    case 'priceLevel': {
      const nominal = gdp ?? 1e11;
      return { ...withIncome, gdp: nominal, gdpPpp: nominal / (target / 100) };
    }
    case 'growth':
      return { ...withIncome, growth: target };
    case 'lifeExpectancy':
      return { ...withIncome, lifeExpectancy: target };
    case 'fertility':
      return { ...withIncome, fertility: target };
    case 'urbanShare':
      return { ...withIncome, urbanShare: target };
    case 'governmentSpending':
      return { ...withIncome, governmentSpending: target };
    case 'capitalShare': {
      const population = quarter === undefined ? PEOPLE : inQuarter('population', quarter);
      return { population, capitalPopulation: (target / 100) * population };
    }
    case 'militaryPer1000':
      return { population: PEOPLE, military: (target / 1000) * PEOPLE };
    case 'militarySpending':
      return { militarySpending: target };
    case 'spendingPerSoldier': {
      const nominal = gdp ?? 1e11;
      const share = 2;
      // Without a population there is no GDP per person, so the comparison is with every country.
      return { ...withIncome, gdp: nominal, militarySpending: share, military: ((share / 100) * nominal) / target };
    }
  }
}

/** The rule, written out once more: inside the band, inside the spread, or beyond it. */
function expectedVerdict(value: number, range: Expected, sides: 'both' | 'high'): Verdict {
  if (value > range.max) return 'unlikely';
  if (value > range.high) return 'stretch';
  if (value < range.low && sides === 'both') return value < range.min ? 'unlikely' : 'stretch';
  return 'plausible';
}

const NUDGE = 1e-7;
const up = (value: number) => value + Math.abs(value) * NUDGE + 1e-9;
const down = (value: number) => value - Math.abs(value) * NUDGE - 1e-9;

function verdictOf(spec: CheckSpec, target: number, quarter: number | undefined): Verdict {
  const report = checkNation(inputsFor(spec.id, target, quarter));
  const check = report.checks.find((entry) => entry.id === spec.id);
  if (!check) throw new Error(`${spec.id} gave no check for ${target}`);
  expect(check.value).toBeCloseTo(target, 6);
  return check.verdict;
}

/** Skip targets the check itself can't take (a share of GDP of zero gives no soldiers to divide by). */
function usable(spec: CheckSpec, target: number): boolean {
  if (spec.scale === 'log' || spec.id === 'priceLevel') return target > 0;
  return true;
}

for (const spec of CHECKS) {
  // Density always has an area and capital share always has a population, so those two always
  // have peers; the checks that go by income fall back to every country when GDP isn't given.
  const quarters: Array<number | undefined> =
    spec.dimension === 'all' ? [undefined] : spec.dimension === 'income' ? [undefined, 1, 2, 3, 4] : [1, 2, 3, 4];

  describe(`${spec.label}: boundaries against the snapshot`, () => {
    for (const quarter of quarters) {
      const where = quarter === undefined ? 'every country' : `quarter ${quarter} by ${spec.dimension}`;
      const range = expectedRange(spec, quarter);

      it(`compares with the right countries (${where})`, () => {
        const middle = (range.low + range.high) / 2;
        const report = checkNation(inputsFor(spec.id, middle, quarter));
        const check = report.checks.find((entry) => entry.id === spec.id)!;
        expect(check.peers).toBe(range.n);
        expect(check.group.dimension).toBe(range.usedAll ? 'all' : spec.dimension);
        expect(check.group.quarter).toBe(range.usedAll ? undefined : quarter);
        expect(check.typical.low).toBeCloseTo(range.low, 9);
        expect(check.typical.high).toBeCloseTo(range.high, 9);
        expect(check.spread.lowest.value).toBe(range.min);
        expect(check.spread.highest.value).toBe(range.max);
        expect(check.verdict).toBe('plausible');
      });

      it(`has the snapshot's numbers in order (${where})`, () => {
        expect(range.n).toBeGreaterThanOrEqual(20);
        expect(range.min).toBeLessThanOrEqual(range.low);
        expect(range.low).toBeLessThan(range.high);
        expect(range.high).toBeLessThanOrEqual(range.max);
      });

      const edges: Array<[string, number]> = [
        ['the bottom of the spread', range.min],
        ['the bottom of the typical band', range.low],
        ['the top of the typical band', range.high],
        ['the top of the spread', range.max],
      ];
      for (const [name, edge] of edges) {
        for (const [side, target] of [
          ['just below', down(edge)],
          ['just above', up(edge)],
        ] as const) {
          if (!usable(spec, target)) continue;
          it(`${side} ${name}, ${target.toPrecision(7)} (${where})`, () => {
            expect(verdictOf(spec, target, quarter)).toBe(expectedVerdict(target, range, spec.sides));
          });
        }
      }

      it(`walks Unlikely, Stretch, Plausible, Stretch, Unlikely from low to high (${where})`, () => {
        const inside = (range.low + range.high) / 2;
        expect(verdictOf(spec, inside, quarter)).toBe('plausible');
        if (range.high < range.max) expect(verdictOf(spec, up(range.high), quarter)).toBe('stretch');
        expect(verdictOf(spec, up(range.max), quarter)).toBe('unlikely');
        if (spec.sides === 'both') {
          if (range.min < range.low && usable(spec, down(range.low))) {
            expect(verdictOf(spec, down(range.low), quarter)).toBe('stretch');
          }
          if (usable(spec, down(range.min))) expect(verdictOf(spec, down(range.min), quarter)).toBe('unlikely');
        } else {
          expect(verdictOf(spec, down(range.low), quarter)).toBe('plausible');
          if (range.min > 0.01) expect(verdictOf(spec, range.min / 2, quarter)).toBe('plausible');
        }
      });
    }
  });
}

describe('the peer groups', () => {
  it('split real countries into four near-equal quarters for each dimension', () => {
    for (const dimension of ['income', 'population', 'area'] as const) {
      const all = valuesOf(DIMENSION_METRIC[dimension], countries);
      const sizes = [1, 2, 3, 4].map((quarter) => all.filter((value) => quarterOf(dimension, value) === quarter).length);
      expect(sizes.reduce((a, b) => a + b, 0)).toBe(all.length);
      for (const size of sizes) expect(Math.abs(size - all.length / 4)).toBeLessThanOrEqual(1.5);
    }
  });

  it('cover every check: thirteen of them', () => {
    expect(CHECKS.map((spec) => spec.id)).toEqual([
      'density',
      'gdpPerPerson',
      'gdpPppPerPerson',
      'priceLevel',
      'growth',
      'lifeExpectancy',
      'fertility',
      'urbanShare',
      'capitalShare',
      'militaryPer1000',
      'militarySpending',
      'spendingPerSoldier',
      'governmentSpending',
    ]);
  });
});
