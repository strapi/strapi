import isObject from 'lodash/isObject';
import { useIntl, MessageDescriptor } from 'react-intl';

interface MessageProps {
  message: MessageDescriptor;
}

const useFormattedMessage = ({ message }: MessageProps) => {
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
