import { parseNumberInputValue } from '../parseNumberInputValue';

describe('CTB | parseNumberInputValue', () => {
  it('returns numbers as-is', () => {
    expect(parseNumberInputValue(5)).toBe(5);
    expect(parseNumberInputValue(0)).toBe(0);
  });

  it('parses numeric strings', () => {
    expect(parseNumberInputValue('5')).toBe(5);
    expect(parseNumberInputValue('0')).toBe(0);
  });

  it('falls back to 0 for invalid or empty input', () => {
    expect(parseNumberInputValue('')).toBe(0);
    expect(parseNumberInputValue('abc')).toBe(0);
    expect(parseNumberInputValue(undefined)).toBe(0);
    expect(parseNumberInputValue(null)).toBe(0);
  });
});
