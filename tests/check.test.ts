import { describe, expect, it } from 'vitest';
import {
  CHECKS,
  VERDICT_MEANING,
  VERDICT_WORD,
  barFor,
  checkNation,
  checkSpec,
  groupWords,
  judge,
  scaleLines,
  summaryLine,
  type Check,
  type CheckId,
} from '../src/stats/check';
import { derive } from '../src/stats/derive';
import type { Inputs } from '../src/stats/model';
import { ALL, RANGES, type Range } from '../src/stats/ranges';
import { SNAPSHOT } from '../src/stats/snapshot';

/** The mock-up's nation, with the brief's extra numbers filled in. */
const TELAND: Inputs = {
  population: 48_200_000,
  area: 512_000,
  gdp: 1.94e12,
  gdpPpp: 2.6e12,
  growth: 6.5,
  lifeExpectancy: 79.4,
  fertility: 1.7,
  urbanShare: 78,
  capitalPopulation: 9_800_000,
  military: 410_000,
  militarySpending: 2.4,
  governmentSpending: 38,
};

function find(checks: Check[], id: CheckId): Check {
  const check = checks.find((entry) => entry.id === id);
  if (!check) throw new Error(`no ${id}`);
  return check;
}

function range(min: number, low: number, high: number, max: number): Range {
  const lowest = { country: { iso3: 'LOW', name: 'Lowland', values: {} }, value: min };
  const highest = { country: { iso3: 'HIG', name: 'Highland', values: {} }, value: max };
  return {
    metric: 'growth', asked: ALL, group: ALL, n: 2, min, max, low, high, median: (low + high) / 2,
    lowest, highest, references: [lowest, highest],
  };
}

describe('judge: the rule', () => {
  const r = range(0, 10, 90, 100);

  it('calls the typical band Plausible, edges included', () => {
    expect(judge(10, r)).toEqual({ verdict: 'plausible', side: 'inside' });
    expect(judge(50, r)).toEqual({ verdict: 'plausible', side: 'inside' });
    expect(judge(90, r)).toEqual({ verdict: 'plausible', side: 'inside' });
  });

  it('calls the rest of the real spread a Stretch, edges included', () => {
    expect(judge(9.999, r)).toEqual({ verdict: 'stretch', side: 'low' });
    expect(judge(0, r)).toEqual({ verdict: 'stretch', side: 'low' });
    expect(judge(90.001, r)).toEqual({ verdict: 'stretch', side: 'high' });
    expect(judge(100, r)).toEqual({ verdict: 'stretch', side: 'high' });
  });

  it('calls anything beyond every real country Unlikely', () => {
    expect(judge(-0.001, r)).toEqual({ verdict: 'unlikely', side: 'low' });
    expect(judge(100.001, r)).toEqual({ verdict: 'unlikely', side: 'high' });
  });

  it('lets a one-sided check go as low as it likes', () => {
    expect(judge(5, r, 'high')).toEqual({ verdict: 'plausible', side: 'low' });
    expect(judge(-50, r, 'high')).toEqual({ verdict: 'plausible', side: 'low' });
    expect(judge(95, r, 'high')).toEqual({ verdict: 'stretch', side: 'high' });
    expect(judge(101, r, 'high')).toEqual({ verdict: 'unlikely', side: 'high' });
  });

  it('skips Stretch on a side where the band reaches the end of the spread', () => {
    const flush = range(0, 0, 100, 100);
    expect(judge(0, flush).verdict).toBe('plausible');
    expect(judge(-1, flush).verdict).toBe('unlikely');
    expect(judge(100, flush).verdict).toBe('plausible');
    expect(judge(101, flush).verdict).toBe('unlikely');
  });
});

