import { MessageDescriptor } from 'react-intl';

const isErrorMessageMessageDescriptor = (
  message: string | MessageDescriptor
): message is MessageDescriptor => {
  return typeof message === 'object' && message !== null && 'id' in message;
};

export { isErrorMessageMessageDescriptor };
