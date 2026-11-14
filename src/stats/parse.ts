// Reading a number the way people type it: "48,200,000", "48.2 million",
// "1.94 trillion", "$1.94tn", "6.5% a year", "512k". A wrong number is worse
// than no number, so anything unclear is refused with a plain message.

import { cleanValue, inputSpec, type InputKey } from './model';

export type ParseResult =
  | { ok: true; value: number }
  | { ok: false; empty: true }
  | { ok: false; empty: false; message: string };

/** Words and letters that multiply the number before them. */
const SCALES: ReadonlyArray<readonly [RegExp, number]> = [
  [/^(?:thousand|k)$/, 1e3],
  [/^(?:million|mn|mln|mil|m)$/, 1e6],
  [/^(?:billion|bn|bln|b)$/, 1e9],
  [/^(?:trillion|tn|trn|t)$/, 1e12],
];

/** Words that may follow a number without changing it. */
const FILLER =
  /^(?:%|percent|per ?cent|a year|per year|\/year|yearly|annually|pa|p\.a\.|of gdp|of people|people|inhabitants|soldiers|troops|personnel|years?|yrs?|km2|km²|sq\.? ?km|square kilometres|square kilometers|usd|us\$|us dollars|dollars|int\$|births?|children|per woman|births per woman|children per woman)$/;

/**
 * Turn the digits into a number. Commas, spaces, thin spaces and apostrophes
 * between groups of three are thousands separators; a single comma followed
 * by one or two digits ("6,5") is a decimal comma.
 */
function readDigits(text: string): number | undefined {
  let digits = text.replace(/[\s   '’_]/g, '');
  if (digits === '') return undefined;
  if (/^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(digits)) {
    digits = digits.replace(/,/g, '');
  } else if (/^[+-]?\d{1,3}(?:\.\d{3}){2,}(?:,\d+)?$/.test(digits)) {
    // 48.200.000 or 48.200.000,5: the continental way round.
    digits = digits.replace(/\./g, '').replace(',', '.');
  } else if (/^[+-]?\d+,\d{1,2}$/.test(digits)) {
    digits = digits.replace(',', '.');
  }
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(digits)) return undefined;
  const value = Number(digits);
  return Number.isFinite(value) ? value : undefined;
}

/** A number as people write it, with an optional scale word. No limits applied. */
export function parseNumber(text: string): ParseResult {
  let rest = text
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/−/g, '-');
  if (rest === '') return { ok: false, empty: true };

  // A currency sign in front says nothing new.
  rest = rest.replace(/^(?:us\$|int\$|[$€£])\s*/, '');
  if (/^-\s*(?:us\$|int\$|[$€£])/.test(rest)) rest = `-${rest.replace(/^-\s*(?:us\$|int\$|[$€£])\s*/, '')}`;

  const match = /^([+-]?[\d\s   .,'’_]*\d[\d.,]*|[+-]?\.\d+)\s*(.*)$/.exec(rest);
  if (!match) return { ok: false, empty: false, message: 'That isn’t a number.' };
  const value = readDigits(match[1] ?? '');
  if (value === undefined) return { ok: false, empty: false, message: 'That isn’t a number.' };

  let scale = 1;
  let tail = (match[2] ?? '').trim();
  if (tail !== '') {
    const [first = '', ...others] = tail.split(/\s+/);
    const found = SCALES.find(([pattern]) => pattern.test(first));
    if (found) {
      scale = found[1];
      tail = others.join(' ');
    }
  }
  tail = tail.replace(/[.,;]+$/, '').trim();
  while (tail !== '') {
    // Take the longest filler phrase from the front, then look again.
    const words = tail.split(/\s+/);
    let taken = 0;
    for (let count = Math.min(words.length, 3); count >= 1; count--) {
      if (FILLER.test(words.slice(0, count).join(' '))) {
        taken = count;
        break;
      }
    }
    if (taken === 0) {
      return { ok: false, empty: false, message: `“${tail}” isn’t something Stats can read after a number.` };
    }
    tail = words.slice(taken).join(' ');
  }

  const result = value * scale;
  if (!Number.isFinite(result)) return { ok: false, empty: false, message: 'That number is too large.' };
  return { ok: true, value: result };
}

/** A number for one input: parsed, then held to that input's limits. */
export function parseInput(key: InputKey, text: string): ParseResult {
  const parsed = parseNumber(text);
  if (!parsed.ok) return parsed;
  const spec = inputSpec(key);
  if (parsed.value < spec.min) {
    return {
      ok: false,
      empty: false,
      message: spec.min === 0 ? `${spec.label} can’t be below zero.` : `${spec.label} can’t be below ${spec.min}.`,
    };
  }
  if (parsed.value > spec.max) {
    return { ok: false, empty: false, message: `${spec.label} can’t be that high.` };
  }
  const value = cleanValue(key, parsed.value);
  if (value === undefined) return { ok: false, empty: false, message: 'That isn’t a number.' };
  return { ok: true, value };
}
