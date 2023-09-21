import path from 'path';
import fs from 'fs-extra';
import tsUtils from '@strapi/typescript-utils';

const cleanupDistDirectory = async (distDir: string) => {
  if (!(await fs.pathExists(distDir))) {
    return;
  }

  const dirContent = await fs.readdir(distDir);
  const validFilenames = dirContent
    // Ignore the admin build folder
    .filter((filename) => filename !== 'build');

  for (const filename of validFilenames) {
    await fs.remove(path.resolve(distDir, filename));
  }
};

export default async ({
  srcDir,
  distDir,
  ignoreDiagnostics = false,
}: {
  srcDir: string;
  distDir: string;
  ignoreDiagnostics: boolean;
}) => {
  const isTSProject = await tsUtils.isUsingTypeScript(srcDir);

  if (!isTSProject) {
    throw new Error(`tsconfig file not found in ${srcDir}`);
  }

  await cleanupDistDirectory(distDir);

  return tsUtils.compile(srcDir, { configOptions: { ignoreDiagnostics } });
};
