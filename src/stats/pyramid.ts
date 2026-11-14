// An estimated population pyramid from two numbers: the fertility rate and
// life expectancy.
//
// How: a mortality curve is fitted to the life expectancy, and the fertility
// rate gives the rate at which each new generation is larger or smaller than
// the one before (Lotka's stable population). That alone would draw the
// pyramid a country reaches after a century of unchanged fertility. Real
// countries aren't there: their older generations were born when families
// were larger. So people over thirty follow a second rate, fitted to the real
// countries in the snapshot, and the result looks like a country of today
// with these two numbers.
//
// What it can't know: wars, baby booms, famines and migration. Real pyramids
// carry their history; this one has only the usual one. The page says so.

/** Ten-year bands, youngest first; the last is open-ended. */
export const BANDS = ['0–9', '10–19', '20–29', '30–39', '40–49', '50–59', '60–69', '70–79', '80+'] as const;

export interface PyramidBand {
  /** For example "30–39". */
  label: string;
  /** Men in this band, as a share of everyone (0 to 1). */
  male: number;
  /** Women in this band, as a share of everyone (0 to 1). */
  female: number;
}

export interface Pyramid {
  bands: PyramidBand[];
  /** The largest single bar, for scaling the drawing. */
  widest: number;
  /** Share of people under 15, in per cent. */
  under15: number;
  /** Share of people aged 15 to 64, in per cent. */
  workingAge: number;
  /** Share of people aged 65 and over, in per cent. */
  over64: number;
  /** The age that half the people are younger than. */
  medianAge: number;
  /** People under 15 or over 64 for every 100 aged 15 to 64. */
  dependencyRatio: number;
  /** Where the two numbers lead in the long run, in per cent a year, without migration. */
  longRunGrowth: number;
  /** Which way the population is heading in the long run on these two numbers alone. */
  shape: 'growing' | 'steady' | 'shrinking';
}

/** Life expectancies the mortality curve can be fitted to. */
export const LIFE_EXPECTANCY_MIN = 20;
export const LIFE_EXPECTANCY_MAX = 100;
/** Fertility rates the model accepts. Below the floor a stable population has no shape at all. */
export const FERTILITY_MIN = 0.3;
export const FERTILITY_MAX = 10;

/** Boys born for every girl. */
const BOYS_PER_GIRL = 1.05;
/** The average age of mothers at a birth, and so the length of a generation. */
const GENERATION = 29;
const OLDEST = 125;
const STEP = 0.25;

// Generations born before this many years ago follow the second rate.
const TURN = 30;
// The second rate, fitted to the countries of over a million people in the snapshot of 14 November
// 2026: for each, the rate that gives its real share of people over 64, set against the rate its
// fertility gives today. Older generations come from faster-growing times, by about 2.3% a year.
const OLDER_BASE = 0.0227;
const OLDER_SLOPE = 0.664;

// The mortality curve is Siler's (1979): deaths in infancy that fade fast, a
// steady background risk, and a risk that rises with age (Gompertz). Its five
// numbers move together along one path, from a high-mortality population
// (level 0, life expectancy about 40) to a low-mortality one (level 1, about
// 81), and the level is solved for the life expectancy asked for.
const HIGH_MORTALITY = { infant: 0.4, infantFade: 1.5, background: 0.008, slope: 0.075, modalAge: 72 };
const LOW_MORTALITY = { infant: 0.008, infantFade: 3, background: 0.00015, slope: 0.105, modalAge: 88 };

interface Curve {
  infant: number;
  infantFade: number;
  background: number;
  ageing: number;
  slope: number;
}

function between(low: number, high: number, level: number): number {
  return low + (high - low) * level;
}

function betweenLog(low: number, high: number, level: number): number {
  return Math.exp(between(Math.log(low), Math.log(high), level));
}

function curveAt(level: number): Curve {
  const held = Math.min(1, Math.max(0, level));
  const slope = between(HIGH_MORTALITY.slope, LOW_MORTALITY.slope, held);
  const modalAge = between(HIGH_MORTALITY.modalAge, LOW_MORTALITY.modalAge, level);
  return {
    infant: betweenLog(HIGH_MORTALITY.infant, LOW_MORTALITY.infant, level),
    infantFade: between(HIGH_MORTALITY.infantFade, LOW_MORTALITY.infantFade, held),
    background: betweenLog(HIGH_MORTALITY.background, LOW_MORTALITY.background, level),
    ageing: slope * Math.exp(-slope * modalAge),
    slope,
  };
}

/** The share of newborns still alive at an age. */
function alive(curve: Curve, age: number): number {
  const hazard =
    (curve.infant / curve.infantFade) * (1 - Math.exp(-curve.infantFade * age)) +
    curve.background * age +
    (curve.ageing / curve.slope) * (Math.exp(curve.slope * age) - 1);
  return Math.exp(-hazard);
}

