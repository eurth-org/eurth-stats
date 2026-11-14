// Writing numbers for people: British English, digits grouped with commas,
// big numbers in words, and no more precision than the number deserves.

/** A number to a few significant figures, grouped: 40250.4 -> "40,250", 0.853 -> "0.85". */
export function plain(value: number, significant = 3): string {
  if (!Number.isFinite(value)) return '';
  if (value === 0) return '0';
  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  // Whole numbers keep all their digits up to a point; small ones get decimals.
  const decimals = Math.max(0, significant - 1 - magnitude);
  const rounded = Number(value.toFixed(Math.min(decimals, 6)));
  return rounded.toLocaleString('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits: Math.min(decimals, 6),
  });
}

/** A whole number with every digit: 48200000 -> "48,200,000". */
export function whole(value: number): string {
  return Math.round(value).toLocaleString('en-GB', { maximumFractionDigits: 0 });
}

/** A number with a fixed count of decimals: 79.44 -> "79.4". */
export function fixed(value: number, decimals = 1): string {
  const rounded = Number(value.toFixed(decimals));
  return rounded.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: decimals });
}

const WORDS: ReadonlyArray<readonly [number, string]> = [
  [1e12, 'trillion'],
  [1e9, 'billion'],
  [1e6, 'million'],
];

/** A big number in words: 48200000 -> "48.2 million"; under a million, the digits. */
export function inWords(value: number, significant = 3): string {
  if (!Number.isFinite(value)) return '';
  const size = Math.abs(value);
  for (const [unit, word] of WORDS) {
    // 999,600 reads better as "1 million" than as "1,000 thousand".
    if (Number((size / unit).toPrecision(significant)) >= 1) {
      return `${plain(value / unit, significant)} ${word}`;
    }
  }
  if (size >= 1000) return whole(Number(value.toPrecision(significant)));
  return plain(value, significant);
}

/** Dollars: 40250 -> "$40,250"; 1.94e12 -> "$1.94 trillion". */
export function dollars(value: number, significant = 3): string {
  const sign = value < 0 ? '−' : '';
  const size = Math.abs(value);
  if (size >= 1e6) return `${sign}$${inWords(size, significant)}`;
  if (size >= 1000) return `${sign}$${whole(Number(size.toPrecision(Math.max(significant, 3))))}`;
  return `${sign}$${plain(size, significant)}`;
}

/** A percentage: 6.5 -> "6.5%"; 0.853 -> "0.85%"; 20.3 -> "20%". */
export function percent(value: number): string {
  const size = Math.abs(value);
  const text = size >= 10 ? fixed(size, 0) : size >= 1 ? fixed(size, 1) : fixed(size, 2);
  return `${value < 0 && Number(text.replace(/,/g, '')) !== 0 ? '−' : ''}${text}%`;
}

/** A list in words: ["Spain"] -> "Spain"; two -> "A and B"; three -> "A, B and C". */
export function list(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1] ?? ''}`;
}

/** "1 country", "3 countries". */
export function count(amount: number, one: string, many: string): string {
  return `${whole(amount)} ${amount === 1 ? one : many}`;
}

/** A capital letter on the first word. */
export function sentenceCase(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
