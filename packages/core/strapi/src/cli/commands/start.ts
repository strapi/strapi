import { createCommand } from 'commander';
import fs from 'fs';
import path from 'path';
import { createStrapi } from '@strapi/core';

import type { CLIContext, StrapiCommand } from '../types';
import { runAction } from '../utils/helpers';
import { tryQuickOutDir } from '../utils/try-quick-outdir';

interface StartCommandOptions extends CLIContext {
  tsconfigPath: string;
}

const action = async (options: StartCommandOptions) => {
  const appDir = options.cwd;
  const tsconfigPath = options.tsconfigPath;

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
