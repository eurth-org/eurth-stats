// A nation lives in its link: the name and every number, in the query string,
// compact and versioned. Sharing a nation is sharing a link; nothing is kept
// on a server or in the browser.
//
//   ?v=1&n=Teland&p=48200000&a=512000&g=1.94e12&le=79.4
//
// Whatever arrives is checked before it is used: a link is someone else's input.

import { cleanName, cleanValue, type InputKey, type Nation } from './model';

/** The version this code writes. A link without a version is read as version 1. */
export const LINK_VERSION = 1;

/** The short name of each number in the link. Once released these never change; new ones are only added. */
export const LINK_KEYS: { readonly [K in InputKey]: string } = {
  population: 'p',
  area: 'a',
  gdp: 'g',
  gdpPpp: 'gp',
  growth: 'gr',
  lifeExpectancy: 'le',
  fertility: 'f',
  urbanShare: 'u',
  capitalPopulation: 'c',
  military: 'm',
  militarySpending: 'ms',
  governmentSpending: 'gs',
};

const NAME_KEY = 'n';
const VERSION_KEY = 'v';

/** A number as plainly as it can be written and read back exactly: 1940000000000 -> "1.94e12". */
export function compactNumber(value: number): string {
  const plain = String(value);
  const scientific = value.toExponential().replace('e+', 'e');
  // toExponential() gives the shortest digits that read back as the same number.
  return scientific.length < plain.length && Number(scientific) === value ? scientific : plain;
}

/** Only digits, a sign, a decimal point and an exponent: nothing that needs trusting. */
const NUMBER = /^-?(?:\d+\.?\d*|\.\d+)(?:e-?\d{1,3})?$/;

function readNumber(text: string): number | undefined {
  if (text.length > 30 || !NUMBER.test(text)) return undefined;
  const value = Number(text);
  return Number.isFinite(value) ? value : undefined;
}

/** The query string for a nation, without the "?". Empty for an empty nation. */
export function encodeLink(nation: Nation): string {
  const parts: string[] = [];
  const name = cleanName(nation.name);
  if (name !== '') parts.push(`${NAME_KEY}=${encodeURIComponent(name).replace(/%20/g, '+')}`);
  for (const key of Object.keys(LINK_KEYS) as InputKey[]) {
    const value = nation.inputs[key];
    if (value === undefined) continue;
    const clean = cleanValue(key, value);
    if (clean !== undefined) parts.push(`${LINK_KEYS[key]}=${compactNumber(clean)}`);
  }
  if (parts.length === 0) return '';
  return [`${VERSION_KEY}=${LINK_VERSION}`, ...parts].join('&');
}

export interface DecodedLink {
  nation: Nation;
  /** The version the link says it is. */
  version: number;
  /** True when the link was made by a later version of Stats: what could be read was read. */
  newer: boolean;
  /** True when the link held nothing Stats could use. */
  empty: boolean;
}

/** A nation from a query string, with or without its "?". Never throws; unknown or broken parts are dropped. */
export function decodeLink(query: string): DecodedLink {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(query.length > 4000 ? '' : query);
  } catch {
    params = new URLSearchParams();
  }

  const stated = Number(params.get(VERSION_KEY) ?? LINK_VERSION);
  const version = Number.isInteger(stated) && stated >= 1 && stated <= 1000 ? stated : LINK_VERSION;

  const inputs: { [K in InputKey]?: number } = {};
  for (const key of Object.keys(LINK_KEYS) as InputKey[]) {
    const text = params.get(LINK_KEYS[key]);
    if (text === null) continue;
    const number = readNumber(text);
    if (number === undefined) continue;
    const value = cleanValue(key, number);
    if (value !== undefined) inputs[key] = value;
  }

  const name = cleanName(params.get(NAME_KEY) ?? '');
  return {
    nation: { name, inputs },
    version,
    newer: version > LINK_VERSION,
    empty: name === '' && Object.keys(inputs).length === 0,
  };
}

/** The whole address for a nation: the tool's own address plus the query string. */
export function nationUrl(base: string, nation: Nation): string {
  const query = encodeLink(nation);
  const clean = base.replace(/[?#].*$/, '');
  return query === '' ? clean : `${clean}?${query}`;
}
