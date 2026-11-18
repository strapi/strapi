/**
 * Longest value, in code points, printed in a log line before it is truncated
 */
const MAX_LOGGED_VALUE_LENGTH = 100;

const escapeCodePoint = (character: string): string => {
  const codePoint = character.codePointAt(0) ?? 0;
  const hex = codePoint.toString(16);

  return codePoint > 0xffff ? `\\u{${hex}}` : `\\u${hex.padStart(4, '0')}`;
};

/**
 * Quotes a value such as a filter key, a role or token name, an action or a subject for a log line.
 * These values can come from a request or from a user, so:
 * - control characters (line breaks, ANSI escapes, DEL, C1 controls), format characters
 *   (bidirectional overrides and isolates, zero-width characters) and line separators
 *   are escaped, to keep one readable message on one log line;
 * - quotes and backslashes are escaped as in JSON;
 * - long values are truncated.
 *
 * `null` and `undefined` print as `null` and `undefined`, without quotes.
 */
export const quoteForLog = (value: string | null | undefined): string => {
  if (value === undefined) {
    return 'undefined';
  }

  if (value === null) {
    return 'null';
  }

  const codePoints = Array.from(value);
  const truncated =
    codePoints.length > MAX_LOGGED_VALUE_LENGTH
      ? `${codePoints.slice(0, MAX_LOGGED_VALUE_LENGTH).join('')}…`
      : value;

  return JSON.stringify(truncated).replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, escapeCodePoint);
};
