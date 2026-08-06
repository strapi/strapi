import { createCommand } from 'commander';
import fs from 'fs';
import path from 'path';
import { createStrapi, isAppDefinition, type AppDefinition } from '@strapi/core';
import { importDefault } from '@strapi/utils';

import type { StrapiCommand } from '../types';
import { runAction } from '../utils/helpers';
import { tryQuickOutDir } from '../utils/try-quick-outdir';

/**
 * Detect a programmatic app: a compiled `src/index.js` whose default export is
 * a `defineApp(...)` result (ADR-0009). Returning it lets `strapi start` thread
 * `app` (and therefore `app.config`) through construction.
 */
const detectAppDefinition = (distDir: string): AppDefinition | undefined => {
  const indexPath = path.resolve(distDir, 'src', 'index.js');

  if (!fs.existsSync(indexPath)) {
    return undefined;
  }

  try {
    const mod = importDefault(indexPath);
    return isAppDefinition(mod) ? mod : undefined;
  } catch {
    return undefined;
  }
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

  const app = detectAppDefinition(distDir);

  createStrapi(app ? { appDir, distDir, app } : { appDir, distDir }).start();
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
