import { normalizeAPIError } from '../../hooks/useAPIErrorHandler';

export default function getAPIInnerErrors(error, { getTrad }) {
  const normalizedError = normalizeAPIError(error, getTrad);

  if (normalizedError?.errors) {
    return normalizedError.errors;
  }

  return normalizedError.defaultMessage;
}
