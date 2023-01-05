import { normalizeAPIError } from '../normalizeAPIError';

export function formatAPIError(error, { formatMessage, getTrad }) {
  if (!formatMessage) {
    throw new Error('formatMessage() is a mandatory argument.');
  }

  const normalizedError = normalizeAPIError(error, getTrad);

  // stringify multiple errors
  if (normalizedError?.errors) {
    return Object.values(normalizedError.errors).map(formatMessage).join('\n');
  }

  return formatMessage(normalizedError);
}
