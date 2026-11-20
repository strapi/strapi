import { isBaseQueryError, type BaseQueryError } from '../../../../../utils/baseQuery';

import type { SerializedError } from '@reduxjs/toolkit';

/**
 * Whether a role permissions update was rejected because it grants permissions the user does not
 * hold themselves: the `ForbiddenError` the server's permission ceiling throws, which lists the
 * rejected permissions in `details.permissions`.
 */
const isPermissionsCeilingError = (error: BaseQueryError | SerializedError): boolean =>
  isBaseQueryError(error) &&
  error.name === 'ForbiddenError' &&
  typeof error.details === 'object' &&
  error.details !== null &&
  Array.isArray((error.details as { permissions?: unknown }).permissions);

export { isPermissionsCeilingError };
