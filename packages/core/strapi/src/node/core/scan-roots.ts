import { createRequire } from 'node:module';
import path from 'node:path';

import { getMonorepoAliases, getMonorepoEeAdminSource } from './aliases';
import { loadStrapiMonorepo } from './monorepo';

import type { BuildContext } from '../create-build-context';

/** The `@strapi/strapi` dependencies that `src/admin.ts` imports, so no plugin walk finds them */
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
 * stylesheet must name every directory that holds admin code.
 *
 * @param dev - true for the Vite development server, which serves `admin/src`. Tailwind must scan
 * what Vite serves. Every other case scans `dist`
 */
const getScanRoots = async (ctx: ScanContext, dev: boolean): Promise<string[]> => {
  const requireFromEntry = createRequire(path.join(ctx.runtimeDir, 'app.js'));
  const monorepo = dev ? await loadStrapiMonorepo(ctx.cwd) : undefined;
  const aliases = getMonorepoAliases({ monorepo });

  // Under strict pnpm the `@strapi/strapi` manifest is the only place the host packages resolve
  const manifestPath = require.resolve('@strapi/strapi/package.json');
  const requireFromHost = createRequire(manifestPath);

  // The alias wins, because it names the directory Vite serves and not an unbuilt `dist`
  const hostRoots = HOST_ADMIN_PACKAGES.map((name) => {
    const modulePath = `${name}/strapi-admin`;
    return aliases[modulePath] ?? path.dirname(requireFromHost.resolve(modulePath));
  });

  const pluginRoots = ctx.plugins.map(
    (plugin) =>
      aliases[plugin.modulePath] ?? path.dirname(requireFromEntry.resolve(plugin.modulePath))
  );

  // The `@strapi/admin` alias names `admin/src` only, so the Enterprise tree is a second root
  const eeAdminSource = getMonorepoEeAdminSource({ monorepo });
  const eeRoots = eeAdminSource ? [eeAdminSource] : [];

  // `customisations.path` is the `app.{js,ts,…}` file, so the root is its directory
  const appRoots = ctx.customisations ? [path.dirname(ctx.customisations.path)] : [];

  // A package can be both a host dependency and an enabled plugin
  return [...new Set([...hostRoots, ...pluginRoots, ...eeRoots, ...appRoots])];
};

/** A glob separator is a forward slash on every platform, so replace every backslash */
const toGlobPath = (value: string): string => value.replace(/\\/g, '/');

export { getScanRoots, toGlobPath, HOST_ADMIN_PACKAGES };
export type { ScanContext };
