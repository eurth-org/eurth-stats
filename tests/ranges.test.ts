import { describe, expect, it } from 'vitest';
import { ALL, MIN_PEERS, RANGES, createRanges, quantile } from '../src/stats/ranges';
import { SNAPSHOT, dateInWords, nameOf, valueOf, yearOf, type Country, type Snapshot } from '../src/stats/snapshot';

/** Forty made-up countries: population 1 to 40 million, life expectancy 41 to 80, GDP per person rising. */
function tiny(count = 40): Snapshot {
  const countries: Country[] = Array.from({ length: count }, (_, index) => ({
    iso3: `C${String(index + 1).padStart(2, '0')}`,
    name: `Country ${index + 1}`,
    values: {
      population: [(index + 1) * 1e6, 2025],
      gdpPerPerson: [(index + 1) * 1000, 2025],
      area: [(index + 1) * 10, 2025],
      lifeExpectancy: [41 + index, 2025],
    },
  }));
  return { date: '2026-01-01', scope: 'test', sources: {}, indicators: {}, derived: {}, countries };
}

describe('quantile', () => {
  it('interpolates in a straight line between neighbours', () => {
    expect(quantile([1, 2, 3, 4, 5], 0)).toBe(1);
    expect(quantile([1, 2, 3, 4, 5], 1)).toBe(5);
    expect(quantile([1, 2, 3, 4, 5], 0.5)).toBe(3);
    expect(quantile([1, 2, 3, 4, 5], 0.25)).toBe(2);
    expect(quantile([10, 20], 0.05)).toBeCloseTo(10.5, 10);
    expect(quantile([7], 0.95)).toBe(7);
  });

  it('holds fractions to 0..1 and gives NaN for nothing', () => {
    expect(quantile([1, 2, 3], -1)).toBe(1);
    expect(quantile([1, 2, 3], 2)).toBe(3);
    expect(quantile([], 0.5)).toBeNaN();
  });
});

describe('ranges over a small snapshot', () => {
  const ranges = createRanges(tiny());

  it('cut a dimension into quarters at the quartiles', () => {
    expect(ranges.cuts('income')).toEqual([10750, 20500, 30250]);
  });

  it('put a value on a cut into the quarter above', () => {
    expect(ranges.quarterFor('income', 10749.99)).toBe(1);
    expect(ranges.quarterFor('income', 10750)).toBe(2);
    expect(ranges.quarterFor('income', 20500)).toBe(3);
    expect(ranges.quarterFor('income', 30250)).toBe(4);
    expect(ranges.quarterFor('income', 1e9)).toBe(4);
    expect(ranges.quarterFor('income', 0)).toBe(1);
  });

  it('give each quarter ten of the forty countries', () => {
    for (const quarter of [1, 2, 3, 4] as const) {
      expect(ranges.members({ dimension: 'income', quarter })).toHaveLength(10);
    }
    expect(ranges.members(ALL)).toHaveLength(40);
  });

  it('describe every country: spread, band and median', () => {
    const range = ranges.rangeFor('lifeExpectancy', ALL)!;
    expect(range.n).toBe(40);
    expect(range.min).toBe(41);
    expect(range.max).toBe(80);
    expect(range.low).toBeCloseTo(42.95, 10);
    expect(range.high).toBeCloseTo(78.05, 10);
    expect(range.median).toBe(60.5);
    expect(range.lowest.country.name).toBe('Country 1');
    expect(range.highest.country.name).toBe('Country 40');
    expect(range.references.map((reference) => reference.value)).toEqual([...range.references.map((r) => r.value)].sort((a, b) => a - b));
  });

  it(`fall back to every country when a group has fewer than ${MIN_PEERS}`, () => {
    const asked = { dimension: 'income', quarter: 2 } as const;
    const range = ranges.rangeFor('lifeExpectancy', asked)!;
    expect(range.asked).toEqual(asked);
    expect(range.group).toEqual(ALL);
    expect(range.n).toBe(40);
  });

  it('keep a group that is big enough', () => {
    const big = createRanges(tiny(100));
    const range = big.rangeFor('lifeExpectancy', { dimension: 'income', quarter: 1 })!;
    expect(range.group).toEqual({ dimension: 'income', quarter: 1 });
    expect(range.n).toBe(25);
    expect(range.min).toBe(41);
    expect(range.max).toBe(65);
  });

  it('give nothing for a metric no country has', () => {
    expect(ranges.rangeFor('fertility', ALL)).toBeUndefined();
  });

  it('pick a group from a value, or every country without one', () => {
    expect(ranges.groupFor('income', 500)).toEqual({ dimension: 'income', quarter: 1 });
    expect(ranges.groupFor('income', undefined)).toEqual(ALL);
    expect(ranges.groupFor('income', NaN)).toEqual(ALL);
    expect(ranges.groupFor('all', 500)).toEqual(ALL);
  });

  it('can leave out zeros, for logarithmic bars', () => {
    const snapshot = tiny();
    snapshot.countries[0]!.values.lifeExpectancy = [0, 2025];
    const withZero = createRanges(snapshot);
    expect(withZero.rangeFor('lifeExpectancy', ALL)!.min).toBe(0);
    expect(withZero.rangeFor('lifeExpectancy', ALL, true)!.min).toBe(42);
    expect(withZero.rangeFor('lifeExpectancy', ALL, true)!.n).toBe(39);
  });
});

