import path from 'path';
import browserslistToEsbuild from 'browserslist-to-esbuild';

import { PackageJson } from './core/pkg';
import { parseExports, ExtMap, Export } from './core/exports';
import { Logger } from './core/logger';

interface BuildContextArgs {
  cwd: string;
  extMap: ExtMap;
  logger: Logger;
  pkg: PackageJson;
}

interface Targets {
  node: string[];
  web: string[];
  '*': string[];
}

interface BuildContext {
  cwd: string;
  distPath: string;
  exports: Record<string, Export>;
  external: string[];
  extMap: ExtMap;
  logger: Logger;
  pkg: PackageJson;
  targets: Targets;
}

const DEFAULT_BROWSERS_LIST_CONFIG = [
  'last 3 major versions',
  'Firefox ESR',
  'last 2 Opera  versions',
  'not dead',
  'node 16.0.0',
];

/**
 * @description Create a build context for the pipeline we're creating,
 * this is shared among tasks so they all use the same settings for core pieces
 * such as a target, distPath, externals etc.
 */
const createBuildContext = async ({
  cwd,
  extMap,
  logger,
  pkg,
}: BuildContextArgs): Promise<BuildContext> => {
  const targets = {
    '*': browserslistToEsbuild(pkg.browserslist ?? DEFAULT_BROWSERS_LIST_CONFIG),
    node: browserslistToEsbuild(['node 16.0.0']),
    web: ['esnext'],
  };

  const exports = parseExports({ extMap, pkg }).reduce((acc, x) => {
    const { _path: exportPath, ...exportEntry } = x;

    return { ...acc, [exportPath]: exportEntry };
  }, {} as Record<string, Export>);

  const external = [
    ...(pkg.dependencies ? Object.keys(pkg.dependencies) : []),
    ...(pkg.peerDependencies ? Object.keys(pkg.peerDependencies) : []),
  ];

  const outputPaths = Object.values(exports)
    .flatMap((exportEntry) => {
      return [exportEntry.import, exportEntry.require].filter(Boolean);
    })
    .map((p) => path.resolve(cwd, p as string));

  const distPath = findCommonDirPath(outputPaths);

  if (distPath === cwd) {
    throw new Error(
      'all output files must share a common parent directory which is not the root package directory'
    );
  }

  if (!distPath) {
    throw new Error("could not detect 'dist' path");
  }

  return {
    logger,
    cwd,
    pkg,
    exports,
    external,
    distPath,
    targets,
    extMap,
  };
};

/**
 * @internal
 */
const pathContains = (containerPath: string, itemPath: string): boolean => {
  return !path.relative(containerPath, itemPath).startsWith('..');
};

/**
 * @internal
 */
const findCommonDirPath = (filePaths: string[]): string | undefined => {
  let commonPath: string | undefined;

  for (const filePath of filePaths) {
    let dirPath = path.dirname(filePath);

    if (!commonPath) {
      commonPath = dirPath;
      // eslint-disable-next-line no-continue
      continue;
    }

    while (dirPath !== commonPath) {
      dirPath = path.dirname(dirPath);

      if (dirPath === commonPath) {
        break;
      }

      if (pathContains(dirPath, commonPath)) {
        commonPath = dirPath;
        break;
      }

      if (dirPath === '.') return undefined;
    }
  }

  return commonPath;
};

export { createBuildContext };
export type { BuildContext, Targets };
