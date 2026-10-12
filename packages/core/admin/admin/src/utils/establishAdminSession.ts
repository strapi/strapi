import { login } from '../reducer';
import { adminApi } from '../services/api';

import { notifyOtherTabsOfAdminSessionChange } from './adminSessionSync';

import type { Dispatch } from '../core/store/configure';

/**
 * Establish a new admin session and refetch identity queries. `getMe` /
 * `getMyPermissions` are keyed only by endpoint, not by token, so swapping
 * the token without invalidating them keeps the previous user's menus until
 * a full reload (see #27367).
 *
 * Store the token before invalidating. The fetch client reads the bearer
 * token from storage when the refetch starts. Invalidating earlier (for
 * example from the login mutation) refetches as the previous user, and
 * RTK Query 1.9 drops a second invalidate while that request is pending.
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
  notifyOtherTabsOfAdminSessionChange();
  dispatch(adminApi.util.invalidateTags(['Me']));
};

export { establishAdminSession };
