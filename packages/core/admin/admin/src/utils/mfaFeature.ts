import { isBaseQueryError, type BaseQueryError } from './baseQuery';

import type { SerializedError } from '@reduxjs/toolkit';

/**
 * Whether this build has the admin two-factor feature (`unstableAdminMfa`). Every two-factor query
 * and UI is gated on it, so an install that never opted in makes no two-factor request at all.
 *
 * With the flag on, a 404 from a two-factor endpoint still means the feature is off: the server's
 * kill switch (`admin.auth.mfa.enabled: false`) can turn it off without a rebuild.
 *
 * @internal
 */
export const isMfaFeatureEnabled = (): boolean =>
  window.strapi?.future?.isEnabled?.('unstableAdminMfa') === true;

/**
 * A 404 from a two-factor endpoint: the feature is off on the server.
 *
 * @internal
 */
export const isMfaNotFoundError = (error: BaseQueryError | SerializedError | undefined): boolean =>
  error !== undefined && isBaseQueryError(error) && 'status' in error && error.status === 404;
