/**
 * Permissions consumed by the Spaces plugin's admin UI.
 *
 * `moveEntry` gates the "Move to space" header + bulk actions in the Content Manager.
 * The matching action is registered server-side in `services/permissions/actions.ts`
 * and enforced on `POST /spaces/move` via the `admin::hasPermissions` route policy.
 *
 * Shape mirrors `packages/plugins/i18n/admin/src/constants.ts` so `useRBAC()` can
 * consume it directly.
 */
export const PERMISSIONS = {
  moveEntry: [{ action: 'plugin::spaces.move-entry', subject: null }],
};
