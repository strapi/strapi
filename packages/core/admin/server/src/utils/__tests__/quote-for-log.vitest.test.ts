import { describe, expect, test } from 'vitest';
import { quoteForLog } from '../quote-for-log';

describe('quoteForLog', () => {
  test('Quotes an ordinary name', () => {
    expect(quoteForLog('Editor')).toBe('"Editor"');
  });

  test('Escapes control characters and quotes as JSON does', () => {
    expect(quoteForLog('a\nb\r\tc"d\\e')).toBe('"a\\nb\\r\\tc\\"d\\\\e"');
  });

  test('Escapes the line terminators that JSON.stringify leaves raw', () => {
    expect(quoteForLog('a\u0085b\u2028c\u2029d')).toBe('"a\\u0085b\\u2028c\\u2029d"');
  });

  test('Prints null and undefined without quotes', () => {
    expect(quoteForLog(null)).toBe('null');
    expect(quoteForLog(undefined)).toBe('undefined');
  });
});