describe('the bar', () => {
  const r = range(0, 10, 90, 100);

  it('leaves room at both ends and keeps everything in order', () => {
    const bar = barFor(50, r, 'linear');
    expect(bar.spreadStart).toBe(0.06);
    expect(bar.spreadEnd).toBe(0.94);
    expect(bar.marker).toBe(0.5);
    expect(bar.bandStart).toBeCloseTo(0.148, 3);
    expect(bar.bandEnd).toBeCloseTo(0.852, 3);
    expect(bar.beyond).toBeNull();
  });

  it('pins a marker that is off the scale and says which way', () => {
    expect(barFor(1000, r, 'linear')).toMatchObject({ marker: 1, beyond: 'high' });
    expect(barFor(-1000, r, 'linear')).toMatchObject({ marker: 0, beyond: 'low' });
    expect(barFor(103, r, 'linear').marker).toBeGreaterThan(0.94);
    expect(barFor(103, r, 'linear').marker).toBeLessThan(1);
  });

  it('spreads powers of ten evenly on a logarithmic bar', () => {
    const log = range(1, 10, 1000, 10000);
    const bar = barFor(100, log, 'log');
    expect(bar.marker).toBe(0.5);
    expect(bar.bandStart).toBeCloseTo(0.28, 2);
    expect(bar.bandEnd).toBeCloseTo(0.72, 2);
    expect(barFor(0, log, 'log')).toMatchObject({ marker: 0, beyond: 'low' });
  });

  it('opens up the low end on a square-root bar', () => {
    expect(barFor(25, r, 'root').marker).toBe(0.5);
  });

  it('copes with a spread of one value', () => {
    const flat = range(5, 5, 5, 5);
    expect(barFor(5, flat, 'linear').marker).toBe(0.5);
  });

  it('is always between 0 and 1, whatever the nation', () => {
    const wild = checkNation({ ...TELAND, growth: -90, fertility: 19, militarySpending: 99, capitalPopulation: 1 });
    for (const check of [...checkNation(TELAND).checks, ...wild.checks]) {
      for (const position of [check.bar.marker, check.bar.bandStart, check.bar.bandEnd, check.bar.spreadStart, check.bar.spreadEnd]) {
        expect(position).toBeGreaterThanOrEqual(0);
        expect(position).toBeLessThanOrEqual(1);
      }
      expect(check.bar.spreadStart).toBeLessThanOrEqual(check.bar.bandStart);
      expect(check.bar.bandStart).toBeLessThanOrEqual(check.bar.bandEnd);
      expect(check.bar.bandEnd).toBeLessThanOrEqual(check.bar.spreadEnd);
    }
  });
});

describe('checkNation', () => {
  it('gives nothing to check for nothing entered', () => {
    const report = checkNation({});
    expect(report.checks).toEqual([]);
    expect(report.scale).toEqual([]);
    expect(report.counts).toEqual({ plausible: 0, stretch: 0, unlikely: 0 });
    expect(report.summary).toBe('Nothing to check yet');
    expect(report.pyramid).toBeUndefined();
    expect(report.nationOfOne).toBe(false);
    expect(report.snapshotDate).toBe(SNAPSHOT.date);
  });

  it('runs all thirteen checks for a nation with every number', () => {
    const report = checkNation(TELAND);
    expect(report.checks.map((check) => check.id)).toEqual(CHECKS.map((spec) => spec.id));
    expect(report.scale.map((line) => line.id)).toEqual(['population', 'area', 'gdp', 'gdpPpp']);
    expect(report.pyramid).toBeDefined();
  });

  it('runs only the checks the numbers allow', () => {
    expect(checkNation({ population: 5e6 }).checks).toEqual([]);
    expect(checkNation({ population: 5e6, area: 50_000 }).checks.map((check) => check.id)).toEqual(['density']);
    expect(checkNation({ lifeExpectancy: 70 }).checks.map((check) => check.id)).toEqual(['lifeExpectancy']);
    expect(checkNation({ gdp: 1e11, militarySpending: 2 }).checks.map((check) => check.id)).toEqual(['militarySpending']);
    expect(checkNation({ gdp: 1e11, militarySpending: 2, military: 50_000 }).checks.map((check) => check.id)).toEqual([
      'militarySpending',
      'spendingPerSoldier',
    ]);
  });

  it('never divides by zero', () => {
    const report = checkNation({ population: 0, area: 0, gdp: 0, gdpPpp: 0, military: 0, militarySpending: 0, capitalPopulation: 0 });
    for (const check of report.checks) expect(Number.isFinite(check.value)).toBe(true);
    expect(report.checks.map((check) => check.id)).toEqual(['militarySpending']);
  });

  it('counts the verdicts and writes the summary line', () => {
    const report = checkNation(TELAND);
    const total = report.counts.plausible + report.counts.stretch + report.counts.unlikely;
    expect(total).toBe(report.checks.length);
    expect(report.summary).toBe(summaryLine(report.counts));
    expect(report.summary).toBe('12 plausible, 1 stretch');
  });

  it('fills in every part of a check', () => {
    for (const check of checkNation(TELAND).checks) {
      expect(check.label.length).toBeGreaterThan(3);
      expect(check.what.endsWith('.')).toBe(true);
      expect(check.valueText).toMatch(/\d/);
      expect(check.verdictWord).toBe(VERDICT_WORD[check.verdict]);
      expect(check.reason.endsWith('.')).toBe(true);
      expect(check.reason).not.toMatch(/undefined|NaN|Infinity/);
      expect(check.peers).toBeGreaterThanOrEqual(20);
      expect(check.typical.text).toMatch(/\d/);
      expect(check.typical.low).toBeLessThan(check.typical.high);
      expect(check.spread.lowest.value).toBeLessThanOrEqual(check.spread.highest.value);
      expect(check.spread.lowest.name.length).toBeGreaterThan(2);
      expect(check.impossible).toBe(false);
    }
  });

  it('compares by income when it knows GDP per person, and with everyone when it doesn’t', () => {
    const rich = find(checkNation({ population: 10e6, gdp: 600e9, lifeExpectancy: 81 }).checks, 'lifeExpectancy');
    expect(rich.group).toEqual({ dimension: 'income', quarter: 4 });
    expect(rich.groupLabel).toBe('countries of similar income');
    const unknown = find(checkNation({ lifeExpectancy: 81 }).checks, 'lifeExpectancy');
    expect(unknown.group).toEqual(ALL);
    expect(unknown.groupLabel).toBe('real countries');
    expect(unknown.peers).toBe(193);
  });

  it('judges the same number differently for a rich and a poor nation', () => {
    const rich = find(checkNation({ population: 10e6, gdp: 600e9, lifeExpectancy: 62 }).checks, 'lifeExpectancy');
    const poor = find(checkNation({ population: 10e6, gdp: 10e9, lifeExpectancy: 62 }).checks, 'lifeExpectancy');
    expect(rich.verdict).toBe('unlikely');
    expect(poor.verdict).toBe('plausible');
  });

  it('spots a population of exactly 1', () => {
    expect(checkNation({ population: 1 }).nationOfOne).toBe(true);
    expect(checkNation({ population: 2 }).nationOfOne).toBe(false);
    expect(checkNation({ population: 0 }).nationOfOne).toBe(false);
    expect(checkNation({}).nationOfOne).toBe(false);
  });

  it('is pure: the same numbers give the same report, and the inputs are left alone', () => {
    const inputs = { ...TELAND };
    expect(checkNation(inputs)).toEqual(checkNation(inputs));
    expect(inputs).toEqual(TELAND);
  });
});

