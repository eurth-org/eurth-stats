import { PICTURE_SIZES } from '@eurth/style';
import { describe, expect, it } from 'vitest';
import { VERDICT_ICON, cardPalette, cardRows, cardSvg } from '../src/stats/card';
import { checkNation, type Verdict } from '../src/stats/check';
import { CSV_COLUMNS, checksCsv, csvCell } from '../src/stats/csv';
import { describeNation, describePyramid, shortDescription, titleOf } from '../src/stats/describe';
import { EXAMPLES, findExample } from '../src/stats/examples';
import { decodeLink, encodeLink } from '../src/stats/link';
import { cleanNation } from '../src/stats/model';

const teland = findExample('teland')!.nation;
const report = checkNation(teland.inputs);

describe('the description', () => {
  it('says what was checked and how it came out, a line for each fact', () => {
    const lines = describeNation(teland, report).split('\n');
    expect(lines[0]).toBe('Republic of Teland, checked against real countries: 12 plausible, 1 stretch.');
    expect(lines[1]).toBe(
      'For scale: population 48.2 million people (about the same as Spain); area 512,000 km² (about the same as Thailand); GDP, nominal $1.94 trillion (about the same as South Korea); GDP, PPP $2.6 trillion at PPP (about the same as Saudi Arabia).',
    );
    expect(lines[2]).toBe('Plausible: population density, 94.1 per km². About the same as Spain.');
    expect(lines).toContain('Plausible: GDP per person, $40,200. About the same as Spain.');
    expect(lines.find((line) => line.startsWith('Stretch: GDP growth, 6.5% a year. High for a country of similar income'))).toBeDefined();
    expect(lines.at(-2)).toMatch(/^Estimated age structure: \d+% under 15, \d+% aged 15 to 64 and \d+% aged 65 or over; median age \d+; a shrinking population in the long run\.$/);
    expect(lines.at(-1)).toBe('Real-world ranges from World Bank and SIPRI data, gathered 14 November 2026.');
    expect(lines).toHaveLength(2 + 13 + 2);
  });

  it('has a line for a nation with nothing to check', () => {
    expect(describeNation({ name: '', inputs: {} }, checkNation({}))).toBe('This nation: nothing to check yet. Enter a few more numbers.');
    expect(describeNation({ name: 'Tiny', inputs: { population: 5000 } }, checkNation({ population: 5000 }))).toBe(
      'Tiny: nothing to check yet. Enter a few more numbers.\nFor scale: population 5,000 people (fewer people than any real country: the least populous is Tuvalu, at 9,490 people).',
    );
  });

  it('has a short form for sharing', () => {
    expect(shortDescription(teland, report)).toBe(
      'Republic of Teland, checked against real countries: 12 plausible, 1 stretch. Standing out: GDP growth (6.5% a year).',
    );
    const calderwyn = findExample('calderwyn')!.nation;
    expect(shortDescription(calderwyn, checkNation(calderwyn.inputs))).toBe('Kingdom of Calderwyn, checked against real countries: 13 plausible.');
    expect(shortDescription({ name: '', inputs: {} }, checkNation({}))).toBe('This nation: not enough numbers to check yet.');
  });

  it('names at most three things that stand out, and counts the rest', () => {
    const vast = findExample('vast')!.nation;
    expect(shortDescription(vast, checkNation(vast.inputs))).toMatch(/Standing out: .+ \(.+\), .+ \(.+\), .+ \(.+\) and \d+ more\.$/);
  });

  it('describes the pyramid each way it can lean', () => {
    expect(describePyramid(checkNation({ fertility: 5, lifeExpectancy: 60 }).pyramid!)).toContain('a growing population');
    expect(describePyramid(checkNation({ fertility: 2.1, lifeExpectancy: 80 }).pyramid!)).toContain('a steady population');
    expect(titleOf({ name: '  ', inputs: {} })).toBe('This nation');
  });
});

describe('the CSV', () => {
  it('has a header row and one row for each check and each scale line', () => {
    const rows = checksCsv(report).trimEnd().split('\r\n');
    expect(rows[0]).toBe(CSV_COLUMNS.join(','));
    expect(rows).toHaveLength(1 + 13 + 4);
    expect(rows[1]).toMatch(/^Population density,94\.1406,94\.1 per km²,Plausible,About the same as Spain\.,countries of similar area,48,/);
    expect(checksCsv(report).endsWith('\r\n')).toBe(true);
  });

  it('gives every row the same number of cells', () => {
    // Count the cells of a row: commas outside quotes, plus one.
    const cells = (row: string) => {
      let count = 1;
      let quoted = false;
      for (const character of row) {
        if (character === '"') quoted = !quoted;
        else if (character === ',' && !quoted) count++;
      }
      return count;
    };
    for (const example of EXAMPLES) {
      for (const row of checksCsv(checkNation(example.nation.inputs)).trimEnd().split('\r\n')) {
        expect(cells(row)).toBe(CSV_COLUMNS.length);
      }
    }
  });

  it('quotes what needs quoting', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a, b')).toBe('"a, b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('two\r\nlines')).toBe('"two\nlines"');
    expect(csvCell(12.5)).toBe('12.5');
    expect(csvCell(-3)).toBe('-3');
    expect(csvCell(NaN)).toBe('');
  });

  it('stops a spreadsheet running text as a formula', () => {
    expect(csvCell('=HYPERLINK("http://x","y")')).toBe('"\'=HYPERLINK(""http://x"",""y"")"');
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('-1')).toBe("'-1");
    expect(csvCell('@cmd')).toBe("'@cmd");
  });

  it('is only a header for a nation with nothing to check', () => {
    expect(checksCsv(checkNation({}))).toBe(`${CSV_COLUMNS.join(',')}\r\n`);
  });
});

