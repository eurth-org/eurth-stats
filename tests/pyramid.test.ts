import { describe, expect, it } from 'vitest';
import {
  BANDS,
  FERTILITY_MAX,
  FERTILITY_MIN,
  LIFE_EXPECTANCY_MAX,
  LIFE_EXPECTANCY_MIN,
  SEX_GAP,
  canEstimate,
  estimatePyramid,
  lifeExpectancyFrom,
  survival,
} from '../src/stats/pyramid';
import { SNAPSHOT, valueOf } from '../src/stats/snapshot';

const median = (values: number[]) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)]!;
const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

describe('the mortality curve', () => {
  it.each([20, 35, 50, 62, 71.3, 80, 88, 100])('hits a life expectancy of %s', (target) => {
    expect(lifeExpectancyFrom(survival(target))).toBeCloseTo(target, 2);
  });

  it('starts with everyone alive and only ever goes down', () => {
    for (const target of [30, 55, 70, 85]) {
      const alive = survival(target);
      expect(alive(0)).toBe(1);
      let before = 1;
      for (let age = 1; age <= 120; age++) {
        const now = alive(age);
        expect(now).toBeLessThanOrEqual(before);
        expect(now).toBeGreaterThanOrEqual(0);
        before = now;
      }
      expect(alive(120)).toBeLessThan(0.01);
    }
  });

  it('loses more infants where lives are shorter, in line with real patterns', () => {
    const infantDeaths = (target: number) => (1 - survival(target)(1)) * 1000;
    expect(infantDeaths(40)).toBeGreaterThan(130);
    expect(infantDeaths(40)).toBeLessThan(230);
    expect(infantDeaths(60)).toBeGreaterThan(35);
    expect(infantDeaths(60)).toBeLessThan(90);
    expect(infantDeaths(80)).toBeGreaterThan(1);
    expect(infantDeaths(80)).toBeLessThan(8);
    expect(infantDeaths(50)).toBeGreaterThan(infantDeaths(70));
  });

  it('holds life expectancy to what it can fit', () => {
    expect(lifeExpectancyFrom(survival(5))).toBeCloseTo(LIFE_EXPECTANCY_MIN, 1);
    expect(lifeExpectancyFrom(survival(500))).toBeCloseTo(LIFE_EXPECTANCY_MAX, 1);
  });

  it('uses a gap between women and men close to the real one', () => {
    const gaps = SNAPSHOT.countries.map(
      (country) => valueOf(country, 'lifeExpectancyFemale')! - valueOf(country, 'lifeExpectancyMale')!,
    );
    expect(Math.abs(median(gaps) - SEX_GAP)).toBeLessThan(1);
  });
});

