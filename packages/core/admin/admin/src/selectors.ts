import { createTypedSelector } from './core/store/hooks';

import type { RootState } from './core/store/configure';

/**
 * @deprecated
 *
 * Use `useTypedSelector` and access the state directly, this was only used so we knew
 * we were using the correct path. Which is state.admin_app.permissions
 */
export const selectAdminPermissions: (state: RootState) => RootState['admin_app']['permissions'] =
  createTypedSelector((state) => state.admin_app.permissions);