describe('the snapshot in the repo', () => {
  it('is dated and names its sources, licences and attribution', () => {
    expect(SNAPSHOT.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const source of Object.values(SNAPSHOT.sources)) {
      expect(source.name.length).toBeGreaterThan(3);
      expect(source.publisher.length).toBeGreaterThan(3);
      expect(source.licence.length).toBeGreaterThan(3);
      expect(source.licenceUrl).toMatch(/^https:\/\//);
      expect(source.url).toMatch(/^https:\/\//);
      expect(source.attribution.length).toBeGreaterThan(20);
    }
    for (const indicator of Object.values(SNAPSHOT.indicators)) {
      expect(SNAPSHOT.sources[indicator.source]).toBeDefined();
      expect(indicator.code).toMatch(/^[A-Z0-9.]+$/);
    }
  });

  it('holds the 193 member states of the United Nations, each once', () => {
    expect(SNAPSHOT.countries).toHaveLength(193);
    expect(new Set(SNAPSHOT.countries.map((country) => country.iso3)).size).toBe(193);
    expect(new Set(SNAPSHOT.countries.map((country) => country.name)).size).toBe(193);
    for (const country of SNAPSHOT.countries) {
      expect(country.iso3).toMatch(/^[A-Z]{3}$/);
      expect(country.name).not.toMatch(/[,.]/);
    }
  });

  it('has no aggregates or territories in it', () => {
    const codes = new Set(SNAPSHOT.countries.map((country) => country.iso3));
    for (const code of ['WLD', 'EMU', 'HIC', 'HKG', 'MAC', 'PRI', 'GRL', 'XKX']) expect(codes.has(code)).toBe(false);
  });

  it('gives every value a recent year and a finite number', () => {
    const year = Number(SNAPSHOT.date.slice(0, 4));
    for (const country of SNAPSHOT.countries) {
      for (const [value, when] of Object.values(country.values)) {
        expect(Number.isFinite(value)).toBe(true);
        expect(when).toBeGreaterThanOrEqual(year - 7);
        expect(when).toBeLessThanOrEqual(year);
      }
    }
  });

  it('keeps shares inside 0 to 100 and sizes above zero', () => {
    for (const country of SNAPSHOT.countries) {
      for (const metric of ['urbanShare', 'largestCityShare', 'under15', 'over64'] as const) {
        const value = valueOf(country, metric);
        if (value !== undefined) {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(100);
        }
      }
      expect(valueOf(country, 'population')).toBeGreaterThan(0);
      expect(valueOf(country, 'area')).toBeGreaterThan(0);
    }
  });

  it('agrees with itself: density is population over area', () => {
    for (const country of SNAPSHOT.countries) {
      const density = valueOf(country, 'density')!;
      const expected = valueOf(country, 'population')! / valueOf(country, 'area')!;
      expect(density / expected).toBeGreaterThan(0.9);
      expect(density / expected).toBeLessThan(1.1);
    }
  });

  it('knows a few things everyone knows', () => {
    const find = (iso3: string) => SNAPSHOT.countries.find((country) => country.iso3 === iso3)!;
    expect(valueOf(find('ESP'), 'population')).toBeGreaterThan(45e6);
    expect(valueOf(find('ESP'), 'population')).toBeLessThan(52e6);
    expect(valueOf(find('JPN'), 'lifeExpectancy')).toBeGreaterThan(83);
    expect(valueOf(find('RUS'), 'area')).toBeGreaterThan(16e6);
    expect(yearOf(find('ESP'), 'population')).toBeGreaterThanOrEqual(2024);
    expect(nameOf(find('NLD'))).toBe('the Netherlands');
    expect(nameOf(find('ESP'))).toBe('Spain');
    expect(nameOf(find('KOR'))).toBe('South Korea');
  });

  it('has enough countries behind every range it is asked for', () => {
    for (const metric of ['density', 'gdpPerPerson', 'growth', 'lifeExpectancy', 'fertility', 'urbanShare'] as const) {
      expect(RANGES.rangeFor(metric, ALL)!.n).toBeGreaterThan(180);
    }
    expect(RANGES.rangeFor('largestCityShare', ALL)!.n).toBeGreaterThan(140);
    expect(RANGES.rangeFor('governmentSpending', ALL)!.n).toBeGreaterThan(130);
  });

  it('writes its date in words', () => {
    expect(dateInWords('2026-11-14')).toBe('14 November 2026');
    expect(dateInWords('2026-01-05')).toBe('5 January 2026');
    expect(dateInWords('soon')).toBe('soon');
  });
});
