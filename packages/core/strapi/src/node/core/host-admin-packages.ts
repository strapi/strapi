import { readFileSync } from 'node:fs';
import path from 'node:path';

/** The part of a manifest this module reads */
interface Manifest {
  dependencies?: Record<string, string>;
  exports?: Record<string, string | Record<string, string> | undefined>;
}

interface HostAdminModule {
  /** The specifier `src/admin.ts` imports. It is also the key of the monorepo alias map */
  modulePath: string;
  /** The directory that holds the admin entry, for the Tailwind scan */
  dir: string;
}

/**
 * The directory of a package's `./strapi-admin` target, read from its `exports` map. Every runtime
 * condition of that key names the same directory. Read `default`, `import`, then `require`, because
 * `types` and `source` name other directories
 */
const readAdminEntryDir = (requireFromHost: NodeRequire, name: string): string | null => {
  let manifestPath: string;

  try {
    // This also goes through the `exports` map, which every Strapi package opens
    manifestPath = requireFromHost.resolve(`${name}/package.json`);
  } catch {
    return null;
  }

  const manifest: Manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const entry = manifest.exports?.['./strapi-admin'];
  const target =
    typeof entry === 'string' ? entry : (entry?.default ?? entry?.import ?? entry?.require);

  if (typeof target !== 'string') {
    return null;
  }

  return path.resolve(path.dirname(manifestPath), path.dirname(target));
};

/**
 * Every `@strapi/strapi` dependency that exports `./strapi-admin`, with the directory of that entry.
 * `src/admin.ts` imports these into the host bundle, so no plugin walk finds them.
 *
 * The list comes from the `exports` map and not from a resolve of the entry, because a resolve needs
 * the built file on disk. An unbuilt checkout dropped every one of them in silence
 */
const getHostAdminModules = (
  requireFromHost: NodeRequire,
  manifestPath: string
): HostAdminModule[] => {
  const manifest: Manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  return Object.keys(manifest.dependencies ?? {}).flatMap((name) => {
    const dir = readAdminEntryDir(requireFromHost, name);

    return dir ? [{ modulePath: `${name}/strapi-admin`, dir }] : [];
  });
};

export { getHostAdminModules };
