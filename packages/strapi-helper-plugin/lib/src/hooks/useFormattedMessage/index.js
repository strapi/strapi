import { isObject } from 'lodash';
import { useGlobalContext } from '../../contexts/GlobalContext';

const useFormattedMessage = (message) => {
  const { formatMessage } = useGlobalContext();

  if (isObject(message) && message.id) {
    return formatMessage({
      ...message,
      defaultMessage: message.defaultMessage || message.id,
    });
  }

  return message;
};

export default useFormattedMessage;
