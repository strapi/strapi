import { queryParams } from '@strapi/utils';
import type { Core, UID } from '@strapi/types';

/**
 * Upper bound of distinct unknown filter keys warned about per process, so that dynamic keys
 * cannot grow the dedupe set without bound. Past it, unknown filter keys are no longer reported.
 */
const MAX_WARNED_UNKNOWN_FILTER_KEYS = 1000;

/**
 * Quotes a value for a log line. Filter keys come from the request, so control characters
 * (line breaks, ANSI escapes, C1 controls, line separators) are escaped to keep one warning
 * on one log line.
 */
const quoteForLog = (value: string): string =>
  JSON.stringify(value).replace(
    /[\u007f-\u009f\u2028\u2029]/g,
    (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`
  );

const formatUnknownFilterKeyWarning = ({
  key,
  uid,
  path,
  operator,
}: queryParams.UnknownFilterKey): string => {
  const model = quoteForLog(uid ?? 'unknown');
  const consequence =
    'was ignored: the query ran without this condition and may return more results than intended.';
  const future = 'This will become an error in a future major version.';

  if (operator !== undefined) {
    const attributePath = quoteForLog(path.slice(0, -1).join('.'));

    return `[strapi] Unsupported object operand for ${quoteForLog(operator)} on ${attributePath} (model ${model}) ${consequence} ${future}`;
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
