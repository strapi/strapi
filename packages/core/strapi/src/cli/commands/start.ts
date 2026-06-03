import { createCommand } from 'commander';
import fs from 'fs';
import path from 'path';
import { createStrapi } from '@strapi/core';

import type { StrapiCommand } from '../types';
import { runAction } from '../utils/helpers';

const DEFAULT_OUT_DIR = 'dist';

/**
 * Read `compilerOptions.outDir` from tsconfig.json without loading `typescript` or
 * `@strapi/typescript-utils`. Returns null when the file cannot be parsed or when
 * `extends` may define outDir (fall back to resolveOutDir).
 */
const tryQuickOutDir = (appDir: string, tsconfigPath: string): string | null => {
  let raw: unknown;
  try {
    raw = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
  } catch {
    return null;
  }

  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const config = raw as { extends?: string; compilerOptions?: { outDir?: string } };
  const localOutDir = config.compilerOptions?.outDir;

  if (config.extends && localOutDir === undefined) {
    return null;
  }

  return path.resolve(appDir, localOutDir ?? DEFAULT_OUT_DIR);
};

const action = async () => {
  const appDir = process.cwd();
  const tsconfigPath = path.join(appDir, 'tsconfig.json');

  let distDir: string;

  if (!fs.existsSync(tsconfigPath)) {
    distDir = appDir;
  } else {
    const quickOutDir = tryQuickOutDir(appDir, tsconfigPath);

    if (quickOutDir && fs.existsSync(path.join(quickOutDir, 'src', 'index.js'))) {
      // Built output at configured outDir — skip loading `@strapi/typescript-utils`
      distDir = quickOutDir;
    } else {
      // Custom/extended tsconfig or unbuilt project — fall back to the slow correct path
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const tsUtils = require('@strapi/typescript-utils');
      const outDir = await tsUtils.resolveOutDir(appDir);

      if (!fs.existsSync(outDir)) {
        throw new Error(
          `${outDir} directory not found. Please run the build command before starting your application`
        );
      }

      distDir = outDir;
    }
  }

  createStrapi({ appDir, distDir }).start();
};

/**
 * `$ strapi start`
 */
const command: StrapiCommand = () => {
  return createCommand('start')
    .description('Start your Strapi application')
    .action(runAction('start', action));
};

export { command };
