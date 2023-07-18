import set from 'lodash/set';

import { normalizeAPIError } from '../normalizeAPIError';

/**
 * Method to stringify an API error object to be a formik intialErrors object
 *
 * @export
 * @param {object} API Reponse error object
 * @param {{ formatMessage: Function, intlMessagePrefixCallback: Function }} - Object containing a formatMessage (from react-intl) callback and an intlMessagePrefixCallback (usually getTrad()
 * @return {string} null | FormikError
 */

export function formatFormikError(error, { formatMessage, intlMessagePrefixCallback }) {
  if (!formatMessage) {
    throw new Error('The formatMessage callback is a mandatory argument.');
  }

  const normalizedError = normalizeAPIError(error, intlMessagePrefixCallback);

  // stringify multiple errors
  if (normalizedError?.errors) {
    const errors = normalizedError.errors.reduce((acc, { id, defaultMessage, values }) => {
      if (values?.path) {
        set(acc, values.path, formatMessage({ id, defaultMessage }, values));
      }

      return acc;
    }, {});

    return Object.keys(errors).length > 0 ? errors : null;
  }

  return null;
}
