// Builds src/data/snapshot.json: the real-world numbers every check is
// compared with. Run by hand (`npm run snapshot`), never by the site: the
// result is committed, and nothing is fetched at run time.
//
// Everything comes from the World Bank's World Development Indicators API.
// One series (military spending) is SIPRI's and carries SIPRI's own terms;
// see the `sources` block below, which the Data page prints.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const OUT = fileURLToPath(new URL('../src/data/snapshot.json', import.meta.url));
const API = 'https://api.worldbank.org/v2';

/** The first and last year asked for. Growth needs ten years; the rest take the newest year from NEWEST_FROM on. */
const FROM = 2012;
const TO = new Date().getUTCFullYear();
const NEWEST_FROM = TO - 7;

/** World Bank economies that are not member states of the United Nations. Everything else in its list is kept. */
const NOT_UN_MEMBERS = new Set([
  'ABW', 'ASM', 'BMU', 'VGB', 'CYM', 'CHI', 'CUW', 'FRO', 'PYF', 'GIB', 'GRL', 'GUM',
  'HKG', 'IMN', 'MAC', 'MAF', 'NCL', 'MNP', 'PRI', 'SXM', 'TCA', 'VIR', 'PSE', 'XKX',
]);

/** Everyday English names where the World Bank's are written for sorting. */
const NAMES = {
  BHS: 'Bahamas', BRN: 'Brunei', COD: 'DR Congo', COG: 'Republic of the Congo', CIV: "Côte d'Ivoire",
  EGY: 'Egypt', GMB: 'Gambia', IRN: 'Iran', PRK: 'North Korea', KOR: 'South Korea', KGZ: 'Kyrgyzstan',
  LAO: 'Laos', FSM: 'Micronesia', RUS: 'Russia', SVK: 'Slovakia', KNA: 'Saint Kitts and Nevis',
  LCA: 'Saint Lucia', VCT: 'Saint Vincent and the Grenadines', SYR: 'Syria', TUR: 'Türkiye',
  VEN: 'Venezuela', VNM: 'Vietnam', YEM: 'Yemen', STP: 'São Tomé and Príncipe', SOM: 'Somalia',
};

/** Countries whose name takes "the" in a sentence. */
const WITH_ARTICLE = new Set([
  'BHS', 'CAF', 'COD', 'COG', 'COM', 'DOM', 'GMB', 'MDV', 'MHL', 'NLD', 'PHL', 'SYC', 'SLB',
  'ARE', 'GBR', 'USA',
]);

const WORLD_BANK = 'world-bank';
const SIPRI = 'sipri';

/** key: [indicator code, source] */
const SERIES = {
  population: ['SP.POP.TOTL', WORLD_BANK],
  area: ['AG.LND.TOTL.K2', WORLD_BANK],
  gdp: ['NY.GDP.MKTP.CD', WORLD_BANK],
  gdpPpp: ['NY.GDP.MKTP.PP.CD', WORLD_BANK],
  growthYear: ['NY.GDP.MKTP.KD.ZG', WORLD_BANK],
  lifeExpectancy: ['SP.DYN.LE00.IN', WORLD_BANK],
  lifeExpectancyMale: ['SP.DYN.LE00.MA.IN', WORLD_BANK],
  lifeExpectancyFemale: ['SP.DYN.LE00.FE.IN', WORLD_BANK],
  fertility: ['SP.DYN.TFRT.IN', WORLD_BANK],
  urbanShare: ['SP.URB.TOTL.IN.ZS', WORLD_BANK],
  largestCity: ['EN.URB.LCTY', WORLD_BANK],
  military: ['MS.MIL.TOTL.P1', WORLD_BANK],
  militarySpending: ['MS.MIL.XPND.GD.ZS', SIPRI],
  governmentSpending: ['GC.XPN.TOTL.GD.ZS', WORLD_BANK],
  under15: ['SP.POP.0014.TO.ZS', WORLD_BANK],
  over64: ['SP.POP.65UP.TO.ZS', WORLD_BANK],
};

