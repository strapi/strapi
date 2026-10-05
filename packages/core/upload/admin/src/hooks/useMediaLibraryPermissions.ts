import { useAuth, useRBAC } from '@strapi/admin/strapi-admin';

import { PERMISSIONS } from '../constants';

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
 *
 * `useRBAC` reports every action as denied until its effect resolves, and the
 * page renders around that gap. An unconditional grant is already on the auth
 * state, so use it while the check is in flight. Conditioned grants still
 * wait: only the server check can answer those.
 */
const ACTION = {
  create: PERMISSIONS.create[0].action,
  update: PERMISSIONS.update[0].action,
  download: PERMISSIONS.download[0].action,
  copyLink: PERMISSIONS.copyLink[0].action,
} as const;

const allowsUnconditionally = (
  permissions: ReadonlyArray<{ action: string; conditions?: readonly string[] }>,
  action: string
) =>
  permissions.some(
    (permission) =>
      permission.action === action &&
      !(Array.isArray(permission.conditions) && permission.conditions.length > 0)
  );

export const useMediaLibraryPermissions = () => {
  const userPermissions = useAuth('useMediaLibraryPermissions', (auth) => auth.permissions);
  const { allowedActions, isLoading } = useRBAC(RBAC_PERMISSIONS);

  const granted = (action: string, settled: boolean | undefined) =>
    isLoading ? allowsUnconditionally(userPermissions, action) : Boolean(settled);

  return {
    isLoading,
    canCreate: granted(ACTION.create, allowedActions.canCreate),
    canUpdate: granted(ACTION.update, allowedActions.canUpdate),
    canDownload: granted(ACTION.download, allowedActions.canDownload),
    canCopyLink: granted(ACTION.copyLink, allowedActions.canCopyLink),
  };
};
