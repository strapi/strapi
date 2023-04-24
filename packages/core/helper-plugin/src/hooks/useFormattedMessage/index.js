import { useIntl } from 'react-intl';
import isObject from 'lodash/isObject';

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

export default useFormattedMessage;
