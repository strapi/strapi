import path from 'path';
import readPkgUp from 'read-pkg-up';

interface StrapiMonorepo {
  path: string;
}

/**
 * Load information about the strapi CMS monorepo (if applicable)
 *
 * @internal
 */
async function loadStrapiMonorepo(cwd: string): Promise<StrapiMonorepo | undefined> {
  let p = cwd;

  while (p !== '/') {
    const readResult = await readPkgUp({ cwd: p });

    if (!readResult) {
      return undefined;
    }

    if (readResult.packageJson.isStrapiMonorepo) {
      return { path: path.dirname(readResult.path) };
    }

    p = path.dirname(path.dirname(readResult.path));
  }

  return undefined;
}

export { loadStrapiMonorepo };
export type { StrapiMonorepo };