async function getJson(url) {
  // The API is quick when it answers and silent when it doesn't, so give up on a call early and try again.
  let lastError;
  for (let attempt = 1; attempt <= 10; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(25_000) });
      if (!response.ok) throw new Error(`${response.status} for ${url}`);
      const body = await response.json();
      if (!Array.isArray(body) || body.length < 2 || !Array.isArray(body[1])) {
        throw new Error(`Unexpected answer for ${url}: ${JSON.stringify(body).slice(0, 200)}`);
      }
      return body;
    } catch (error) {
      lastError = error;
      process.stdout.write('.');
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
  throw lastError;
}

/** One indicator for every economy: Map<iso3, Map<year, value>>. */
async function series(code) {
  const byCountry = new Map();
  let page = 1;
  let pages = 1;
  while (page <= pages) {
    const [meta, rows] = await getJson(
      `${API}/country/all/indicator/${code}?format=json&per_page=10000&date=${FROM}:${TO}&page=${page}`,
    );
    pages = meta.pages;
    for (const row of rows) {
      if (row.value === null || !row.countryiso3code) continue;
      if (!byCountry.has(row.countryiso3code)) byCountry.set(row.countryiso3code, new Map());
      byCountry.get(row.countryiso3code).set(Number(row.date), row.value);
    }
    page++;
  }
  return byCountry;
}

async function indicatorName(code) {
  const [, rows] = await getJson(`${API}/indicator/${code}?format=json`);
  return rows[0].name;
}

/** Six significant figures are plenty, and keep the file small. */
function tidy(value) {
  return Number(value.toPrecision(6));
}

/** The newest value from NEWEST_FROM on, as [value, year]. */
function newest(yearly) {
  if (!yearly) return undefined;
  for (let year = TO; year >= NEWEST_FROM; year--) {
    if (yearly.has(year)) return [yearly.get(year), year];
  }
  return undefined;
}

/** The value for one year, or the nearest year within two, so a ratio's two halves match. */
function near(yearly, year) {
  if (!yearly) return undefined;
  for (const step of [0, -1, 1, -2, 2]) {
    if (yearly.has(year + step)) return yearly.get(year + step);
  }
  return undefined;
}

/** Average yearly growth over the ten newest years, compounded; needs at least eight of them. */
function decadeGrowth(yearly) {
  if (!yearly) return undefined;
  const years = [...yearly.keys()].sort((a, b) => b - a);
  const last = years[0];
  if (last === undefined || last < NEWEST_FROM) return undefined;
  const used = years.filter((year) => year > last - 10);
  if (used.length < 8) return undefined;
  const product = used.reduce((total, year) => total * (1 + yearly.get(year) / 100), 1);
  if (product <= 0) return undefined;
  return [(Math.pow(product, 1 / used.length) - 1) * 100, last];
}

const [, economies] = await getJson(`${API}/country?format=json&per_page=400`);
const states = economies
  .filter((economy) => economy.region.value !== 'Aggregates' && !NOT_UN_MEMBERS.has(economy.id))
  .sort((a, b) => a.id.localeCompare(b.id));

const data = {};
const indicators = {};
for (const [key, [code, source]] of Object.entries(SERIES)) {
  process.stdout.write(`${code} ... `);
  data[key] = await series(code);
  indicators[key] = { code, name: await indicatorName(code), source };
  console.log(`${data[key].size} economies`);
}

