// Example nations: fictional countries that show what each verdict looks
// like. The Examples page links each one into the checker, and the tests
// hold each to the verdicts its note promises.

import type { Nation } from './model';

export interface Example {
  /** A short id for the page's anchors. */
  id: string;
  nation: Nation;
  /** What the example shows, in a sentence or two. */
  note: string;
}

export const EXAMPLES: readonly Example[] = [
  {
    id: 'teland',
    nation: {
      name: 'Republic of Teland',
      inputs: {
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
      },
    },
    note: 'A well-off country the size of Spain. Everything holds up except its growth: a rich economy that keeps growing at 6.5% a year needs a story.',
  },
  {
    id: 'calderwyn',
    nation: {
      name: 'Kingdom of Calderwyn',
      inputs: {
        population: 12_480_000,
        area: 148_300,
        gdp: 512e9,
        gdpPpp: 610e9,
        growth: 1.8,
        lifeExpectancy: 80.6,
        fertility: 1.6,
        urbanShare: 74,
        capitalPopulation: 1_900_000,
        military: 38_500,
        militarySpending: 1.6,
        governmentSpending: 41,
      },
    },
    note: 'A small, comfortable trading kingdom with nothing out of line. This is what an all-plausible nation looks like.',
  },
  {
    id: 'vantmoor',
    nation: {
      name: 'Republic of Vantmoor',
      inputs: { population: 3_950_000, area: 61_200, gdp: 87.4e9, lifeExpectancy: 78.2 },
    },
    note: 'Only four numbers. Stats checks what it can and leaves the rest alone: every input is optional.',
  },
  {
    id: 'marrow',
    nation: {
      name: 'Free City of Marrow',
      inputs: {
        population: 5_400_000,
        area: 690,
        gdp: 430e9,
        gdpPpp: 520e9,
        growth: 3.1,
        lifeExpectancy: 83.5,
        fertility: 1.1,
        urbanShare: 100,
        capitalPopulation: 5_400_000,
        military: 52_000,
        militarySpending: 2.9,
        governmentSpending: 16,
      },
    },
    note: 'A city-state: crowded, rich and all capital. Its density and its capital share are a stretch, and both have real precedents.',
  },
  {
    id: 'kharvela',
    nation: {
      name: 'Kharvela Union',
      inputs: {
        population: 96_000_000,
        area: 1_150_000,
        gdp: 118e9,
        gdpPpp: 390e9,
        growth: 5.4,
        lifeExpectancy: 63.5,
        fertility: 4.6,
        urbanShare: 31,
        capitalPopulation: 5_100_000,
        military: 160_000,
        militarySpending: 1.3,
        governmentSpending: 15,
      },
    },
    note: 'A large, young, low-income country. Numbers that would be unlikely for a rich nation are ordinary here, because each is compared with countries of similar income.',
  },
  {
    id: 'skarn',
    nation: {
      name: 'Fortress Republic of Skarn',
      inputs: {
        population: 9_300_000,
        area: 88_000,
        gdp: 61e9,
        gdpPpp: 150e9,
        growth: 1.2,
        lifeExpectancy: 71.8,
        fertility: 2.4,
        urbanShare: 58,
        capitalPopulation: 1_400_000,
        military: 260_000,
        militarySpending: 9.5,
        governmentSpending: 34,
      },
    },
    note: 'A garrison state: 28 soldiers for every 1,000 people and nearly a tenth of GDP on defence. A stretch, with a handful of real countries for company.',
  },
  {
    id: 'solace',
    nation: {
      name: 'Serene Commonwealth of Solace',
      inputs: {
        population: 22_000_000,
        area: 240_000,
        gdp: 7.5e12,
        gdpPpp: 7.9e12,
        growth: 24,
        lifeExpectancy: 96,
        fertility: 2.1,
        urbanShare: 85,
        capitalPopulation: 3_000_000,
        military: 0,
        militarySpending: 0,
        governmentSpending: 30,
      },
    },
    note: 'A utopia: richer than Monaco, growing faster than any real economy, with people living to 96. Each of those is beyond every real country today.',
  },
  {
    id: 'vast',
    nation: {
      name: 'Eternal Empire of Vast',
      inputs: {
        population: 6_000_000_000,
        area: 2_400_000,
        gdp: 9e12,
        growth: 2.5,
        lifeExpectancy: 74,
        fertility: 2.3,
        urbanShare: 60,
        capitalPopulation: 450_000_000,
        military: 480_000_000,
        militarySpending: 22,
        governmentSpending: 18,
      },
    },
    note: 'Six billion people on the land of Algeria, a twelfth of them under arms, and a military that outspends its own government. Stats explains, one number at a time, why it can’t work.',
  },
];

export function findExample(id: string): Example | undefined {
  return EXAMPLES.find((example) => example.id === id);
}