describe('the results card', () => {
  it('is an SVG of the size asked for, with a title and the description inside', () => {
    const svg = cardSvg(teland, report, { width: 1200, height: 630 });
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630" role="img"')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain('<title id="card-title">Republic of Teland: plausibility check</title>');
    expect(svg).toContain('Republic of Teland, checked against real countries: 12 plausible, 1 stretch.');
    expect(svg).toContain('>12 plausible</text>');
    expect(svg).toContain('>1 stretch</text>');
    expect(svg).toContain('>stats.eurth.org</text>');
    expect(svg).toContain('Real-world data: World Bank and SIPRI, 14 November 2026');
  });

  it('comes in the brief’s two sizes and the suite’s other four', () => {
    expect(PICTURE_SIZES.map((size) => size.id)).toEqual(['preview', 'square', 'portrait', 'story', 'pin', 'wide']);
    for (const size of PICTURE_SIZES) {
      const svg = cardSvg(teland, report, { width: size.width, height: size.height });
      expect(svg).toContain(`viewBox="0 0 ${size.width} ${size.height}"`);
      expect(svg).not.toMatch(/NaN|undefined|Infinity/);
    }
  });

  it('keeps everything inside the picture, at every size and for every example', () => {
    for (const size of PICTURE_SIZES) {
      for (const example of EXAMPLES) {
        const svg = cardSvg(example.nation, checkNation(example.nation.inputs), { width: size.width, height: size.height });
        for (const match of svg.matchAll(/<(?:text|rect|circle) [^>]*?\b(?:x|cx)="([-\d.]+)"[^>]*?\b(?:y|cy)="([-\d.]+)"/g)) {
          expect(Number(match[1])).toBeGreaterThanOrEqual(0);
          expect(Number(match[1])).toBeLessThanOrEqual(size.width);
          expect(Number(match[2])).toBeGreaterThanOrEqual(0);
          expect(Number(match[2])).toBeLessThanOrEqual(size.height);
        }
      }
    }
  });

  it('shows a word and an icon for every verdict, never colour alone', () => {
    const vast = findExample('vast')!.nation;
    const svg = cardSvg(vast, checkNation(vast.inputs), { width: 1080, height: 1920 });
    for (const word of ['Plausible', 'Stretch', 'Unlikely']) expect(svg).toContain(`>${word}</text>`);
    const shapes = new Set(Object.values(VERDICT_ICON).map((icon) => String(icon.icon[4])));
    expect(shapes.size).toBe(3);
    for (const shape of shapes) expect(svg).toContain(shape);
  });

  it('never lets a name become markup', () => {
    const nation = cleanNation({ name: '<script>alert(1)</script> & "Sons"', inputs: { lifeExpectancy: 70 } });
    const svg = cardSvg(nation, checkNation(nation.inputs), { width: 1200, height: 630 });
    expect(svg).not.toContain('<script');
    expect(svg).toContain('&lt;script&gt;alert(1)&lt;/script&gt; &amp; &quot;Sons&quot;');
  });

  it('cuts a long name short instead of running off the card', () => {
    const nation = { name: 'W'.repeat(80), inputs: { lifeExpectancy: 70 } };
    const svg = cardSvg(nation, checkNation(nation.inputs), { width: 1200, height: 630 });
    expect(svg).toContain('…</text>');
    expect(svg).not.toContain(`>${'W'.repeat(80)}</text>`);
  });

  it('draws an empty card for an empty nation', () => {
    const svg = cardSvg({ name: '', inputs: {} }, checkNation({}), { width: 1080, height: 1080 });
    expect(svg).toContain('>This nation</text>');
    expect(svg).toContain('>Nothing to check yet</text>');
  });

  it('when the checks don’t all fit, shows what stands out first and counts the rest', () => {
    const checks = checkNation(teland.inputs).checks;
    expect(cardRows(checks, 13)).toEqual({ rows: checks, left: 0 });
    const few = cardRows(checks, 6);
    expect(few.rows).toHaveLength(5);
    expect(few.left).toBe(8);
    expect(few.rows.map((check) => check.id)).toContain('growth');
    expect(few.rows.map((check) => checks.indexOf(check))).toEqual([...few.rows.map((check) => checks.indexOf(check))].sort((a, b) => a - b));
    const wide = cardSvg(teland, report, { width: 1200, height: 630 });
    expect(wide).toMatch(/>and \d+ more, all plausible<\/text>/);
    expect(wide).toContain('>GDP growth</text>');
  });

  it('takes its colours from the suite’s tokens, in either theme', () => {
    const night = cardPalette('dark');
    const light = cardPalette('light');
    expect(night.surface).toBe('#002b36');
    expect(night.ink).toBe('#fcf6e1');
    expect(light.surface).toBe('#ffffff');
    for (const palette of [night, light]) {
      for (const colour of Object.values(palette)) expect(colour).toMatch(/^#[0-9a-f]{6}$/);
      expect(new Set([palette.plausible, palette.stretch, palette.unlikely]).size).toBe(3);
    }
    expect(cardSvg(teland, report, { width: 1200, height: 630, palette: light })).toContain('fill="#ffffff"');
  });
});

describe('the example nations', () => {
  const verdicts = (id: string) => {
    const result = checkNation(findExample(id)!.nation.inputs);
    return Object.fromEntries(result.checks.map((check) => [check.id, check.verdict])) as Record<string, Verdict>;
  };

  it('each have a name, a note and numbers that survive cleaning and a round trip through the link', () => {
    expect(new Set(EXAMPLES.map((example) => example.id)).size).toBe(EXAMPLES.length);
    for (const example of EXAMPLES) {
      expect(example.id).toMatch(/^[a-z]+$/);
      expect(example.note.endsWith('.')).toBe(true);
      expect(cleanNation(example.nation)).toEqual(example.nation);
      expect(decodeLink(encodeLink(example.nation)).nation).toEqual(example.nation);
    }
  });

  it('Teland: all plausible but its growth', () => {
    const result = checkNation(findExample('teland')!.nation.inputs);
    expect(result.summary).toBe('12 plausible, 1 stretch');
    expect(verdicts('teland').growth).toBe('stretch');
  });

  it('Calderwyn: nothing out of line', () => {
    expect(checkNation(findExample('calderwyn')!.nation.inputs).summary).toBe('13 plausible');
  });

  it('Vantmoor: four numbers, three checks', () => {
    const result = checkNation(findExample('vantmoor')!.nation.inputs);
    expect(result.checks.map((check) => check.id)).toEqual(['density', 'gdpPerPerson', 'lifeExpectancy']);
    expect(result.counts.unlikely).toBe(0);
  });

  it('Marrow: a city-state stretches density and capital share, and nothing is unlikely', () => {
    const v = verdicts('marrow');
    expect(v.density).toBe('stretch');
    expect(v.capitalShare).toBe('stretch');
    expect(Object.values(v)).not.toContain('unlikely');
  });

  it('Kharvela: ordinary for a low-income country', () => {
    const result = checkNation(findExample('kharvela')!.nation.inputs);
    expect(result.counts.unlikely).toBe(0);
    expect(result.counts.plausible).toBeGreaterThanOrEqual(11);
    expect(result.checks.find((check) => check.id === 'fertility')!.group.dimension).toBe('income');
    // The same fertility and life expectancy would be beyond every real country at Teland's income.
    const rich = checkNation({ population: 96e6, gdp: 4e12, fertility: 4.6, lifeExpectancy: 63.5 });
    expect(rich.checks.find((check) => check.id === 'fertility')!.verdict).toBe('unlikely');
    expect(rich.checks.find((check) => check.id === 'lifeExpectancy')!.verdict).toBe('unlikely');
  });

  it('Skarn: a garrison state is a stretch, with real company', () => {
    const v = verdicts('skarn');
    expect(v.militaryPer1000).toBe('stretch');
    expect(v.militarySpending).toBe('stretch');
    expect(Object.values(v)).not.toContain('unlikely');
  });

  it('Solace: a utopia is beyond every real country', () => {
    const v = verdicts('solace');
    expect(v.gdpPerPerson).toBe('unlikely');
    expect(v.growth).toBe('unlikely');
    expect(v.lifeExpectancy).toBe('unlikely');
  });

  it('Vast: impossible, and told why', () => {
    const result = checkNation(findExample('vast')!.nation.inputs);
    const by = Object.fromEntries(result.checks.map((check) => [check.id, check]));
    expect(by.density!.verdict).toBe('unlikely');
    expect(by.militaryPer1000!.verdict).toBe('unlikely');
    expect(by.militarySpending).toMatchObject({ verdict: 'unlikely', impossible: true });
    expect(result.counts.unlikely).toBeGreaterThanOrEqual(3);
    expect(result.scale[0]!.comparison).toMatch(/^More people than any real country/);
  });
});
