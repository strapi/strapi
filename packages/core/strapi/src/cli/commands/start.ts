import { createCommand } from 'commander';
import fs from 'fs';
import path from 'path';
import { createStrapi } from '@strapi/core';

import type { StrapiCommand } from '../types';
import { runAction } from '../utils/helpers';

const action = async () => {
  const appDir = process.cwd();
  const tsconfigPath = path.join(appDir, 'tsconfig.json');
  const defaultDist = path.join(appDir, 'dist');

  let distDir: string;

  if (!fs.existsSync(tsconfigPath)) {
    distDir = appDir;
  } else if (fs.existsSync(path.join(defaultDist, 'src', 'index.js'))) {
    // Default outDir already built — skip loading `@strapi/typescript-utils`
    distDir = defaultDist;
  } else {
    // Custom outDir or unbuilt project — fall back to the slow correct path
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
