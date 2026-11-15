import { describe, expect, it } from 'vitest';
import { checkNation } from '../src/stats/check';
import { INPUT_KEYS, type Nation } from '../src/stats/model';
import {
  EXTRA_FIELDS,
  PROFILE_FIELDS,
  fromProfile,
  impliedMilitarySpending,
  summarise,
  toStatsSection,
  withStatsSection,
} from '../src/stats/profile';
import { SNAPSHOT } from '../src/stats/snapshot';

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
const NOW = new Date('2026-12-14T08:30:15.123Z');

/** A profile shaped like @eurth/profile's Calderwyn example, cut down. */
function calderwyn() {
  return {
    meta: { schema: 1, nation: 'Calderwyn', updated: '2026-11-13T21:05:44.000Z' },
    identity: { commonName: 'Calderwyn', officialName: 'Kingdom of Calderwyn', capital: 'Wynmouth' },
    flag: { link: 'https://flag.eurth.org/#s=h3', svg: '<svg/>' },
    government: {
      link: 'https://gov.eurth.org/#example-calderwyn',
      summary: 'A constitutional monarchy.',
      form: 'Parliamentary constitutional monarchy',
      headOfState: 'Queen Ysolde III',
    },
    stats: {
      link: 'https://stats.eurth.org/#example-calderwyn',
      summary: 'A small, well-off trading nation.',
      updated: '2026-11-07T16:45:09.000Z',
      population: 12_480_000,
      areaKm2: 148_300,
      gdpUsd: 512_000_000_000,
      gdpGrowth: 1.8,
      lifeExpectancy: 80.6,
      activeMilitary: 38_500,
      futureField: { kept: true },
    },
    futureSection: { anything: [1, 2, 3] },
  };
}

describe('the stats section', () => {
  it('uses the schema’s six drafted field names, and adds seven of its own', () => {
    expect(PROFILE_FIELDS).toMatchObject({
      population: 'population',
      area: 'areaKm2',
      gdp: 'gdpUsd',
      growth: 'gdpGrowth',
      lifeExpectancy: 'lifeExpectancy',
      military: 'activeMilitary',
    });
    expect([...EXTRA_FIELDS]).toEqual([
      'gdpPppUsd', 'fertilityRate', 'urbanShare', 'capitalPopulation', 'militarySpendingShare', 'governmentSpendingShare', 'snapshot',
    ]);
    expect(new Set(Object.values(PROFILE_FIELDS)).size).toBe(INPUT_KEYS.length);
  });

  it('holds the inputs, the snapshot date, a summary, the link and when it was written', () => {
    const section = toStatsSection(TELAND, checkNation(TELAND.inputs), NOW, 'https://stats.eurth.org/?v=1&p=4.82e7');
    expect(section).toEqual({
      link: 'https://stats.eurth.org/?v=1&p=4.82e7',
      summary: 'Republic of Teland: 12 plausible, 1 stretch against real-world ranges. Standing out: gdp growth.',
      updated: '2026-12-14T08:30:15Z',
      snapshot: SNAPSHOT.date,
      population: 48_200_000,
      areaKm2: 512_000,
      gdpUsd: 1.94e12,
      gdpPppUsd: 2.6e12,
      gdpGrowth: 6.5,
      lifeExpectancy: 79.4,
      fertilityRate: 1.7,
      urbanShare: 78,
      capitalPopulation: 9_800_000,
      activeMilitary: 410_000,
      militarySpendingShare: 2.4,
      governmentSpendingShare: 38,
    });
  });

  it('fits the profile schema’s rules for the shared fields', () => {
    const section = toStatsSection(TELAND, checkNation(TELAND.inputs), NOW, 'https://stats.eurth.org/?v=1&p=4.82e7');
    expect(section.updated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?(Z|[+-]\d{2}:\d{2})$/);
    expect(section.link).toMatch(/^https:\/\/[!-~]+$/);
    expect(section.summary!.length).toBeLessThanOrEqual(600);
    expect(Number.isInteger(section.population)).toBe(true);
    expect(Number.isInteger(section.activeMilitary)).toBe(true);
  });

  it('leaves out a link that is not https, has spaces or is too long', () => {
    const report = checkNation(TELAND.inputs);
    expect(toStatsSection(TELAND, report, NOW, 'http://stats.eurth.org/')).not.toHaveProperty('link');
    expect(toStatsSection(TELAND, report, NOW, 'https://stats.eurth.org/?n=a b')).not.toHaveProperty('link');
    expect(toStatsSection(TELAND, report, NOW, `https://stats.eurth.org/?${'x'.repeat(4000)}`)).not.toHaveProperty('link');
    expect(toStatsSection(TELAND, report, NOW)).not.toHaveProperty('link');
  });

  it('leaves out numbers that were not given', () => {
    const nation: Nation = { name: 'Small', inputs: { population: 5000 } };
    const section = toStatsSection(nation, checkNation(nation.inputs), NOW);
    expect(Object.keys(section).sort()).toEqual(['population', 'snapshot', 'summary', 'updated']);
  });
});

