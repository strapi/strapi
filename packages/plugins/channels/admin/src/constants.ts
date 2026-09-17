/**
 * Permissions consumed by the Channels admin UI. Actions are registered
 * server-side in `services/permissions/actions.ts` and enforced by the
 * `admin::hasPermissions` policy on the `/channels` routes.
 *
 * NOTE: `useRBAC` derives each `allowedActions` key from the LAST segment of
 * the action id: `plugin::channels.reset` → `canReset`.
 */
export const PERMISSIONS = {
  read: [{ action: 'plugin::channels.read', subject: null }],
  create: [{ action: 'plugin::channels.create', subject: null }],
  update: [{ action: 'plugin::channels.update', subject: null }],
  delete: [{ action: 'plugin::channels.delete', subject: null }],
  reset: [{ action: 'plugin::channels.reset', subject: null }],
};

/** The virtual base channel: no row server-side, no header on requests. */
export const DEFAULT_CHANNEL_SLUG = 'default';

export const CHANNEL_HEADER = 'X-Strapi-Channel';

export const CHANNEL_COLOR_PALETTE = [
  '#4945FF',
  '#EE5E52',
  '#328048',
  '#D9822F',
  '#7B79FF',
  '#0C75AF',
  '#BE5D01',
  '#8312D1',
];
