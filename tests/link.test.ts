import { describe, expect, it } from 'vitest';
import { LINK_KEYS, LINK_VERSION, compactNumber, decodeLink, encodeLink, nationUrl } from '../src/stats/link';
import { INPUT_KEYS, type Nation } from '../src/stats/model';

const TELAND: Nation = {
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
};

describe('compactNumber', () => {
  it.each([
    [1.94e12, '1.94e12'],
    [48_200_000, '4.82e7'],
    [512_000, '512000'],
    [79.4, '79.4'],
    [6.5, '6.5'],
    [0, '0'],
    [1, '1'],
    [-3.5, '-3.5'],
    [100, '100'],
    [1000, '1e3'],
    [0.85, '0.85'],
    [123_456_789, '123456789'],
  ])('writes %s as %s', (value, expected) => {
    expect(compactNumber(value)).toBe(expected);
    expect(Number(compactNumber(value))).toBe(value);
  });
});

describe('encodeLink', () => {
  it('writes a short, readable, versioned query string', () => {
    expect(encodeLink(TELAND)).toBe(
      'v=1&n=Republic+of+Teland&p=4.82e7&a=512000&g=1.94e12&gp=2.6e12&gr=6.5&le=79.4&f=1.7&u=78&c=9.8e6&m=4.1e5&ms=2.4&gs=38',
    );
  });

  it('writes nothing for an empty nation', () => {
    expect(encodeLink({ name: '', inputs: {} })).toBe('');
    expect(encodeLink({ name: '   ', inputs: {} })).toBe('');
  });

  it('leaves out what was not given, and what is out of bounds', () => {
    expect(encodeLink({ name: '', inputs: { lifeExpectancy: 70 } })).toBe('v=1&le=70');
    expect(encodeLink({ name: '', inputs: { lifeExpectancy: 70, urbanShare: 400 } })).toBe('v=1&le=70');
  });

  it('escapes names so they survive a link', () => {
    const query = encodeLink({ name: 'Åland & Sons = 100%? #1', inputs: {} });
    expect(query).not.toMatch(/[ #?]|&\s|%(?![0-9A-F]{2})/);
    expect(decodeLink(query).nation.name).toBe('Åland & Sons = 100%? #1');
  });

  it('has a different short key for every input', () => {
    const keys = INPUT_KEYS.map((key) => LINK_KEYS[key]);
    expect(new Set([...keys, 'n', 'v']).size).toBe(INPUT_KEYS.length + 2);
    for (const key of keys) expect(key).toMatch(/^[a-z]{1,2}$/);
  });

  it('stays well inside what an address can hold', () => {
    const longest: Nation = { name: 'W'.repeat(80), inputs: Object.fromEntries(INPUT_KEYS.map((key) => [key, 1.23456789012345])) };
    expect(encodeLink(longest).length).toBeLessThan(500);
  });
});

describe('decodeLink', () => {
  it('reads back exactly what was written', () => {
    const decoded = decodeLink(encodeLink(TELAND));
    expect(decoded.nation).toEqual(TELAND);
    expect(decoded).toMatchObject({ version: LINK_VERSION, newer: false, empty: false });
  });

  it('round-trips awkward numbers', () => {
    const nation: Nation = { name: '', inputs: { growth: -12.345, gdp: 123_456_789_012.34, fertility: 0.1 + 0.2, population: 1 } };
    expect(decodeLink(encodeLink(nation)).nation).toEqual(nation);
  });

  it('accepts a leading question mark and plain digits', () => {
    expect(decodeLink('?p=48200000&le=79.4').nation.inputs).toEqual({ population: 48_200_000, lifeExpectancy: 79.4 });
  });

  it('reads a link without a version as version 1', () => {
    expect(decodeLink('p=5').version).toBe(1);
  });

  it('says so when the link is from a later version, and reads what it can', () => {
    const decoded = decodeLink('v=2&p=5&zz=9');
    expect(decoded.newer).toBe(true);
    expect(decoded.version).toBe(2);
    expect(decoded.nation.inputs).toEqual({ population: 5 });
  });

  it('is empty for nothing, and for nothing usable', () => {
    for (const query of ['', '?', 'v=1', 'x=1&y=2', 'p=abc', 'p=']) {
      expect(decodeLink(query)).toMatchObject({ empty: true, nation: { name: '', inputs: {} } });
    }
  });

  it.each([
    'p=1e999',
    'p=-5',
    'p=Infinity',
    'p=NaN',
    'p=0x10',
    'p=5;drop',
    'p=1,000',
    'p=5%20million',
    'u=101',
    'le=201',
    'p=' + '9'.repeat(40),
    'p=1e1000000',
  ])('drops a bad value: %s', (query) => {
    expect(decodeLink(query).nation.inputs).toEqual({});
  });

  it('keeps the good values next to a bad one', () => {
    expect(decodeLink('p=abc&le=70&u=900&f=2').nation.inputs).toEqual({ lifeExpectancy: 70, fertility: 2 });
  });

  it('cleans the name', () => {
    expect(decodeLink('n=%3Cscript%3E+Teland%0A%0A').nation.name).toBe('<script> Teland');
    expect(decodeLink(`n=${'a'.repeat(300)}`).nation.name).toHaveLength(80);
  });

  it('rounds people to whole numbers', () => {
    expect(decodeLink('p=10.6&m=2.2').nation.inputs).toEqual({ population: 11, military: 2 });
  });

  it('never throws, whatever arrives', () => {
    for (const query of ['%', '%E0%A4%A', '&&&===', 'n=%FF', '\u0000', 'v=banana&p=5', 'v=-1&p=5', 'v=1e99&p=5', 'p=1&p=2', 'x'.repeat(10_000)]) {
      expect(() => decodeLink(query)).not.toThrow();
    }
    expect(decodeLink('v=banana&p=5').version).toBe(1);
    expect(decodeLink('p=1&p=2').nation.inputs.population).toBe(1);
    expect(decodeLink(`p=5&n=${'x'.repeat(5000)}`).empty).toBe(true);
  });

  it('ignores keys it does not know, including dangerous-looking ones', () => {
    const decoded = decodeLink('__proto__=1&constructor=2&p=7');
    expect(decoded.nation.inputs).toEqual({ population: 7 });
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe('nationUrl', () => {
  it('puts the query on the tool’s address', () => {
    expect(nationUrl('https://stats.eurth.org/', { name: '', inputs: { population: 5 } })).toBe('https://stats.eurth.org/?v=1&p=5');
  });

  it('replaces any query or fragment already there', () => {
    expect(nationUrl('https://stats.eurth.org/?p=1#top', { name: 'X', inputs: {} })).toBe('https://stats.eurth.org/?v=1&n=X');
  });

  it('gives the bare address for an empty nation', () => {
    expect(nationUrl('https://stats.eurth.org/?p=1', { name: '', inputs: {} })).toBe('https://stats.eurth.org/');
  });
});
