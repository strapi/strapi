import { getPrefixedId } from '../getPrefixedId';

export function formatAxiosError(error, { intlMessagePrefixCallback, formatMessage }) {
  const { code, message } = error;

  return formatMessage({
    id: getPrefixedId(message, intlMessagePrefixCallback),
    defaultMessage: message,
    values: {
      code,
    },
  });
}
