/**
 * Permissions consumed by the Branches admin UI. Actions are registered
 * server-side in `services/permissions/actions.ts` and enforced by the
 * `admin::hasPermissions` policy on the `/branches` routes.
 *
 * NOTE: `useRBAC` derives each `allowedActions` key from the LAST segment of
 * the action id: `plugin::branches.merge` → `canMerge`.
 */
export const PERMISSIONS = {
  read: [{ action: 'plugin::branches.read', subject: null }],
  create: [{ action: 'plugin::branches.create', subject: null }],
  update: [{ action: 'plugin::branches.update', subject: null }],
  delete: [{ action: 'plugin::branches.delete', subject: null }],
  merge: [{ action: 'plugin::branches.merge', subject: null }],
};

export const MAIN_SLUG = 'main';

/** Where the branch pages live: inside the Content Manager (see `addPage`). */
export const BRANCHES_PATH = '/content-manager/plugins/branches';

export const BRANCH_HEADER = 'X-Strapi-Branch';

export const BRANCH_COLOR_PALETTE = [
  '#4945FF',
  '#EE5E52',
  '#328048',
  '#D9822F',
  '#7B79FF',
  '#0C75AF',
  '#BE5D01',
  '#8312D1',
];
