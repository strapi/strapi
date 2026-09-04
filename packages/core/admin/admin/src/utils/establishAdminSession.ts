import { login } from '../reducer';
import { adminApi } from '../services/api';

import type { Dispatch } from '../core/store/configure';

/**
 * Establish a new admin session and refetch identity queries. `getMe` /
 * `getMyPermissions` are keyed only by endpoint, not by token, so swapping
 * the token without invalidating them keeps the previous user's menus until
 * a full reload (see #27367).
 *
 * Do not call `resetApiState` here. That wipes `/admin/init` as well, so
 * first-admin signup refetches `hasAdmin: true` while AuthPage is still
 * mounted and redirects to Home instead of `/usecase`. Logout already resets
 * the full API cache.
 *
 * @see https://github.com/strapi/strapi/issues/27367
 */
const establishAdminSession = (
  dispatch: Dispatch,
  payload: { token: string; persist?: boolean }
): void => {
  dispatch(login(payload));
  dispatch(adminApi.util.invalidateTags(['Me']));
};

export { establishAdminSession };
