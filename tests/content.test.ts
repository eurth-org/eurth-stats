import { describe, expect, it } from 'vitest';
import { TERMS } from '../src/content/glossary';

describe('the glossary', () => {
  it('has about forty terms, each once, in alphabetical order', () => {
    expect(TERMS.length).toBeGreaterThanOrEqual(38);
    expect(new Set(TERMS.map((term) => term.id)).size).toBe(TERMS.length);
    expect(new Set(TERMS.map((term) => term.term)).size).toBe(TERMS.length);
    const names = TERMS.map((term) => term.term.toLowerCase());
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('gives each term an id for its anchor and a definition that ends a sentence', () => {
    for (const term of TERMS) {
      expect(term.id).toMatch(/^[a-z]+(-[a-z]+)*$/);
      expect(term.definition.length).toBeGreaterThan(40);
      expect(term.definition.length).toBeLessThan(320);
      expect(term.definition).toMatch(/[.]$/);
    }
  });

  it('explains the three verdicts and the two ranges', () => {
    const ids = new Set(TERMS.map((term) => term.id));
    for (const id of ['plausible', 'stretch', 'unlikely', 'typical-band', 'full-spread', 'peers', 'snapshot']) expect(ids.has(id)).toBe(true);
  });
});
