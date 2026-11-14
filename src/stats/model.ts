// A nation's numbers: the twelve inputs, all optional, each with a unit and
// limits. Everything that arrives from a link, a file or a text box passes
// through `cleanInputs`, so the rest of the engine can trust what it gets.

/** The twelve numbers a person can enter (GDP counts twice: nominal and PPP). */
export type InputKey =
  | 'population'
  | 'area'
  | 'gdp'
  | 'gdpPpp'
  | 'growth'
  | 'lifeExpectancy'
  | 'fertility'
  | 'urbanShare'
  | 'capitalPopulation'
  | 'military'
  | 'militarySpending'
  | 'governmentSpending';

/** How a number is written and read. */
export type Unit =
  | 'people'
  | 'km2'
  | 'usd'
  | 'intl-usd'
  | 'percent'
  | 'percent-a-year'
  | 'percent-of-gdp'
  | 'years'
  | 'births';

export interface InputSpec {
  key: InputKey;
  /** The label beside the box. */
  label: string;
  /** The unit shown with the label, in words. */
  unitLabel: string;
  unit: Unit;
  /** The lowest and highest value accepted. Outside these the number is refused, not clamped. */
  min: number;
  max: number;
  /** Whole numbers only (people, soldiers). */
  integer: boolean;
  /** A one-line hint under the box. */
  hint: string;
}

/**
 * The inputs, in the order the page shows them. The limits are the profile
 * schema's where it has them, and are only there to stop nonsense; whether a
 * number is believable is the checks' job.
 */
export const INPUTS: readonly InputSpec[] = [
  {
    key: 'population',
    label: 'Population',
    unitLabel: 'people',
    unit: 'people',
    min: 0,
    max: 1e12,
    integer: true,
    hint: 'Everyone who lives there.',
  },
  {
    key: 'area',
    label: 'Area',
    unitLabel: 'km²',
    unit: 'km2',
    min: 0,
    max: 1e10,
    integer: false,
    hint: 'Land area in square kilometres.',
  },
  {
    key: 'gdp',
    label: 'GDP, nominal',
    unitLabel: 'US dollars',
    unit: 'usd',
    min: 0,
    max: 1e16,
    integer: false,
    hint: 'A year of output at market exchange rates.',
  },
  {
    key: 'gdpPpp',
    label: 'GDP, PPP',
    unitLabel: 'international dollars',
    unit: 'intl-usd',
    min: 0,
    max: 1e16,
    integer: false,
    hint: 'The same output, counted at what money buys at home.',
  },
  {
    key: 'growth',
    label: 'Real GDP growth',
    unitLabel: '% a year',
    unit: 'percent-a-year',
    min: -100,
    max: 1000,
    integer: false,
    hint: 'The usual yearly growth over a decade, after inflation.',
  },
  {
    key: 'lifeExpectancy',
    label: 'Life expectancy',
    unitLabel: 'years',
    unit: 'years',
    min: 0,
    max: 200,
    integer: false,
    hint: 'At birth, for everyone.',
  },
  {
    key: 'fertility',
    label: 'Fertility rate',
    unitLabel: 'births per woman',
    unit: 'births',
    min: 0,
    max: 20,
    integer: false,
    hint: 'Children born to an average woman over her life.',
  },
  {
    key: 'urbanShare',
    label: 'Urban share',
    unitLabel: '% of people',
    unit: 'percent',
    min: 0,
    max: 100,
    integer: false,
    hint: 'The share living in towns and cities.',
  },
  {
    key: 'capitalPopulation',
    label: 'Capital population',
    unitLabel: 'people',
    unit: 'people',
    min: 0,
    max: 1e12,
    integer: true,
    hint: 'The capital with its suburbs.',
  },
  {
    key: 'military',
    label: 'Active military',
    unitLabel: 'people',
    unit: 'people',
    min: 0,
    max: 1e12,
    integer: true,
    hint: 'Full-time personnel, without reserves.',
  },
  {
    key: 'militarySpending',
    label: 'Military spending',
    unitLabel: '% of GDP',
    unit: 'percent-of-gdp',
    min: 0,
    max: 100,
    integer: false,
    hint: 'A year of defence spending against GDP.',
  },
  {
    key: 'governmentSpending',
    label: 'Government spending',
    unitLabel: '% of GDP',
    unit: 'percent-of-gdp',
    min: 0,
    max: 200,
    integer: false,
    hint: 'A year of government spending against GDP.',
  },
];

export const INPUT_KEYS: readonly InputKey[] = INPUTS.map((spec) => spec.key);

const SPECS = new Map<InputKey, InputSpec>(INPUTS.map((spec) => [spec.key, spec]));

export function inputSpec(key: InputKey): InputSpec {
  const spec = SPECS.get(key);
  if (!spec) throw new Error(`No such input: ${key}`);
  return spec;
}

export function isInputKey(value: unknown): value is InputKey {
  return typeof value === 'string' && SPECS.has(value as InputKey);
}

/** The numbers entered so far. A missing key means "not given". */
export type Inputs = { readonly [K in InputKey]?: number };

/** A nation as the tool holds it: a name and its numbers. */
export interface Nation {
  /** The nation's name, for the heading and the exports. May be empty. */
  name: string;
  inputs: Inputs;
}

export const NAME_MAX = 80;

/** One value, checked: a finite number inside the input's limits, or nothing. */
export function cleanValue(key: InputKey, value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  const spec = inputSpec(key);
  if (value < spec.min || value > spec.max) return undefined;
  if (spec.integer) return Math.round(value);
  return value;
}

/** Whatever arrived, reduced to known keys with usable numbers. Never throws. */
export function cleanInputs(raw: unknown): Inputs {
  const result: { [K in InputKey]?: number } = {};
  if (typeof raw !== 'object' || raw === null) return result;
  for (const key of INPUT_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(raw, key)) continue;
    const value = cleanValue(key, (raw as Record<string, unknown>)[key]);
    if (value !== undefined) result[key] = value;
  }
  return result;
}

/** A name, trimmed, on one line, without control characters, at most NAME_MAX long. */
export function cleanName(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_MAX)
    .trim();
}

export function cleanNation(raw: unknown): Nation {
  const source = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return { name: cleanName(source.name), inputs: cleanInputs(source.inputs) };
}

export function emptyNation(): Nation {
  return { name: '', inputs: {} };
}

/** The same inputs with one value set, or removed when `value` is undefined or unusable. */
export function withInput(inputs: Inputs, key: InputKey, value: number | undefined): Inputs {
  const next: { [K in InputKey]?: number } = { ...inputs };
  const clean = value === undefined ? undefined : cleanValue(key, value);
  if (clean === undefined) delete next[key];
  else next[key] = clean;
  return next;
}

/** How many numbers have been given. */
export function countInputs(inputs: Inputs): number {
  return INPUT_KEYS.filter((key) => inputs[key] !== undefined).length;
}
