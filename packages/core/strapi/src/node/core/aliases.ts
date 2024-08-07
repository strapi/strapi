import path from 'node:path';
import { StrapiMonorepo } from './monorepo';

/**
 * The path mappings/aliases used by various tools in the monorepo to map imported modules to
 * source files in order to speed up rebuilding and avoid having a separate watcher process to build
 * from `src` to `lib`.
 *
 * This file is currently read by:
 * - Webpack when running the dev server (only when running in this monorepo)
 */
const devAliases: Record<string, string> = {
  '@strapi/admin/strapi-admin': './packages/core/admin/admin/src',
  '@strapi/content-releases/strapi-admin': './packages/core/content-releases/admin/src',
  '@strapi/content-manager/strapi-admin': './packages/core/content-manager/admin/src',
  '@strapi/content-type-builder/strapi-admin': './packages/core/content-type-builder/admin/src',
  '@strapi/email/strapi-admin': './packages/core/email/admin/src',
  '@strapi/upload/strapi-admin': './packages/core/upload/admin/src',
  '@strapi/plugin-cloud/strapi-admin': './packages/plugins/cloud/admin/src',
  '@strapi/plugin-color-picker/strapi-admin': './packages/plugins/color-picker/admin/src',
  '@strapi/plugin-documentation/strapi-admin': './packages/plugins/documentation/admin/src',
  '@strapi/plugin-graphql/strapi-admin': './packages/plugins/graphql/admin/src',
  '@strapi/i18n/strapi-admin': './packages/plugins/i18n/admin/src',
  '@strapi/plugin-sentry/strapi-admin': './packages/plugins/sentry/admin/src',
  '@strapi/plugin-users-permissions/strapi-admin': './packages/plugins/users-permissions/admin/src',
  '@strapi/review-workflows/strapi-admin': './packages/core/review-workflows/admin/src',
};

const getMonorepoAliases = ({ monorepo }: { monorepo?: StrapiMonorepo }) => {
  if (!monorepo?.path) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(devAliases).map(([key, modulePath]) => {
      return [key, path.join(monorepo.path, modulePath)];
    })
  );
};

export { getMonorepoAliases };
