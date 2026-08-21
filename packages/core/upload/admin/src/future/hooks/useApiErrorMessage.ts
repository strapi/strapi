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
 * lower. Both are handled by looking the message up as `upload.apiError.<message>`
 * against the loaded translations: a code with an entry resolves to it, and
 * anything else (a sentence, an unknown code) is returned untouched.
 *
 * The lookup is deliberately a `messages` check rather than a `formatMessage`
 * call with the server text as `defaultMessage`. Server text is untrusted, and
 * `formatMessage` would hand it to the ICU parser, where a stray `{` — plausible
 * in a validation message echoing a field name or user input — fails to parse.
 * That failure goes to react-intl's `onError`, which is `console.error`: silent
 * in production, but our Jest setup patches `console.error` to throw, so such a
 * message would blow up out of the click handler under test. Not parsing server
 * text at all sidesteps the question.
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
