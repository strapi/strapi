import browserslistToEsbuild from 'browserslist-to-esbuild';
import path from 'path';

import { resolveConfigProperty } from './core/config';
import { parseExports, ExtMap, Export } from './core/exports';
import { loadTsConfig } from './core/tsconfig';

import type { Config } from './core/config';
import type { Logger } from './core/logger';
import type { PackageJson } from './core/pkg';
import type { ParsedCommandLine } from 'typescript';

interface BuildContextArgs {
  config: Config;
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

type Runtime = '*' | 'node' | 'web';

interface BuildContext {
  config: Config;
  cwd: string;
  distPath: string;
  exports: Record<string, Export>;
  external: string[];
  extMap: ExtMap;
  logger: Logger;
  pkg: PackageJson;
  runtime?: Runtime;
  targets: Targets;
  ts?: {
    config: ParsedCommandLine;
    path: string;
  };
}

const DEFAULT_BROWSERS_LIST_CONFIG = [
  'last 3 major versions',
  'Firefox ESR',
  'last 2 Opera  versions',
  'not dead',
  'node 18.0.0',
];

/**
 * @description Create a build context for the pipeline we're creating,
 * this is shared among tasks so they all use the same settings for core pieces
 * such as a target, distPath, externals etc.
 */
const createBuildContext = async ({
  config,
  cwd,
  extMap,
  logger,
  pkg,
}: BuildContextArgs): Promise<BuildContext> => {
  const tsConfig = loadTsConfig({
    cwd,
    path: resolveConfigProperty(config.tsconfig, 'tsconfig.build.json'),
    logger,
  });

  const targets = {
    '*': browserslistToEsbuild(pkg.browserslist ?? DEFAULT_BROWSERS_LIST_CONFIG),
    node: browserslistToEsbuild(['node 18.0.0']),
    web: ['esnext'],
  };

  const parsedExports = parseExports({ extMap, pkg }).reduce((acc, x) => {
    const { _path: exportPath, ...exportEntry } = x;

    return { ...acc, [exportPath]: exportEntry };
  }, {} as Record<string, Export>);

  const exports = resolveConfigProperty(config.exports, parsedExports);

  const parsedExternals = [
    ...(pkg.dependencies ? Object.keys(pkg.dependencies) : []),
    ...(pkg.peerDependencies ? Object.keys(pkg.peerDependencies) : []),
  ];

  const external =
    config && Array.isArray(config.externals)
      ? [...parsedExternals, ...config.externals]
      : parsedExternals;

  const outputPaths = Object.values(exports)
    .flatMap((exportEntry) => {
      return [
        exportEntry.import,
        exportEntry.require,
        exportEntry.browser?.import,
        exportEntry.browser?.require,
        exportEntry.node?.source && exportEntry.node.import,
        exportEntry.node?.source && exportEntry.node.require,
      ].filter(Boolean) as string[];
    })
    .map((p) => path.resolve(cwd, p));

  const commonDistPath = findCommonDirPath(outputPaths);

  if (commonDistPath === cwd) {
    throw new Error(
      'all output files must share a common parent directory which is not the root package directory'
    );
  }

  if (commonDistPath && !pathContains(cwd, commonDistPath)) {
    throw new Error('all output files must be located within the package');
  }

  const configDistPath = config?.dist ? path.resolve(cwd, config.dist) : undefined;

  const distPath = configDistPath || commonDistPath;

  if (!distPath) {
    throw new Error("could not detect 'dist' path");
  }

  return {
    config,
    cwd,
    distPath,
    exports,
    external,
    extMap,
    logger,
    pkg,
    runtime: config?.runtime,
    targets,
    ts: tsConfig,
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

      if (dirPath === '.') {
        return undefined;
      }
    }
  }

  return commonPath;
};

export { createBuildContext };
export type { BuildContext, Targets, Runtime };
