import { handleAPIError } from '../handleAPIError';

export default function getAPIInnerErrors(error, { getTrad }) {
  return handleAPIError(error, undefined, { getTrad });
}
