import fs from 'fs';
import tsUtils from '@strapi/typescript-utils';
import strapi from '../../../Strapi';

/**
 * `$ strapi start`
 */
export default async () => {
  const appDir = process.cwd();

  const isTSProject = await tsUtils.isUsingTypeScript(appDir);

  const outDir = await tsUtils.resolveOutDir(appDir);
  const distDir = isTSProject ? outDir : appDir;

  const buildDirExists = fs.existsSync(outDir);
  if (isTSProject && !buildDirExists)
    throw new Error(
      `${outDir} directory not found. Please run the build command before starting your application`
    );

  strapi({ appDir, distDir }).start();
};
