/* eslint-disable check-file/filename-naming-convention */
import { DEFAULT_SPACE_SLUG, getCurrentSpaceSlug } from '../utils/currentSpace';

import type { RBACMiddleware } from '@strapi/admin/strapi-admin';

const SCHEMA_PERMISSION_PREFIX = 'plugin::content-type-builder.';

/**
 * The Content-Type Builder belongs to the default workspace.
 *
 * The schema is one shared thing — every workspace's entries are rows of the
 * same tables — so it is defined in one place and nowhere else. Rather than
 * showing the builder and refusing every edit, this drops the plugin's
 * permissions outside the default workspace, which takes the entry out of the
 * main navigation *and* answers a typed-in URL with the admin's own "you don't
 * have the permissions" page. The server refuses schema writes there too; this
 * is the affordance, not the guarantee.
 *
 * It also removes the Content Manager's shortcuts into the builder ("edit the
 * model"), which are gated on the same permission and would otherwise lead to
 * a page the workspace cannot use.
 */
export const workspaceSchemaAccessMiddleware: RBACMiddleware =
  () => (next) => async (permissions) => {
    if (getCurrentSpaceSlug() === DEFAULT_SPACE_SLUG) {
      return next(permissions);
    }

    return next(
      permissions.filter((permission) => !permission.action?.startsWith(SCHEMA_PERMISSION_PREFIX))
    );
  };
