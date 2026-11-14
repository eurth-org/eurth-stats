import { describe, expect, it } from 'vitest';
import { derive } from '../src/stats/derive';

describe('derive', () => {
  it('works out everything for a nation with every number', () => {
    const derived = derive({
      population: 48_200_000,
      area: 512_000,
      gdp: 1.94e12,
      gdpPpp: 2.6e12,
      urbanShare: 78,
      capitalPopulation: 9_800_000,
      military: 410_000,
      militarySpending: 2.4,
      governmentSpending: 38,
    });
    expect(derived.density).toBeCloseTo(94.14, 2);
    expect(derived.gdpPerPerson).toBeCloseTo(40_248.96, 2);
    expect(derived.gdpPppPerPerson).toBeCloseTo(53_941.91, 2);
    expect(derived.priceLevel).toBeCloseTo(74.615, 3);
    expect(derived.militaryPer1000).toBeCloseTo(8.506, 3);
    expect(derived.militaryBudget).toBeCloseTo(4.656e10, -6);
    expect(derived.spendingPerSoldier).toBeCloseTo(113_560.98, 2);
    expect(derived.capitalShare).toBeCloseTo(20.332, 3);
    expect(derived.urbanPopulation).toBeCloseTo(37_596_000, 0);
    expect(derived.capitalShareOfUrban).toBeCloseTo(26.067, 3);
    expect(derived.governmentBudget).toBeCloseTo(7.372e11, -7);
    expect(derived.governmentSpendingPerPerson).toBeCloseTo(15_294.61, 2);
    expect(derived.militaryShareOfGovernment).toBeCloseTo(6.316, 3);
  });

  it('gives nothing for nothing', () => {
    expect(derive({})).toEqual({});
  });

  it('gives only what the numbers allow', () => {
    expect(derive({ population: 1000 })).toEqual({});
    expect(derive({ population: 1000, area: 10 })).toEqual({ density: 100 });
    expect(derive({ gdp: 1e9, gdpPpp: 2e9 })).toEqual({ priceLevel: 50 });
    expect(Object.keys(derive({ gdp: 1e9, militarySpending: 2 }))).toEqual(['militaryBudget']);
  });

  it('never divides by zero', () => {
    const derived = derive({
      population: 0, area: 0, gdp: 5, gdpPpp: 0, military: 0, militarySpending: 2,
      capitalPopulation: 5, urbanShare: 0, governmentSpending: 0,
    });
    for (const value of Object.values(derived)) expect(Number.isFinite(value)).toBe(true);
    expect(derived.density).toBeUndefined();
    expect(derived.gdpPerPerson).toBeUndefined();
    expect(derived.priceLevel).toBeUndefined();
    expect(derived.spendingPerSoldier).toBeUndefined();
    expect(derived.capitalShare).toBeUndefined();
    expect(derived.capitalShareOfUrban).toBeUndefined();
    expect(derived.militaryShareOfGovernment).toBeUndefined();
  });

  it('keeps zeros that mean something', () => {
    expect(derive({ population: 1000, military: 0 }).militaryPer1000).toBe(0);
    expect(derive({ population: 1000, capitalPopulation: 0 }).capitalShare).toBe(0);
  });
});
