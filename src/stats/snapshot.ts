// The snapshot: real-world numbers for the member states of the United
// Nations, saved in the repo by tools/build-snapshot.mjs. This module gives
// it types; nothing here fetches anything.

import raw from '../data/snapshot.json';

/** Every number the snapshot can hold for a country. */
export type Metric =
  | 'population'
  | 'area'
  | 'gdp'
  | 'gdpPpp'
  | 'growth'
  | 'lifeExpectancy'
  | 'lifeExpectancyMale'
  | 'lifeExpectancyFemale'
  | 'fertility'
  | 'urbanShare'
  | 'largestCity'
  | 'military'
  | 'militarySpending'
  | 'governmentSpending'
  | 'under15'
  | 'over64'
  | 'density'
  | 'gdpPerPerson'
  | 'gdpPppPerPerson'
  | 'priceLevel'
  | 'largestCityShare'
  | 'militaryPer1000'
  | 'spendingPerSoldier';

export interface Country {
  /** ISO 3166-1 alpha-3, for example "ESP". */
  iso3: string;
  /** The everyday English name. */
  name: string;
  /** True when the name takes "the" in a sentence: "the Netherlands". */
  article?: boolean;
  /** Each value with its year: [value, year]. */
  values: { [K in Metric]?: [number, number] };
}

export interface Source {
  name: string;
  publisher: string;
  url: string;
  licence: string;
  licenceUrl: string;
  /** The line to print wherever the data is shown. */
  attribution: string;
  note?: string;
}

export interface Indicator {
  /** The publisher's code for the series, for example "SP.POP.TOTL". */
  code: string;
  name: string;
  /** A key of `sources`. */
  source: string;
}

export interface Snapshot {
  /** The day the snapshot was built, as YYYY-MM-DD. */
  date: string;
  scope: string;
  sources: Record<string, Source>;
  indicators: Record<string, Indicator>;
  /** How the numbers that aren't a publisher's series were worked out. */
  derived: Record<string, string>;
  countries: Country[];
}

export const SNAPSHOT = raw as unknown as Snapshot;

/** A country's value for a metric, without its year. */
export function valueOf(country: Country, metric: Metric): number | undefined {
  return country.values[metric]?.[0];
}

/** The year a country's value is for. */
export function yearOf(country: Country, metric: Metric): number | undefined {
  return country.values[metric]?.[1];
}

/** A country's name as it reads inside a sentence: "Spain", "the Netherlands". */
export function nameOf(country: Country): string {
  return country.article ? `the ${country.name}` : country.name;
}

/** The snapshot's date in words: "14 November 2026". */
export function dateInWords(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  const month = months[Number(match[2]) - 1];
  if (!month) return date;
  return `${Number(match[3])} ${month} ${match[1]}`;
}
