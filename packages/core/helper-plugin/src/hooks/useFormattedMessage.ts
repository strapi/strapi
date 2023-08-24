import isObject from 'lodash/isObject';
import { useIntl } from 'react-intl';

interface MessageProps {
  message: string | { id: string; defaultMessage?: string };
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
