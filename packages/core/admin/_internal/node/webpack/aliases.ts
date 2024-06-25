import path from 'path';
import findRoot from 'find-root';
import type { StrapiMonorepo } from '../core/monorepo';
import { getMonorepoAliases } from '../core/aliases';

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

const getAliases = (cwd: string, monorepo?: StrapiMonorepo) => {
  const adminAliases = getAdminDependencyAliases(monorepo);
  const monorepoAliases = getMonorepoAliases({ monorepo });

  return {
    ...adminAliases,
    ...monorepoAliases,
  };
};

export { getAliases };
