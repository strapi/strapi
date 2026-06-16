import { createCommand } from 'commander';
import fs from 'fs';
import path from 'path';
import tsUtils from '@strapi/typescript-utils';
import { createStrapi, isAppDefinition, type AppDefinition } from '@strapi/core';
import { importDefault } from '@strapi/utils';

import type { StrapiCommand } from '../types';
import { runAction } from '../utils/helpers';

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

  const isTSProject = await tsUtils.isUsingTypeScript(appDir);

  const outDir = await tsUtils.resolveOutDir(appDir);
  const distDir = isTSProject ? outDir : appDir;

  const buildDirExists = fs.existsSync(outDir);
  if (isTSProject && !buildDirExists)
    throw new Error(
      `${outDir} directory not found. Please run the build command before starting your application`
    );

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
