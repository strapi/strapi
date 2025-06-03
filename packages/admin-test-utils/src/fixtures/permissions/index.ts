/**
 * TODO: These types could be done better, since they're mock data
 * for user-permissions plugin it might be better to extract them
 * from that package and use them here.
 */

import { admin, type Admin, app, type App } from './admin-permissions';
import { contentManager, type ContentManager } from './content-manager-permissions';
import { contentTypeBuilder, type ContentTypeBuilder } from './content-type-builder-permissions';
import { type Documentation, documentation } from './documentation-permissions';

// TODO: this should be called userPermissions
const allPermissions = [...admin, ...contentManager, ...contentTypeBuilder, ...documentation];

type AdminPermissions = typeof allPermissions;

export {
  admin,
  Admin,
  app,
  App,
  contentManager,
  ContentManager,
  contentTypeBuilder,
  ContentTypeBuilder,
  allPermissions,
  AdminPermissions,
  Documentation,
};
