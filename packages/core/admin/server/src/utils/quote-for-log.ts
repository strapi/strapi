// JSON.stringify leaves these line terminators raw, and some log readers break lines on them
const RAW_LINE_TERMINATORS = /[\u0085\u2028\u2029]/g;

/**
 * Quotes a value such as a role or token name for a log message, so the message stays on one line.
 *
 * Control characters and quotes are escaped as in JSON. `null` prints as `null`, without quotes.
 */
export const quoteForLog = (value: string | null | undefined): string => {
  const quoted = JSON.stringify(value);

  if (quoted === undefined) {
    return 'undefined';
  }

  return quoted.replace(
    RAW_LINE_TERMINATORS,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`
  );
};