function lifeExpectancyOf(curve: Curve): number {
  let years = 0;
  let before = 1;
  for (let age = STEP; age <= OLDEST; age += STEP) {
    const now = alive(curve, age);
    years += ((before + now) / 2) * STEP;
    before = now;
  }
  return years;
}

/** The curve whose life expectancy at birth is the one asked for. */
function fit(lifeExpectancy: number): Curve {
  let low = -0.6;
  let high = 2.4;
  for (let round = 0; round < 50; round++) {
    const middle = (low + high) / 2;
    if (lifeExpectancyOf(curveAt(middle)) < lifeExpectancy) low = middle;
    else high = middle;
  }
  return curveAt((low + high) / 2);
}

/**
 * How many years longer women live than men. Across real countries the gap
 * runs from about four to six years with no steady trend, so the model uses
 * five throughout; the tests hold that against the snapshot.
 */
export const SEX_GAP = 5;

/** A survival curve for a life expectancy: the share alive at each age. */
export function survival(lifeExpectancy: number): (age: number) => number {
  const held = Math.min(LIFE_EXPECTANCY_MAX, Math.max(LIFE_EXPECTANCY_MIN, lifeExpectancy));
  const curve = fit(held);
  return (age) => alive(curve, Math.max(0, age));
}

/** The life expectancy a survival curve implies; used by the tests to check the fit. */
export function lifeExpectancyFrom(curve: (age: number) => number): number {
  let years = 0;
  let before = 1;
  for (let age = STEP; age <= OLDEST; age += STEP) {
    const now = curve(age);
    years += ((before + now) / 2) * STEP;
    before = now;
  }
  return years;
}

/** Can a pyramid be drawn for these two numbers? */
export function canEstimate(fertility: number | undefined, lifeExpectancy: number | undefined): boolean {
  return (
    fertility !== undefined &&
    lifeExpectancy !== undefined &&
    fertility >= FERTILITY_MIN &&
    fertility <= FERTILITY_MAX &&
    lifeExpectancy >= LIFE_EXPECTANCY_MIN &&
    lifeExpectancy <= LIFE_EXPECTANCY_MAX
  );
}

/**
 * The estimated pyramid, or nothing when either number is missing or outside
 * what the model can handle.
 */
export function estimatePyramid(fertility: number | undefined, lifeExpectancy: number | undefined): Pyramid | undefined {
  if (fertility === undefined || lifeExpectancy === undefined || !canEstimate(fertility, lifeExpectancy)) {
    return undefined;
  }

  const women = survival(lifeExpectancy + SEX_GAP / 2);
  const men = survival(lifeExpectancy - SEX_GAP / 2);

  // Daughters per woman who live to have children of their own; above one the population grows.
  const daughters = (fertility / (1 + BOYS_PER_GIRL)) * women(GENERATION);
  const growth = Math.log(daughters) / GENERATION;

  // People at each age: births that many years ago, times the share still alive. Births shrink
  // into the past at today's rate for thirty years, and at the older generations' rate before that.
  const older = OLDER_BASE + OLDER_SLOPE * growth;
  const births = (age: number): number =>
    Math.exp(-(growth * Math.min(age, TURN) + older * Math.max(age - TURN, 0)));
  const bands = BANDS.map((label) => ({ label, male: 0, female: 0 }));
  let total = 0;
  let under15 = 0;
  let over64 = 0;
  const cumulative: number[] = [];
  for (let age = 0; age < OLDEST; age += STEP) {
    const middle = age + STEP / 2;
    const cohort = births(middle) * STEP;
    const male = BOYS_PER_GIRL * cohort * men(middle);
    const female = cohort * women(middle);
    const band = bands[Math.min(bands.length - 1, Math.floor(age / 10))];
    if (band) {
      band.male += male;
      band.female += female;
    }
    total += male + female;
    if (age < 15) under15 += male + female;
    if (age >= 65) over64 += male + female;
    cumulative.push(total);
  }

  for (const band of bands) {
    band.male /= total;
    band.female /= total;
  }

  const half = cumulative.findIndex((sum) => sum >= total / 2);
  const medianAge = (Math.max(0, half) + 0.5) * STEP;
  const youngShare = (under15 / total) * 100;
  const oldShare = (over64 / total) * 100;
  const workingAge = 100 - youngShare - oldShare;
  const longRunGrowth = (Math.exp(growth) - 1) * 100;

  return {
    bands,
    widest: Math.max(...bands.map((band) => Math.max(band.male, band.female))),
    under15: youngShare,
    workingAge,
    over64: oldShare,
    medianAge,
    dependencyRatio: ((youngShare + oldShare) / workingAge) * 100,
    longRunGrowth,
    shape: longRunGrowth > 0.25 ? 'growing' : longRunGrowth < -0.25 ? 'shrinking' : 'steady',
  };
}
