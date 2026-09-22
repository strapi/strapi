import { useRBAC } from '@strapi/admin/strapi-admin';

import { PERMISSIONS } from '../../constants';

// Hoisted to module scope (matching the legacy hook): a fresh object each render
// would hand `useRBAC` a new identity every time, re-running its memos for no
// gain (it guards refetch with a deep `isEqual`, so this is wasted work, not a loop).
const { main: _main, ...RBAC_PERMISSIONS } = PERMISSIONS;

/**
 * RBAC gate for the future Media Library UI. Mirrors the legacy hook of the
 * same name: the server already enforces every action route-side (assets and
 * folder operations share the asset permissions — folder create requires
 * `assets.create`, folder rename/move/delete require `assets.update`); this
 * hook is what keeps the UI honest so users don't discover a missing
 * permission through a 403.
 *
 * - `canCreate` — upload (files, from URL) and New folder
 * - `canUpdate` — edit details, replace, crop, move (dnd + bulk), delete
 *   (single + bulk), AI metadata — the `assets.update` action covers
 *   "Update (crop, details, replace) + delete" by definition
 * - `canDownload` / `canCopyLink` — the matching drawer actions
 */
export const useMediaLibraryPermissions = () => {
  const { allowedActions, isLoading } = useRBAC(RBAC_PERMISSIONS);

  return {
    isLoading,
    canCreate: Boolean(allowedActions.canCreate),
    canUpdate: Boolean(allowedActions.canUpdate),
    canDownload: Boolean(allowedActions.canDownload),
    canCopyLink: Boolean(allowedActions.canCopyLink),
  };
};
