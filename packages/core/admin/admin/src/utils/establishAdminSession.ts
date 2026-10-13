import { login } from '../reducer';
import { resetAdminApiState } from '../services/admin';

import { notifyOtherTabsOfAdminSessionChange } from './adminSessionSync';

import type { Dispatch } from '../core/store/configure';

/**
 * Establish a new admin session without exposing data cached for the previous
 * admin. Store the token first so queries restarted by the reset use the new
 * bearer. `/admin/init` is retained because first-admin registration still
 * needs its pre-registration value while it navigates to `/usecase`.
 *
 * @see https://github.com/strapi/strapi/issues/27367
 */
const establishAdminSession = (
  dispatch: Dispatch,
  payload: { token: string; persist?: boolean }
): void => {
  dispatch(login(payload));
  notifyOtherTabsOfAdminSessionChange();
  resetAdminApiState(dispatch);
};

export { establishAdminSession };
