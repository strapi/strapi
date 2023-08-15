import isObject from 'lodash/isObject';
import { useIntl } from 'react-intl';

const useFormattedMessage = (message) => {
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
