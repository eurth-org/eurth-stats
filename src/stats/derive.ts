// Numbers worked out from the inputs: density, GDP per person and so on.
// Each appears only when everything it needs was given and the sum makes
// sense (nothing is divided by zero).

import type { Inputs } from './model';

export interface Derived {
  /** People per square kilometre. */
  density?: number;
  /** Nominal GDP per person, in US dollars. */
  gdpPerPerson?: number;
  /** GDP at purchasing power parity per person, in international dollars. */
  gdpPppPerPerson?: number;
  /** Nominal GDP as a percentage of PPP GDP: prices against the United States, where the United States is 100. */
  priceLevel?: number;
  /** Active military personnel for every 1,000 people. */
  militaryPer1000?: number;
  /** A year of military spending, in US dollars. */
  militaryBudget?: number;
  /** A year of military spending for each active soldier, in US dollars. */
  spendingPerSoldier?: number;
  /** The capital's share of the whole population, in per cent. */
  capitalShare?: number;
  /** People living in towns and cities. */
  urbanPopulation?: number;
  /** The capital's share of the urban population, in per cent. */
  capitalShareOfUrban?: number;
  /** A year of government spending, in US dollars. */
  governmentBudget?: number;
  /** A year of government spending per person, in US dollars. */
  governmentSpendingPerPerson?: number;
  /** Military spending as a share of all government spending, in per cent. */
  militaryShareOfGovernment?: number;
}

function ratio(top: number | undefined, bottom: number | undefined, scale = 1): number | undefined {
  if (top === undefined || bottom === undefined || bottom <= 0) return undefined;
  const result = (top / bottom) * scale;
  return Number.isFinite(result) ? result : undefined;
}

function product(first: number | undefined, second: number | undefined, scale = 1): number | undefined {
  if (first === undefined || second === undefined) return undefined;
  const result = first * second * scale;
  return Number.isFinite(result) ? result : undefined;
}

export function derive(inputs: Inputs): Derived {
  const result: Derived = {};
  const put = <K extends keyof Derived>(key: K, value: number | undefined): void => {
    if (value !== undefined) result[key] = value;
  };

  put('density', ratio(inputs.population, inputs.area));
  put('gdpPerPerson', ratio(inputs.gdp, inputs.population));
  put('gdpPppPerPerson', ratio(inputs.gdpPpp, inputs.population));
  put('priceLevel', ratio(inputs.gdp, inputs.gdpPpp, 100));
  put('militaryPer1000', ratio(inputs.military, inputs.population, 1000));

  const militaryBudget = product(inputs.gdp, inputs.militarySpending, 0.01);
  put('militaryBudget', militaryBudget);
  put('spendingPerSoldier', ratio(militaryBudget, inputs.military));

  put('capitalShare', ratio(inputs.capitalPopulation, inputs.population, 100));
  const urbanPopulation = product(inputs.population, inputs.urbanShare, 0.01);
  put('urbanPopulation', urbanPopulation);
  put('capitalShareOfUrban', ratio(inputs.capitalPopulation, urbanPopulation, 100));

  const governmentBudget = product(inputs.gdp, inputs.governmentSpending, 0.01);
  put('governmentBudget', governmentBudget);
  put('governmentSpendingPerPerson', ratio(governmentBudget, inputs.population));
  put('militaryShareOfGovernment', ratio(inputs.militarySpending, inputs.governmentSpending, 100));

  return result;
}
