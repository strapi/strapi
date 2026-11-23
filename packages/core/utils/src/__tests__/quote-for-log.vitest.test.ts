import { describe, expect, test } from 'vitest';
import { quoteForLog } from '../quote-for-log';

describe('quoteForLog', () => {
  test('Quotes an ordinary value', () => {
    expect(quoteForLog('Editor')).toBe('"Editor"');
  });

  test('Escapes quotes, backslashes and C0 controls as JSON does', () => {
    expect(quoteForLog('a\nb\r\tc"d\\e\u001b[31m')).toBe('"a\\nb\\r\\tc\\"d\\\\e\\u001b[31m"');
  });

  test('Escapes DEL and C1 controls, which JSON.stringify leaves raw', () => {
    expect(quoteForLog('a\u007fb\u0085c\u009bd')).toBe('"a\\u007fb\\u0085c\\u009bd"');
  });

  test('Escapes line and paragraph separators', () => {
    expect(quoteForLog('a\u2028b\u2029c')).toBe('"a\\u2028b\\u2029c"');
  });

  test('Escapes bidirectional controls and zero-width format characters', () => {
    expect(quoteForLog('a\u202eb\u2066c\u2069d\u200be\u00adf\ufeffg\u{e0001}h')).toBe(
      '"a\\u202eb\\u2066c\\u2069d\\u200be\\u00adf\\ufeffg\\u{e0001}h"'
    );
  });

  test('Keeps printable non-ASCII characters', () => {
    expect(quoteForLog('Éditeur 编辑 🚀')).toBe('"Éditeur 编辑 🚀"');
  });

  test('Truncates a value longer than 100 code points', () => {
    expect(quoteForLog('k'.repeat(101))).toBe(`"${'k'.repeat(100)}…"`);
    expect(quoteForLog('k'.repeat(100))).toBe(`"${'k'.repeat(100)}"`);
    expect(quoteForLog('🚀'.repeat(101))).toBe(`"${'🚀'.repeat(100)}…"`);
  });

  test('Prints null and undefined without quotes', () => {
    expect(quoteForLog(null)).toBe('null');
    expect(quoteForLog(undefined)).toBe('undefined');
  });
});
