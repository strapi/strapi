/**
 * useFormattedMessage for react-intl formatMessage
 *
 *
 * @deprecated This function will be removed in the next major release. Use directly react-intl hook instead.
 */

import isObject from 'lodash/isObject';
import { useIntl, MessageDescriptor } from 'react-intl';

const useFormattedMessage = (message: MessageDescriptor | string) => {
  const { formatMessage } = useIntl();

  if (isObject(message) && message.id) {
    return formatMessage({
      ...message,
      defaultMessage: message.defaultMessage || message.id,
    });
  }

  return message;
};

export { useFormattedMessage };
