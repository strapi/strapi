import { createCommand } from 'commander';
import fs from 'fs';
import path from 'path';
import { createStrapi } from '@strapi/core';

import { lazyInit } from '@strapi/utils';
import type { StrapiCommand } from '../types';
import { runAction } from '../utils/helpers';
import { tryQuickOutDir } from '../utils/try-quick-outdir';

const importTsUtils = lazyInit<typeof import('@strapi/typescript-utils')>(() =>
  require('@strapi/typescript-utils')
);

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
      const tsUtils = importTsUtils();
      const outDir = await tsUtils.resolveOutDir(appDir);

      if (!outDir || !fs.existsSync(outDir)) {
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
