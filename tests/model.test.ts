import { describe, expect, it } from 'vitest';
import {
  INPUTS,
  INPUT_KEYS,
  NAME_MAX,
  cleanInputs,
  cleanName,
  cleanNation,
  cleanValue,
  countInputs,
  emptyNation,
  inputSpec,
  isInputKey,
  withInput,
} from '../src/stats/model';

describe('the inputs', () => {
  it('are the twelve numbers of the brief, each once', () => {
    expect(INPUT_KEYS).toEqual([
      'population',
      'area',
      'gdp',
      'gdpPpp',
      'growth',
      'lifeExpectancy',
      'fertility',
      'urbanShare',
      'capitalPopulation',
      'military',
      'militarySpending',
      'governmentSpending',
    ]);
    expect(new Set(INPUT_KEYS).size).toBe(INPUT_KEYS.length);
  });

  it('each have a label, a unit in words, a hint and limits that make sense', () => {
    for (const spec of INPUTS) {
      expect(spec.label.length).toBeGreaterThan(2);
      expect(spec.unitLabel.length).toBeGreaterThan(0);
      expect(spec.hint.endsWith('.')).toBe(true);
      expect(spec.min).toBeLessThan(spec.max);
      expect(inputSpec(spec.key)).toBe(spec);
    }
  });

  it('know their own keys', () => {
    expect(isInputKey('population')).toBe(true);
    expect(isInputKey('__proto__')).toBe(false);
    expect(isInputKey('toString')).toBe(false);
    expect(isInputKey(3)).toBe(false);
  });
});

describe('cleanValue', () => {
  it('keeps a number inside the limits', () => {
    expect(cleanValue('lifeExpectancy', 79.4)).toBe(79.4);
    expect(cleanValue('growth', -4)).toBe(-4);
  });

  it('rounds whole-number inputs', () => {
    expect(cleanValue('population', 48_200_000.6)).toBe(48_200_001);
    expect(cleanValue('military', 0.2)).toBe(0);
  });

  it('refuses rather than clamps', () => {
    expect(cleanValue('urbanShare', 101)).toBeUndefined();
    expect(cleanValue('population', -1)).toBeUndefined();
    expect(cleanValue('lifeExpectancy', 201)).toBeUndefined();
  });

  it('refuses anything that is not a finite number', () => {
    for (const bad of [NaN, Infinity, -Infinity, '5', null, undefined, {}, [], true]) {
      expect(cleanValue('population', bad)).toBeUndefined();
    }
  });
});

describe('cleanInputs', () => {
  it('keeps known keys with usable numbers and drops the rest', () => {
    expect(
      cleanInputs({
        population: 48_200_000,
        area: '512000',
        gdp: 1.94e12,
        nonsense: 5,
        urbanShare: 400,
        fertility: NaN,
      }),
    ).toEqual({ population: 48_200_000, gdp: 1.94e12 });
  });

  it('survives anything', () => {
    for (const raw of [null, undefined, 5, 'x', [], () => 1]) {
      expect(cleanInputs(raw)).toEqual({});
    }
  });

  it('does not read inherited keys', () => {
    const raw = Object.create({ population: 5 }) as object;
    expect(cleanInputs(raw)).toEqual({});
  });
});

describe('cleanName', () => {
  it('trims, joins lines and caps the length', () => {
    expect(cleanName('  Republic of\n Teland  ')).toBe('Republic of Teland');
    expect(cleanName('a'.repeat(200))).toHaveLength(NAME_MAX);
    expect(cleanName('Tab\there\u0000')).toBe('Tab here');
  });

  it('turns anything else into an empty name', () => {
    expect(cleanName(5)).toBe('');
    expect(cleanName(null)).toBe('');
  });
});

describe('nations', () => {
  it('start empty', () => {
    expect(emptyNation()).toEqual({ name: '', inputs: {} });
    expect(countInputs(emptyNation().inputs)).toBe(0);
  });

  it('are cleaned as a whole', () => {
    expect(cleanNation({ name: ' Teland ', inputs: { population: 5, bogus: 1 }, extra: true })).toEqual({
      name: 'Teland',
      inputs: { population: 5 },
    });
    expect(cleanNation('nope')).toEqual({ name: '', inputs: {} });
  });

  it('set and remove one input without touching the others', () => {
    const first = withInput({}, 'population', 100);
    const second = withInput(first, 'area', 50);
    expect(first).toEqual({ population: 100 });
    expect(second).toEqual({ population: 100, area: 50 });
    expect(withInput(second, 'population', undefined)).toEqual({ area: 50 });
    expect(withInput(second, 'area', -1)).toEqual({ population: 100 });
    expect(countInputs(second)).toBe(2);
  });
});
