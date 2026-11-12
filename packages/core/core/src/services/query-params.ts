import { queryParams } from '@strapi/utils';
import type { Core, UID } from '@strapi/types';

/**
 * Upper bound of distinct unknown filter keys warned about per process, so that dynamic keys
 * cannot grow the dedupe set without bound. Past it, unknown filter keys are no longer reported.
 */
const MAX_WARNED_UNKNOWN_FILTER_KEYS = 1000;

/**
 * Longest value, in code points, printed in a warning before it is truncated
 */
const MAX_LOGGED_VALUE_LENGTH = 100;

const escapeCodePoint = (character: string): string => {
  const codePoint = character.codePointAt(0) ?? 0;
  const hex = codePoint.toString(16);

  return codePoint > 0xffff ? `\\u{${hex}}` : `\\u${hex.padStart(4, '0')}`;
};

/**
 * Quotes a value for a log line. Filter keys come from the request, so:
 * - control characters (line breaks, ANSI escapes, C1 controls), format characters
 *   (bidirectional overrides and isolates, zero-width characters) and line separators
 *   are escaped, to keep one readable warning on one log line;
 * - long values are truncated.
 */
const quoteForLog = (value: string): string => {
  const codePoints = Array.from(value);
  const truncated =
    codePoints.length > MAX_LOGGED_VALUE_LENGTH
      ? `${codePoints.slice(0, MAX_LOGGED_VALUE_LENGTH).join('')}…`
      : value;

  return JSON.stringify(truncated).replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/gu, escapeCodePoint);
};

const formatUnknownFilterKeyWarning = ({
  key,
  uid,
  path,
  operator,
}: queryParams.UnknownFilterKey): string => {
  const model = quoteForLog(uid ?? 'unknown');
  const consequence =
    'was ignored: the query ran without this condition and may return different results than intended.';
  const future = 'This will become an error in a future major version.';

  if (operator !== undefined) {
    return `[strapi] Unsupported key ${quoteForLog(key)} in the object operand of ${quoteForLog(operator)} at ${quoteForLog(path.join('.'))} on model ${model} ${consequence} ${future}`;
  }

  return `[strapi] Unknown filter key ${quoteForLog(key)} at ${quoteForLog(path.join('.'))} on model ${model} ${consequence} Check for a typo. ${future}`;
};

/**
 * Development only: warns once per model and attribute path about filter keys that were
 * silently removed from a query.
 */
const createUnknownFilterKeyWarner = (strapi: Core.Strapi) => {
  const warnedKeys = new Set<string>();

  return (unknownFilterKey: queryParams.UnknownFilterKey) => {
    const dedupeKey = `${unknownFilterKey.uid ?? ''}:${unknownFilterKey.path.join('.')}`;

    if (warnedKeys.has(dedupeKey) === true) {
      return;
    }

    if (warnedKeys.size >= MAX_WARNED_UNKNOWN_FILTER_KEYS) {
      return;
    }

    warnedKeys.add(dedupeKey);
    strapi.log.warn(formatUnknownFilterKeyWarning(unknownFilterKey));
  };
};

export default (strapi: Core.Strapi) => {
  const isDevelopment = strapi.config.get('environment') === 'development';

  const { transformQueryParams } = queryParams.createTransformer({
    getModel: (uid: string) => strapi.getModel(uid as UID.Schema),
    onUnknownFilterKey: isDevelopment === true ? createUnknownFilterKeyWarner(strapi) : undefined,
  });

  return {
    transform: transformQueryParams,
  };
};
