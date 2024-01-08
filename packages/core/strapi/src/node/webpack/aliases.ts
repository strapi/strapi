import path from 'path';
import findRoot from 'find-root';
import type { StrapiMonorepo } from '../core/monorepo';

/**
 * @deprecated we will not support aliasing dependencies from V5.
 */
const adminPackageAliases = [
  '@strapi/design-system',
  '@strapi/helper-plugin',
  '@strapi/icons',
  'date-fns',
  'formik',
  'history',
  'immer',
  'qs',
  'lodash',
  'react',
  'react-dnd',
  'react-dnd-html5-backend',
  'react-dom',
  'react-error-boundary',
  'react-helmet',
  'react-is',
  'react-intl',
  'react-query',
  'react-redux',
  'react-router-dom',
  'react-window',
  'react-select',
  'redux',
  'reselect',
  'styled-components',
  'yup',
] as const;

/**
 * @deprecated we will not support aliasing dependencies from V5.
 */
const getAdminDependencyAliases = (monorepo?: StrapiMonorepo) =>
  adminPackageAliases
    .filter(
      (moduleName) => !monorepo?.path || (monorepo.path && moduleName !== '@strapi/helper-plugin')
    )
    .reduce((acc, moduleName) => {
      /**
       * We use `findRoot` instead of `resolveFrom` here because we don't want to
       * choose a particular file e.g. the CJS version over the ESM because the
       * bundler should decide this, so insted find-root is more appropriate.
       *
       * When we remove these aliases in V5 we can also remove the `find-root` package.
       */
      acc[`${moduleName}$`] = findRoot(require.resolve(moduleName));
      return acc;
    }, {} as Record<string, string>);

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
  '@strapi/content-type-builder/strapi-admin': './packages/core/content-type-builder/admin/src',
  '@strapi/email/strapi-admin': './packages/core/email/admin/src',
  '@strapi/upload/strapi-admin': './packages/core/upload/admin/src',
  '@strapi/plugin-color-picker/strapi-admin': './packages/plugins/color-picker/admin/src',
  '@strapi/plugin-documentation/strapi-admin': './packages/plugins/documentation/admin/src',
  '@strapi/plugin-graphql/strapi-admin': './packages/plugins/graphql/admin/src',
  '@strapi/plugin-i18n/strapi-admin': './packages/plugins/i18n/admin/src',
  '@strapi/plugin-sentry/strapi-admin': './packages/plugins/sentry/admin/src',
  '@strapi/plugin-users-permissions/strapi-admin': './packages/plugins/users-permissions/admin/src',
  '@strapi/helper-plugin': './packages/core/helper-plugin/src',
};

const getAliases = (cwd: string, monorepo?: StrapiMonorepo) => {
  const adminAliases = getAdminDependencyAliases(monorepo);
  const monorepoAliases = monorepo
    ? Object.fromEntries(
        Object.entries(devAliases).map(([key, modulePath]) => {
          return [key, path.join(monorepo.path, modulePath)];
        })
      )
    : {};

  return {
    ...adminAliases,
    ...monorepoAliases,
  };
};

export { getAliases };