describe('estimatePyramid', () => {
  it('needs both numbers, inside what the model can handle', () => {
    expect(estimatePyramid(undefined, 80)).toBeUndefined();
    expect(estimatePyramid(2, undefined)).toBeUndefined();
    expect(estimatePyramid(FERTILITY_MIN - 0.01, 80)).toBeUndefined();
    expect(estimatePyramid(FERTILITY_MAX + 0.01, 80)).toBeUndefined();
    expect(estimatePyramid(2, LIFE_EXPECTANCY_MIN - 1)).toBeUndefined();
    expect(estimatePyramid(2, LIFE_EXPECTANCY_MAX + 1)).toBeUndefined();
    expect(canEstimate(2, 80)).toBe(true);
    expect(canEstimate(0, 80)).toBe(false);
    expect(estimatePyramid(FERTILITY_MIN, LIFE_EXPECTANCY_MIN)).toBeDefined();
    expect(estimatePyramid(FERTILITY_MAX, LIFE_EXPECTANCY_MAX)).toBeDefined();
  });

  it('has nine ten-year bands that add up to everyone', () => {
    const pyramid = estimatePyramid(1.7, 79.4)!;
    expect(pyramid.bands.map((band) => band.label)).toEqual([...BANDS]);
    expect(BANDS).toHaveLength(9);
    const total = pyramid.bands.reduce((sum, band) => sum + band.male + band.female, 0);
    expect(total).toBeCloseTo(1, 9);
    expect(pyramid.under15 + pyramid.workingAge + pyramid.over64).toBeCloseTo(100, 9);
    expect(pyramid.widest).toBe(Math.max(...pyramid.bands.flatMap((band) => [band.male, band.female])));
  });

  it('has more boys than girls among the young and more women than men among the old', () => {
    const pyramid = estimatePyramid(2.1, 78)!;
    expect(pyramid.bands[0]!.male).toBeGreaterThan(pyramid.bands[0]!.female);
    expect(pyramid.bands[8]!.female).toBeGreaterThan(pyramid.bands[8]!.male);
  });

  it('is wide at the bottom for high fertility and narrow for low', () => {
    const young = estimatePyramid(6, 55)!;
    const old = estimatePyramid(1.2, 84)!;
    expect(young.bands[0]!.male).toBeGreaterThan(young.bands[4]!.male * 3);
    expect(young.under15).toBeGreaterThan(40);
    expect(young.medianAge).toBeLessThan(20);
    expect(young.shape).toBe('growing');
    expect(old.bands[0]!.male).toBeLessThan(old.bands[4]!.male);
    expect(old.under15).toBeLessThan(18);
    expect(old.medianAge).toBeGreaterThan(36);
    expect(old.shape).toBe('shrinking');
  });

  it('calls replacement fertility with long lives steady', () => {
    const pyramid = estimatePyramid(2.1, 80)!;
    expect(pyramid.shape).toBe('steady');
    expect(Math.abs(pyramid.longRunGrowth)).toBeLessThan(0.25);
  });

  it('moves the right way: more births, more children; longer lives, more elders', () => {
    for (const life of [50, 70, 85]) {
      let before = 0;
      for (const fertility of [1, 2, 3, 4, 6, 8]) {
        const share = estimatePyramid(fertility, life)!.under15;
        expect(share).toBeGreaterThan(before);
        before = share;
      }
    }
    for (const fertility of [1.2, 2.1, 4]) {
      let before = 0;
      for (const life of [45, 55, 65, 75, 85]) {
        const share = estimatePyramid(fertility, life)!.over64;
        expect(share).toBeGreaterThan(before);
        before = share;
      }
    }
  });

  it('keeps the dependency ratio in step with the three shares', () => {
    const pyramid = estimatePyramid(2.5, 70)!;
    expect(pyramid.dependencyRatio).toBeCloseTo(((pyramid.under15 + pyramid.over64) / pyramid.workingAge) * 100, 9);
  });

  it('gives finite numbers across the whole range it accepts', () => {
    for (const fertility of [FERTILITY_MIN, 1, 2.1, 5, FERTILITY_MAX]) {
      for (const life of [LIFE_EXPECTANCY_MIN, 45, 70, 90, LIFE_EXPECTANCY_MAX]) {
        const pyramid = estimatePyramid(fertility, life)!;
        for (const band of pyramid.bands) {
          expect(band.male).toBeGreaterThan(0);
          expect(band.female).toBeGreaterThan(0);
        }
        for (const value of [pyramid.under15, pyramid.over64, pyramid.medianAge, pyramid.dependencyRatio, pyramid.longRunGrowth]) {
          expect(Number.isFinite(value)).toBe(true);
        }
      }
    }
  });
});

describe('the pyramid against real countries in the snapshot', () => {
  const errors = SNAPSHOT.countries.map((country) => {
    const pyramid = estimatePyramid(valueOf(country, 'fertility'), valueOf(country, 'lifeExpectancy'))!;
    return {
      young: pyramid.under15 - valueOf(country, 'under15')!,
      old: pyramid.over64 - valueOf(country, 'over64')!,
    };
  });

  it('estimates one for every country', () => {
    expect(errors).toHaveLength(193);
  });

  it('is within three points of the real share of under-15s, on average', () => {
    expect(mean(errors.map((error) => Math.abs(error.young)))).toBeLessThan(3);
    expect(Math.abs(median(errors.map((error) => error.young)))).toBeLessThan(2);
  });

  it('is within four points of the real share of over-64s, on average', () => {
    expect(mean(errors.map((error) => Math.abs(error.old)))).toBeLessThan(4);
    expect(Math.abs(median(errors.map((error) => error.old)))).toBeLessThan(2);
  });

  it('is within nine points for nine countries in ten', () => {
    const close = errors.filter((error) => Math.abs(error.young) < 9 && Math.abs(error.old) < 9);
    expect(close.length / errors.length).toBeGreaterThan(0.9);
  });
});
