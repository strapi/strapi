import * as React from 'react';

import { useIntl } from 'react-intl';

import { getApiErrorMessage } from '../utils/getApiErrorMessage';
import { getTranslationKey } from '../utils/translations';

/**
 * Turns an API error into something displayable, falling back to the caller's
 * own localized copy when the error carries nothing usable.
 *
 * The server speaks in two shapes, and the same button can produce either —
 * replacing an oversized file trips `body.ts`'s bare `FileTooBig` code or the
 * upload plugin's own ready-made sentence, depending on which size limit is
 * lower. Looking the message up as `upload.apiError.<message>` with itself as
 * `defaultMessage` covers both: codes with an entry resolve to the translation,
 * and anything else (a sentence, an unknown code) passes through verbatim,
 * since `@formatjs/intl` returns `defaultMessage` as-is when it cannot be
 * parsed as ICU.
 *
 * Memoized because consumers hold the result in their own `useCallback`
 * dependency arrays.
 */
export const useApiErrorMessage = () => {
  const { formatMessage } = useIntl();

  return React.useCallback(
    (error: unknown, fallback: string) => {
      const message = getApiErrorMessage(error);

      if (!message) {
        return fallback;
      }

      return formatMessage({
        id: getTranslationKey(`apiError.${message}`),
        defaultMessage: message,
      });
    },
    [formatMessage]
  );
};