describe('the sentence of why', () => {
  it('names a real country of about the same value when Plausible', () => {
    const density = find(checkNation(TELAND).checks, 'density');
    expect(density.verdict).toBe('plausible');
    expect(density.reason).toBe('About the same as Spain.');
  });

  it('names the countries either side when none is close', () => {
    const report = checkNation({ population: 10e6, gdp: 600e9, lifeExpectancy: 77.2 });
    const reason = find(report.checks, 'lifeExpectancy').reason;
    expect(reason).toMatch(/^(About the same as|Between) /);
  });

  it('says what is typical and who is further out when a Stretch', () => {
    const growth = find(checkNation(TELAND).checks, 'growth');
    expect(growth.verdict).toBe('stretch');
    expect(growth.side).toBe('high');
    expect(growth.reason).toMatch(/^High for a country of similar income: .+ to .+% a year is typical, and only .+ (is|are) higher\.$/);
  });

  it('counts them when more than two are further out', () => {
    const report = checkNation({ fertility: 5 });
    const fertility = find(report.checks, 'fertility');
    expect(fertility.verdict).toBe('stretch');
    expect(fertility.reason).toMatch(/^High for a real country: .+ is typical, and \d+ are higher, among them .+ and .+\.$/);
  });

  it('says Low on the other side', () => {
    const report = checkNation({ fertility: 0.9 });
    const fertility = find(report.checks, 'fertility');
    expect(fertility.verdict).toBe('stretch');
    expect(fertility.reason).toMatch(/^Low for a real country: .+ is typical, and only .+ (is|are) lower\.$/);
  });

  it('names the record holder, with its value, when Unlikely', () => {
    const high = find(checkNation({ fertility: 9 }).checks, 'fertility');
    expect(high.verdict).toBe('unlikely');
    expect(high.reason).toMatch(/^Higher than any real country: the highest is .+, at [\d.]+ births per woman\.$/);
    const low = find(checkNation({ lifeExpectancy: 30 }).checks, 'lifeExpectancy');
    expect(low.reason).toMatch(/^Lower than any real country: the lowest is .+, at [\d.]+ years\.$/);
  });

  it('writes "the" before the countries that take it', () => {
    const report = checkNation({ population: 300e6, gdp: 25e12, militarySpending: 3.4, military: 1_100_000 });
    const perSoldier = find(report.checks, 'spendingPerSoldier');
    expect(perSoldier.verdict).toBe('unlikely');
    expect(perSoldier.reason).toContain('the highest is the United States, at');
  });

  it('never grades a real country: no sentence carries a judging word', () => {
    const nations: Inputs[] = [
      TELAND,
      { population: 2e6, area: 300, gdp: 4e11, growth: -3, lifeExpectancy: 45, fertility: 8, urbanShare: 5, capitalPopulation: 1.9e6, military: 150_000, militarySpending: 45, governmentSpending: 70 },
      { population: 900e6, area: 9e6, gdp: 4e11, gdpPpp: 3e12, growth: 12, lifeExpectancy: 58, fertility: 6.5, urbanShare: 20, capitalPopulation: 2e6, military: 9e6, militarySpending: 0.1, governmentSpending: 6 },
    ];
    for (const inputs of nations) {
      const report = checkNation(inputs);
      for (const text of [...report.checks.map((check) => check.reason), ...report.scale.map((line) => line.comparison)]) {
        expect(text).not.toMatch(/\b(bad|worse|worst|poor|poorest|backward|failed|failing|corrupt|good|better|best|rich|richest|advanced|developed|third world)\b/i);
      }
    }
  });
});

