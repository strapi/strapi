import { login } from '../reducer';
import { adminApi } from '../services/api';

import type { Dispatch } from '../core/store/configure';

/**
 * Establish a new admin session and drop any cached API state from the
 * previous identity. Logout already calls `resetApiState`; login/register/
 * reset-password/SSO previously swapped the token without invalidating
 * `getMe` / `getMyPermissions`, so the panel kept rendering the prior
 * user's menus until a full reload.
 *
 * @see https://github.com/strapi/strapi/issues/27367
 */
const establishAdminSession = (
  dispatch: Dispatch,
  payload: { token: string; persist?: boolean }
): void => {
  dispatch(login(payload));
  dispatch(adminApi.util.resetApiState());
};

export { establishAdminSession };