describe('summarise', () => {
  it('says so when everything checked is within range', () => {
    const nation: Nation = { name: 'Calderwyn', inputs: { population: 12_480_000, area: 148_300, lifeExpectancy: 80.6 } };
    expect(summarise(nation, checkNation(nation.inputs))).toBe('Calderwyn: all 2 numbers checked are within real-world ranges.');
  });

  it('copes with one check, none, and no name', () => {
    expect(summarise({ name: '', inputs: { lifeExpectancy: 75 } }, checkNation({ lifeExpectancy: 75 }))).toBe(
      'This nation: the one number checked is within real-world ranges.',
    );
    expect(summarise({ name: 'X', inputs: { population: 5 } }, checkNation({ population: 5 }))).toBe(
      'X has numbers on file, but too few to check yet.',
    );
  });

  it('names what stands out', () => {
    const inputs = { fertility: 9, lifeExpectancy: 30 };
    expect(summarise({ name: 'Odd', inputs }, checkNation(inputs))).toBe(
      'Odd: 2 unlikely against real-world ranges. Standing out: life expectancy, fertility rate.',
    );
  });
});

describe('withStatsSection', () => {
  it('replaces the stats section and leaves every other section, and unknown keys, alone', () => {
    const before = calderwyn();
    const copy = structuredClone(before);
    const section = toStatsSection(TELAND, checkNation(TELAND.inputs), NOW);
    const after = withStatsSection(before, section);

    expect(before).toEqual(copy);
    expect(after.meta).toEqual(copy.meta);
    expect(after.identity).toEqual(copy.identity);
    expect(after.flag).toEqual(copy.flag);
    expect(after.government).toEqual(copy.government);
    expect(after.futureSection).toEqual(copy.futureSection);
    expect(after.stats).toMatchObject({ ...section, futureField: { kept: true } });
  });

  it('removes numbers the nation no longer has, and the old link', () => {
    const nation: Nation = { name: 'Calderwyn', inputs: { population: 13_000_000 } };
    const after = withStatsSection(calderwyn(), toStatsSection(nation, checkNation(nation.inputs), NOW));
    expect(after.stats).toEqual({
      futureField: { kept: true },
      summary: 'Calderwyn has numbers on file, but too few to check yet.',
      updated: '2026-12-14T08:30:15Z',
      snapshot: SNAPSHOT.date,
      population: 13_000_000,
    });
  });

  it('starts from nothing when there is no profile', () => {
    const section = toStatsSection(TELAND, checkNation(TELAND.inputs), NOW);
    expect(withStatsSection(undefined, section)).toEqual({ stats: section });
    expect(withStatsSection('nonsense', section)).toEqual({ stats: section });
    expect(withStatsSection({ stats: 'broken' }, section)).toEqual({ stats: section });
  });
});

describe('fromProfile', () => {
  it('reads the numbers, the name and Governmint’s section', () => {
    const read = fromProfile(calderwyn());
    expect(read).toEqual({
      nation: {
        name: 'Kingdom of Calderwyn',
        inputs: {
          population: 12_480_000,
          area: 148_300,
          gdp: 512_000_000_000,
          growth: 1.8,
          lifeExpectancy: 80.6,
          military: 38_500,
        },
      },
      found: true,
      government: {
        form: 'Parliamentary constitutional monarchy',
        summary: 'A constitutional monarchy.',
        link: 'https://gov.eurth.org/#example-calderwyn',
      },
    });
  });

  it('reads back what it wrote', () => {
    const section = toStatsSection(TELAND, checkNation(TELAND.inputs), NOW);
    const read = fromProfile(withStatsSection({ meta: { schema: 1, nation: 'Republic of Teland', updated: 'x' } }, section));
    expect(read.nation).toEqual(TELAND);
    expect(read.snapshot).toBe(SNAPSHOT.date);
    expect(read.found).toBe(true);
  });

  it('falls back from the official name to the common name to the file’s nation', () => {
    expect(fromProfile({ identity: { commonName: 'Calderwyn' }, meta: { nation: 'Other' } }).nation.name).toBe('Calderwyn');
    expect(fromProfile({ identity: {}, meta: { nation: 'Other' } }).nation.name).toBe('Other');
    expect(fromProfile({}).nation.name).toBe('');
  });

  it('gives an empty nation, with its name, for a profile without a stats section', () => {
    const read = fromProfile({ meta: { schema: 1, nation: 'Hesperwick', updated: 'x' } });
    expect(read).toEqual({ nation: { name: 'Hesperwick', inputs: {} }, found: false });
  });

  it('drops values of the wrong kind or out of bounds, and keeps the rest', () => {
    const read = fromProfile({
      stats: { population: '12 million', areaKm2: -5, gdpUsd: 5e11, urbanShare: 150, lifeExpectancy: null, fertilityRate: 2.1, snapshot: 'yesterday' },
    });
    expect(read.nation.inputs).toEqual({ gdp: 5e11, fertility: 2.1 });
    expect(read).not.toHaveProperty('snapshot');
  });

  it('takes anything and never throws', () => {
    for (const raw of [null, undefined, 5, 'text', [], [1, 2], { stats: [] }, { stats: null, government: 7, identity: 'x', meta: [] }]) {
      expect(fromProfile(raw)).toEqual({ nation: { name: '', inputs: {} }, found: false });
    }
  });

  it('does not read inherited or poisoned keys', () => {
    const poisoned = JSON.parse('{"__proto__": {"stats": {"population": 5}}, "stats": {"__proto__": {"population": 9}}}') as unknown;
    expect(fromProfile(poisoned).nation.inputs).toEqual({});
    expect(fromProfile(Object.create({ stats: { population: 5 } })).nation.inputs).toEqual({});
  });
});