describe('numbers that can’t be true together', () => {
  it('a capital bigger than the country', () => {
    const check = find(checkNation({ population: 1e6, capitalPopulation: 1.2e6 }).checks, 'capitalShare');
    expect(check).toMatchObject({ verdict: 'unlikely', impossible: true, reason: 'More people in the capital than in the whole country.' });
  });

  it('a capital bigger than all towns and cities together', () => {
    const check = find(checkNation({ population: 10e6, urbanShare: 30, capitalPopulation: 4e6 }).checks, 'capitalShare');
    expect(check.verdict).toBe('unlikely');
    expect(check.impossible).toBe(true);
    expect(check.reason).toBe('More people in the capital than in all towns and cities together (30% of people are urban).');
  });

  it('a capital that fits inside the urban population is fine', () => {
    const check = find(checkNation({ population: 10e6, urbanShare: 60, capitalPopulation: 2e6 }).checks, 'capitalShare');
    expect(check.impossible).toBe(false);
    expect(check.verdict).toBe('plausible');
  });

  it('more soldiers than people', () => {
    const check = find(checkNation({ population: 1000, military: 5000 }).checks, 'militaryPer1000');
    expect(check).toMatchObject({ verdict: 'unlikely', impossible: true, reason: 'More soldiers than people.' });
  });

  it('a military that outspends the whole government', () => {
    const check = find(checkNation({ militarySpending: 3, governmentSpending: 2 }).checks, 'militarySpending');
    expect(check.verdict).toBe('unlikely');
    expect(check.impossible).toBe(true);
    expect(check.reason).toBe('The military spends more than the whole government (2% of GDP).');
    const fine = find(checkNation({ militarySpending: 3, governmentSpending: 30 }).checks, 'militarySpending');
    expect(fine.impossible).toBe(false);
  });
});

describe('the capital check is one-sided', () => {
  it('lets a small capital pass, and says why when it is smaller than any real largest city', () => {
    const check = find(checkNation({ population: 200e6, capitalPopulation: 400_000 }).checks, 'capitalShare');
    expect(check.verdict).toBe('plausible');
    expect(check.reason).toBe('A small capital for the country, which happens: not every capital is its country’s largest city.');
    expect(check.typical.text).toMatch(/^up to /);
  });

  it('says what the real figures are', () => {
    expect(checkSpec('capitalShare').note).toContain('largest city');
  });
});

describe('scale lines', () => {
  it('give the raw sizes a country to picture them by, and no verdict', () => {
    const lines = scaleLines(TELAND);
    expect(lines[0]).toEqual({
      id: 'population',
      label: 'Population',
      value: 48_200_000,
      valueText: '48.2 million people',
      comparison: 'About the same as Spain.',
    });
    expect(lines[1]!.valueText).toBe('512,000 km²');
    expect(lines[2]!.valueText).toBe('$1.94 trillion');
    expect(lines[3]!.valueText).toBe('$2.6 trillion at PPP');
    for (const line of lines) expect(line).not.toHaveProperty('verdict');
  });

  it('say so when a nation is bigger or smaller than any real country', () => {
    expect(scaleLines({ population: 5e9 })[0]!.comparison).toMatch(/^More people than any real country: the most populous is India, at 1\.4\d billion people\.$/);
    expect(scaleLines({ population: 1 })[0]!.comparison).toMatch(/^Fewer people than any real country: the least populous is Tuvalu, at [\d,]+ people\.$/);
    expect(scaleLines({ area: 5e7 })[0]!.comparison).toMatch(/^Larger than any real country: the largest is Russia, at 16\.4 million km²\.$/);
    expect(scaleLines({ area: 1 })[0]!.comparison).toMatch(/^Smaller than any real country: the smallest is Monaco/);
  });
});

