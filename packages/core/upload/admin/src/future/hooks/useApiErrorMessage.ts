import * as React from 'react';

import { useIntl } from 'react-intl';

import { getApiErrorMessage } from '../utils/getApiErrorMessage';
import { getTranslationKey } from '../utils/translations';

/**
 * Turns an API error into something displayable, falling back to the caller's
 * own localized copy when the error carries nothing usable.
 *
 * The server sends either a bare code (`body.ts`'s `FileTooBig`) or a ready-made
 * sentence, and the same button can produce either. A code with a
 * `upload.apiError.*` entry resolves to it; anything else is returned untouched.
 *
 * Checking `messages` rather than passing the text as `defaultMessage` keeps
 * untrusted server text away from the ICU parser, where a stray `{` (a
 * validation message echoing a field name) fails to parse — silent in
 * production, but a throw under Jest, which patches `console.error`.
 *
 * Memoized because consumers hold the result in their own `useCallback`
 * dependency arrays.
 */
export const useApiErrorMessage = () => {
  const { formatMessage, messages } = useIntl();

  return React.useCallback(
    (error: unknown, fallback: string) => {
      const message = getApiErrorMessage(error);

      if (!message) {
        return fallback;
      }

      const id = getTranslationKey(`apiError.${message}`);

      return messages[id] ? formatMessage({ id }) : message;
    },
    [formatMessage, messages]
  );
};
