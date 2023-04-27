/**
 * TODO: These types could be done better, since they're mock data
 * for user-permissions plugin it might be better to extract them
 * from that package and use them here.
 */

import { admin, Admin } from './admin-permissions';
import { contentManager, ContentManager } from './content-manager-permissions';
import { contentTypeBuilder, ContentTypeBuilder } from './content-type-builder-permissions';

const allPermissions = [...admin, ...contentManager, ...contentTypeBuilder];

type AdminPermissions = typeof allPermissions;

export {
  admin,
  Admin,
  contentManager,
  ContentManager,
  contentTypeBuilder,
  ContentTypeBuilder,
  allPermissions,
  AdminPermissions,
};