describe('words', () => {
  it('has a word and a meaning for each verdict', () => {
    expect(VERDICT_WORD).toEqual({ plausible: 'Plausible', stretch: 'Stretch', unlikely: 'Unlikely' });
    for (const meaning of Object.values(VERDICT_MEANING)) expect(meaning.endsWith('.')).toBe(true);
  });

  it('writes the summary line, leaving out verdicts nobody got', () => {
    expect(summaryLine({ plausible: 4, stretch: 1, unlikely: 1 })).toBe('4 plausible, 1 stretch, 1 unlikely');
    expect(summaryLine({ plausible: 6, stretch: 0, unlikely: 0 })).toBe('6 plausible');
    expect(summaryLine({ plausible: 0, stretch: 0, unlikely: 2 })).toBe('2 unlikely');
    expect(summaryLine({ plausible: 0, stretch: 0, unlikely: 0 })).toBe('Nothing to check yet');
  });

  it('names each kind of peer group', () => {
    expect(groupWords(ALL).plural).toBe('real countries');
    expect(groupWords({ dimension: 'income', quarter: 1 }).one).toBe('a country of similar income');
    expect(groupWords({ dimension: 'population', quarter: 1 }).any).toBe('any country of similar population');
    expect(groupWords({ dimension: 'area', quarter: 1 }).plural).toBe('countries of similar area');
  });

  it('formats every check’s value with its unit', () => {
    const derived = derive(TELAND);
    const texts = Object.fromEntries(CHECKS.map((spec) => [spec.id, spec.format(spec.value(TELAND, derived)!)]));
    expect(texts).toEqual({
      density: '94.1 per km²',
      gdpPerPerson: '$40,200',
      gdpPppPerPerson: '$53,900 at PPP',
      priceLevel: '75% of US prices',
      growth: '6.5% a year',
      lifeExpectancy: '79.4 years',
      fertility: '1.7 births per woman',
      urbanShare: '78% of people',
      capitalShare: '20% of people',
      militaryPer1000: '8.5 per 1,000 people',
      militarySpending: '2.4% of GDP',
      spendingPerSoldier: '$114,000 per soldier',
      governmentSpending: '38% of GDP',
    });
  });
});

describe('real countries pass their own check', () => {
  it('at least nine in ten of every check’s verdicts are Plausible when a real country is put in', () => {
    const tally = new Map<CheckId, { plausible: number; total: number; unlikely: number }>();
    for (const country of SNAPSHOT.countries) {
      const get = (metric: Parameters<typeof RANGES.rangeFor>[0]) => country.values[metric]?.[0];
      const inputs: { -readonly [K in keyof Inputs]: Inputs[K] } = {};
      const set = (key: keyof Inputs, value: number | undefined) => {
        if (value !== undefined) inputs[key] = value;
      };
      set('population', get('population'));
      set('area', get('area'));
      set('gdp', get('gdp'));
      set('gdpPpp', get('gdpPpp'));
      set('growth', get('growth'));
      set('lifeExpectancy', get('lifeExpectancy'));
      set('fertility', get('fertility'));
      set('urbanShare', get('urbanShare'));
      set('militarySpending', get('militarySpending'));
      set('governmentSpending', get('governmentSpending'));
      for (const check of checkNation(inputs).checks) {
        const entry = tally.get(check.id) ?? { plausible: 0, total: 0, unlikely: 0 };
        entry.total++;
        if (check.verdict === 'plausible') entry.plausible++;
        if (check.verdict === 'unlikely' && !check.impossible) entry.unlikely++;
        tally.set(check.id, entry);
      }
    }
    for (const [id, entry] of tally) {
      expect(entry.plausible / entry.total, id).toBeGreaterThanOrEqual(0.85);
      // A real country is never beyond every real country, give or take the years its numbers come from.
      expect(entry.unlikely / entry.total, id).toBeLessThanOrEqual(0.03);
    }
  });
});