const countries = states.map((state) => {
  const iso3 = state.id;
  const get = (key) => data[key].get(iso3);
  const values = {};
  const put = (key, pair) => {
    if (pair && Number.isFinite(pair[0])) values[key] = [tidy(pair[0]), pair[1]];
  };
  /** A ratio of two series, both taken for the numerator's newest year. */
  const ratio = (key, top, bottom, scale = 1) => {
    const pair = newest(get(top));
    if (!pair) return;
    const below = near(get(bottom), pair[1]);
    if (below === undefined || below <= 0) return;
    put(key, [(pair[0] / below) * scale, pair[1]]);
  };

  for (const key of [
    'population', 'area', 'gdp', 'gdpPpp', 'lifeExpectancy', 'lifeExpectancyMale', 'lifeExpectancyFemale',
    'fertility', 'urbanShare', 'largestCity', 'military', 'militarySpending', 'governmentSpending',
    'under15', 'over64',
  ]) {
    put(key, newest(get(key)));
  }
  put('growth', decadeGrowth(get('growthYear')));

  ratio('density', 'population', 'area');
  ratio('gdpPerPerson', 'gdp', 'population');
  ratio('gdpPppPerPerson', 'gdpPpp', 'population');
  ratio('priceLevel', 'gdp', 'gdpPpp', 100);
  ratio('largestCityShare', 'largestCity', 'population', 100);
  ratio('militaryPer1000', 'military', 'population', 1000);

  // Military spending per soldier. The personnel series is the older of the two, so its newest
  // year sets the year: that year's share of GDP, times that year's GDP, over that year's personnel.
  const personnel = newest(get('military'));
  if (personnel && personnel[0] > 0) {
    const share = near(get('militarySpending'), personnel[1]);
    const gdp = near(get('gdp'), personnel[1]);
    if (share !== undefined && gdp !== undefined) {
      put('spendingPerSoldier', [((share / 100) * gdp) / personnel[0], personnel[1]]);
    }
  }

  // A city can't hold more than everyone; the two series disagree by a hair for city states.
  if (values.largestCityShare && values.largestCityShare[0] > 100) values.largestCityShare[0] = 100;

  const country = { iso3, name: NAMES[iso3] ?? state.name };
  if (WITH_ARTICLE.has(iso3)) country.article = true;
  country.values = values;
  return country;
});

const awkward = countries.filter((country) => /[,.]/.test(country.name)).map((country) => country.name);
if (awkward.length) console.warn('Names that still read like an index:', awkward);

const snapshot = {
  $comment:
    'Real-world numbers for stats.eurth.org, built by tools/build-snapshot.mjs. Each value is [value, year]. Do not edit by hand: run `npm run snapshot` and commit the result.',
  date: new Date().toISOString().slice(0, 10),
  scope: 'The 193 member states of the United Nations, wherever a number is published.',
  sources: {
    [WORLD_BANK]: {
      name: 'World Development Indicators',
      publisher: 'The World Bank',
      url: 'https://databank.worldbank.org/source/world-development-indicators',
      licence: 'CC BY 4.0',
      licenceUrl: 'https://creativecommons.org/licenses/by/4.0/',
      attribution: 'World Development Indicators, The World Bank. Licensed under CC BY 4.0.',
      note:
        'The World Bank gathers these series from the UN Population Division (World Population Prospects, World Urbanization Prospects), the International Comparison Program, the International Institute for Strategic Studies (The Military Balance), the IMF (Government Finance Statistics) and national statistical offices.',
    },
    [SIPRI]: {
      name: 'SIPRI Military Expenditure Database',
      publisher: 'Stockholm International Peace Research Institute',
      url: 'https://www.sipri.org/databases/milex',
      licence: "SIPRI's terms and conditions: one year of one series, used without charge under its fair-use policy",
      licenceUrl: 'https://www.sipri.org/about/terms-and-conditions',
      attribution:
        'Information from the Stockholm International Peace Research Institute (SIPRI) Military Expenditure Database, https://www.sipri.org/databases/milex, as published in the World Development Indicators.',
    },
  },
  indicators,
  derived: {
    growth: 'Average yearly real GDP growth over the ten newest years, compounded (at least eight years needed).',
    density: 'population / area, people per square kilometre of land',
    gdpPerPerson: 'gdp / population, US dollars',
    gdpPppPerPerson: 'gdpPpp / population, international dollars',
    priceLevel: 'gdp / gdpPpp x 100: prices against the United States, where the United States is 100',
    largestCityShare: 'largestCity / population x 100, per cent',
    militaryPer1000: 'military / population x 1000',
    spendingPerSoldier: 'militarySpending / 100 x gdp / military, US dollars a year',
  },
  countries,
};

await writeFile(OUT, `${JSON.stringify(snapshot)}\n`);

const counts = {};
for (const country of countries) {
  for (const key of Object.keys(country.values)) counts[key] = (counts[key] ?? 0) + 1;
}
console.log(`\n${countries.length} countries, snapshot dated ${snapshot.date}`);
console.table(counts);
