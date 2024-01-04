import { createTypedSelector } from './core/store/hooks';

/**
 * @deprecated
 *
 * Use `useTypedSelector` and access the state directly, this was only used so we knew
 * we were using the correct path. Which is state.admin_app.permissions
 */
export const selectAdminPermissions = createTypedSelector((state) => state.admin_app.permissions);