describe('Governmint’s budget, once the profile carries it', () => {
  it('reads defence as a share of all government spending', () => {
    const read = fromProfile({ government: { form: 'Republic', budget: { defence: 6, health: 15 } } });
    expect(read.government).toEqual({ form: 'Republic', defenceShareOfBudget: 6 });
  });

  it('ignores a budget that makes no sense', () => {
    for (const budget of [{ defence: 150 }, { defence: -1 }, { defence: '6' }, 'big', null]) {
      expect(fromProfile({ government: { form: 'Republic', budget } }).government).toEqual({ form: 'Republic' });
    }
  });

  it('works out the military spending it implies', () => {
    expect(impliedMilitarySpending({ governmentSpending: 40 }, { defenceShareOfBudget: 6 })).toBeCloseTo(2.4, 10);
    expect(impliedMilitarySpending({}, { defenceShareOfBudget: 6 })).toBeUndefined();
    expect(impliedMilitarySpending({ governmentSpending: 40 }, { form: 'Republic' })).toBeUndefined();
    expect(impliedMilitarySpending({ governmentSpending: 40 }, undefined)).toBeUndefined();
  });
});

describe('with @eurth/profile, as the site uses it', async () => {
  const { SECTION_OWNERS, createProfile, getSection, parseProfile, serialiseProfile, setSection, validateProfile } = await import('@eurth/profile');
  const { readFileSync } = await import('node:fs');
  const example = (name: string) => readFileSync(new URL(`../node_modules/@eurth/profile/examples/${name}.eurth.json`, import.meta.url), 'utf8');

  it('owns the stats section and no other', () => {
    expect(SECTION_OWNERS.stats).toEqual(['stats']);
  });

  it('writes a section the profile’s own checker accepts, for every example nation', async () => {
    const { EXAMPLES } = await import('../src/stats/examples');
    for (const { nation } of EXAMPLES) {
      const section = toStatsSection(nation, checkNation(nation.inputs), NOW, 'https://stats.eurth.org/?v=1&p=5');
      const profile = setSection(createProfile(nation.name), 'stats', section as never);
      const verdict = validateProfile(profile);
      expect(verdict.ok, JSON.stringify(verdict)).toBe(true);
      const again = parseProfile(serialiseProfile(profile));
      expect(again.ok).toBe(true);
      if (again.ok) expect(fromProfile(again.profile).nation).toEqual(nation);
    }
  });

  it('adds its section to a real profile and leaves every other byte of it alone', () => {
    const parsed = parseProfile(example('calderwyn'));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const before = parsed.profile;
    const read = fromProfile(before);
    expect(read.found).toBe(true);
    expect(read.nation.name).toBe('Kingdom of Calderwyn');
    expect(read.government?.form).toBe('Parliamentary constitutional monarchy');

    const nation = { name: read.nation.name, inputs: { ...read.nation.inputs, fertility: 1.6 } };
    const section = toStatsSection(nation, checkNation(nation.inputs), NOW, 'https://stats.eurth.org/?v=1&p=5');
    const merged = withStatsSection({ stats: getSection(before, 'stats') }, section).stats;
    const after = setSection(before, 'stats', merged as never);

    expect(validateProfile(after).ok).toBe(true);
    for (const key of Object.keys(before)) {
      if (key === 'stats' || key === 'meta') continue;
      expect((after as Record<string, unknown>)[key]).toEqual((before as Record<string, unknown>)[key]);
    }
    expect(after.meta.nation).toBe(before.meta.nation);
    expect((getSection(after, 'stats') as Record<string, unknown>).fertilityRate).toBe(1.6);
    expect((getSection(after, 'stats') as Record<string, unknown>).population).toBe(12_480_000);
  });

  it('reads the two smaller example profiles without complaint', () => {
    for (const name of ['vantmoor', 'hesperwick']) {
      const parsed = parseProfile(example(name));
      expect(parsed.ok).toBe(true);
      if (parsed.ok) expect(() => fromProfile(parsed.profile)).not.toThrow();
    }
    const vantmoor = parseProfile(example('vantmoor'));
    if (vantmoor.ok) expect(fromProfile(vantmoor.profile).nation.inputs).toEqual({ population: 3_950_000, area: 61_200, gdp: 87_400_000_000, lifeExpectancy: 78.2 });
  });
});
