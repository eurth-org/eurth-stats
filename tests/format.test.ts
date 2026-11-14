import { describe, expect, it } from 'vitest';
import { count, dollars, fixed, inWords, list, percent, plain, sentenceCase, whole } from '../src/stats/format';

describe('format', () => {
  it('writes plain numbers to three significant figures, grouped', () => {
    expect(plain(94.14)).toBe('94.1');
    expect(plain(40250.4)).toBe('40,250');
    expect(plain(0.853)).toBe('0.853');
    expect(plain(0.853, 2)).toBe('0.85');
    expect(plain(8.506, 2)).toBe('8.5');
    expect(plain(1234567)).toBe('1,234,567');
    expect(plain(0)).toBe('0');
    expect(plain(-2.5)).toBe('-2.5');
    expect(plain(NaN)).toBe('');
  });

  it('writes whole numbers with every digit', () => {
    expect(whole(48_200_000)).toBe('48,200,000');
    expect(whole(9491.6)).toBe('9,492');
  });

  it('writes a fixed number of decimals without trailing zeros', () => {
    expect(fixed(79.44)).toBe('79.4');
    expect(fixed(80)).toBe('80');
    expect(fixed(1.7, 2)).toBe('1.7');
    expect(fixed(1.465, 2)).toBe('1.47');
  });

  it('writes big numbers in words', () => {
    expect(inWords(48_200_000)).toBe('48.2 million');
    expect(inWords(1.94e12)).toBe('1.94 trillion');
    expect(inWords(3.2e9)).toBe('3.2 billion');
    expect(inWords(1_463_870_000)).toBe('1.46 billion');
    expect(inWords(999_600)).toBe('1 million');
    expect(inWords(512_000)).toBe('512,000');
    expect(inWords(9492)).toBe('9,490');
    expect(inWords(2.084)).toBe('2.08');
    expect(inWords(1)).toBe('1');
  });

  it('writes dollars', () => {
    expect(dollars(40_248.96)).toBe('$40,200');
    expect(dollars(1.94e12)).toBe('$1.94 trillion');
    expect(dollars(873.9)).toBe('$874');
    expect(dollars(233.8)).toBe('$234');
    expect(dollars(1_200_000)).toBe('$1.2 million');
    expect(dollars(-500)).toBe('−$500');
  });

  it('writes percentages with as many decimals as they deserve', () => {
    expect(percent(6.5)).toBe('6.5%');
    expect(percent(20.33)).toBe('20%');
    expect(percent(0.853)).toBe('0.85%');
    expect(percent(2)).toBe('2%');
    expect(percent(100)).toBe('100%');
    expect(percent(-3)).toBe('−3%');
    expect(percent(-0.001)).toBe('0%');
    expect(percent(0)).toBe('0%');
  });

  it('writes lists, counts and sentence case', () => {
    expect(list([])).toBe('');
    expect(list(['Spain'])).toBe('Spain');
    expect(list(['Ireland', 'Guyana'])).toBe('Ireland and Guyana');
    expect(list(['A', 'B', 'C'])).toBe('A, B and C');
    expect(count(1, 'country', 'countries')).toBe('1 country');
    expect(count(3, 'country', 'countries')).toBe('3 countries');
    expect(sentenceCase('the Netherlands')).toBe('The Netherlands');
  });
});
