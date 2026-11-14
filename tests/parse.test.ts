import { describe, expect, it } from 'vitest';
import { parseInput, parseNumber } from '../src/stats/parse';

function value(text: string): number {
  const result = parseNumber(text);
  if (!result.ok) throw new Error(`"${text}" was refused`);
  return result.value;
}

describe('parseNumber', () => {
  it.each([
    ['48200000', 48_200_000],
    ['48,200,000', 48_200_000],
    ['48 200 000', 48_200_000],
    ['48 200 000', 48_200_000],
    ["48'200'000", 48_200_000],
    ['48.200.000', 48_200_000],
    ['1,234.5', 1234.5],
    ['1.234.567,5', 1_234_567.5],
    ['512,000', 512_000],
    ['79.4', 79.4],
    ['6,5', 6.5],
    ['.5', 0.5],
    ['0', 0],
    ['-2.1', -2.1],
    ['−2.1', -2.1],
    ['+3', 3],
  ])('reads %s', (text, expected) => {
    expect(value(text)).toBeCloseTo(expected, 9);
  });

  it.each([
    ['48.2 million', 48_200_000],
    ['48.2m', 48_200_000],
    ['48.2 M', 48_200_000],
    ['48.2mn', 48_200_000],
    ['512k', 512_000],
    ['512 thousand', 512_000],
    ['1.94 trillion', 1.94e12],
    ['1.94tn', 1.94e12],
    ['1.94 T', 1.94e12],
    ['3.2 billion', 3.2e9],
    ['3.2bn', 3.2e9],
    ['3.2 B', 3.2e9],
  ])('reads the scale in %s', (text, expected) => {
    expect(value(text)).toBeCloseTo(expected, 3);
  });

  it.each([
    ['$1.94 trillion', 1.94e12],
    ['US$1.94tn', 1.94e12],
    ['1.94 trillion USD', 1.94e12],
    ['1.94 trillion US dollars', 1.94e12],
    ['6.5%', 6.5],
    ['6.5% a year', 6.5],
    ['6.5 % per year', 6.5],
    ['6.5 percent', 6.5],
    ['6.5 per cent', 6.5],
    ['2.4% of GDP', 2.4],
    ['20% of people', 20],
    ['79.4 years', 79.4],
    ['512,000 km²', 512_000],
    ['512,000 km2', 512_000],
    ['512,000 sq km', 512_000],
    ['410,000 soldiers', 410_000],
    ['48.2 million people', 48_200_000],
    ['2.1 births per woman', 2.1],
    ['2.1 children per woman', 2.1],
    ['  42  ', 42],
    ['42.', 42],
  ])('ignores the unit in %s', (text, expected) => {
    expect(value(text)).toBeCloseTo(expected, 3);
  });

  it.each(['', '   '])('treats "%s" as empty, not as an error', (text) => {
    expect(parseNumber(text)).toEqual({ ok: false, empty: true });
  });

  it.each([
    'lots',
    'about 5',
    '5 to 6',
    '5-6',
    '1.2.3',
    '1,2,3',
    '12 bananas',
    '5 million bananas',
    'million',
    '--5',
    '1e9',
    '0x10',
    'NaN',
    'Infinity',
    '5 %%%x',
  ])('refuses "%s" with a message', (text) => {
    const result = parseNumber(text);
    expect(result.ok).toBe(false);
    if (!result.ok && !result.empty) expect(result.message.length).toBeGreaterThan(5);
    else throw new Error('expected a message');
  });

  it('never returns a number that is not finite', () => {
    const result = parseNumber(`${'9'.repeat(400)} trillion`);
    expect(result.ok).toBe(false);
  });
});

describe('parseInput', () => {
  it('rounds people to whole numbers', () => {
    expect(parseInput('population', '48.2 million')).toEqual({ ok: true, value: 48_200_000 });
    expect(parseInput('population', '1.4')).toEqual({ ok: true, value: 1 });
  });

  it('keeps decimals where they mean something', () => {
    expect(parseInput('lifeExpectancy', '79.4')).toEqual({ ok: true, value: 79.4 });
    expect(parseInput('growth', '-3.5% a year')).toEqual({ ok: true, value: -3.5 });
  });

  it('refuses a negative population in plain words', () => {
    const result = parseInput('population', '-5');
    expect(result).toEqual({ ok: false, empty: false, message: 'Population can’t be below zero.' });
  });

  it('refuses values past the limits', () => {
    expect(parseInput('urbanShare', '140%').ok).toBe(false);
    expect(parseInput('lifeExpectancy', '900').ok).toBe(false);
    expect(parseInput('growth', '-150').ok).toBe(false);
    expect(parseInput('population', '5 trillion').ok).toBe(false);
  });

  it('accepts the edges of the limits', () => {
    expect(parseInput('urbanShare', '100')).toEqual({ ok: true, value: 100 });
    expect(parseInput('urbanShare', '0')).toEqual({ ok: true, value: 0 });
    expect(parseInput('population', '1')).toEqual({ ok: true, value: 1 });
  });

  it('passes empty through', () => {
    expect(parseInput('area', '')).toEqual({ ok: false, empty: true });
  });
});
