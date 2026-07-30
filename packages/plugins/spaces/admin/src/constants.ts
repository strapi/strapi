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
/**
 * NOTE: `useRBAC` derives each `allowedActions` key from the LAST segment of
 * the action id, not from this object's keys: `plugin::spaces.create` →
 * `canCreate`, `plugin::spaces.move-entry` → `canMoveEntry`. Check those names.
 */
export const PERMISSIONS = {
  moveEntry: [{ action: 'plugin::spaces.move-entry', subject: null }],
  createSpace: [{ action: 'plugin::spaces.create', subject: null }],
  updateSpace: [{ action: 'plugin::spaces.update', subject: null }],
  deleteSpace: [{ action: 'plugin::spaces.delete', subject: null }],
};
