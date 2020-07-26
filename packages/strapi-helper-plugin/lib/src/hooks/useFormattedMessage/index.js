import { useGlobalContext } from '../../contexts/GlobalContext';
import { isObject } from 'lodash';

const useFormattedMessage = message => {
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
