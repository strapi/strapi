import { createTypedSelector } from './core/store/hooks';

export const selectAdminPermissions = createTypedSelector((state) => state.admin_app.permissions);
