import { createRequire } from 'node:module';
import path from 'node:path';

import { getMonorepoAliases, getMonorepoEeAdminSource } from './aliases';
import { loadStrapiMonorepo } from './monorepo';

import type { BuildContext } from '../create-build-context';

/**
 * The `@strapi/strapi` dependencies that `src/admin.ts` imports into the host bundle, so no plugin
 * walk finds them. A test pins this list to that file
 */
const HOST_ADMIN_PACKAGES = [
  '@strapi/admin',
  '@strapi/content-type-builder',
  '@strapi/content-manager',
  '@strapi/email',
  '@strapi/upload',
  '@strapi/i18n',
  '@strapi/content-releases',
  '@strapi/review-workflows',
];

type ScanContext = Pick<BuildContext, 'cwd' | 'runtimeDir' | 'plugins' | 'customisations'>;

/**
 * The directories Tailwind scans for class names. Tailwind never looks in `node_modules`, so the
 * stylesheet must name every directory that holds admin code. Four lists supply them: the
 * `@strapi/strapi` dependencies that export `./strapi-admin`, the enabled plugins, the Enterprise
 * sources of `@strapi/admin`, and the application's own `src/admin`.
 *
 * `dev` is the Vite development server, which serves `admin/src`. Tailwind must scan what Vite
 * serves. Every other case scans `dist`
 */
const getScanRoots = async (ctx: ScanContext, dev: boolean): Promise<string[]> => {
  const requireFromEntry = createRequire(path.join(ctx.runtimeDir, 'app.js'));
  const monorepo = dev ? await loadStrapiMonorepo(ctx.cwd) : undefined;
  const aliases = getMonorepoAliases({ monorepo });

  // The application never declares the host admin packages, so resolve them from `@strapi/strapi`.
  // Under strict pnpm they resolve from nowhere else
  const manifestPath = require.resolve('@strapi/strapi/package.json');
  const requireFromHost = createRequire(manifestPath);

  // The alias wins, because it names the directory Vite serves. An unbuilt checkout in
  // development then never resolves `dist`
  const hostRoots = HOST_ADMIN_PACKAGES.map((name) => {
    const modulePath = `${name}/strapi-admin`;
    return aliases[modulePath] ?? path.dirname(requireFromHost.resolve(modulePath));
  });

  // The monorepo alias wins over the admin entry, because it names the directory Vite serves
  const pluginRoots = ctx.plugins.map(
    (plugin) =>
      aliases[plugin.modulePath] ?? path.dirname(requireFromEntry.resolve(plugin.modulePath))
  );

  // The `@strapi/admin` alias names `admin/src` only, so the Enterprise sources are a second root
  // in development. Production compiles both trees into one `dist/admin`
  const eeAdminSource = getMonorepoEeAdminSource({ monorepo });
  const eeRoots = eeAdminSource ? [eeAdminSource] : [];

  // `customisations.path` is the `app.{js,ts,…}` file, so the root is its directory
  const appRoots = ctx.customisations ? [path.dirname(ctx.customisations.path)] : [];

  // A package can be both a host dependency and an enabled plugin
  return [...new Set([...hostRoots, ...pluginRoots, ...eeRoots, ...appRoots])];
};

/**
 * An `@source` value is a glob, and a glob separator is a forward slash on every platform. Split on
 * both separators, so the result does not depend on the platform that runs the build
 */
const toGlobPath = (value: string): string => value.replace(/\\/g, '/');

export { getScanRoots, toGlobPath, HOST_ADMIN_PACKAGES };
export type { ScanContext };
