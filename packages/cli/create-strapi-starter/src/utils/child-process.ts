import { execSync } from 'child_process';
import execa from 'execa';

import logger from './logger';
import type { PackageManager } from '../types';

const installArguments = ['install'];

const installArgumentsMap = {
  npm: ['--legacy-peer-deps'],
  yarn: ['--network-timeout 1000000'],
  pnpm: [],
};

export function runInstall(path: string, packageManager: PackageManager) {
  const options: execa.Options = {
    cwd: path,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
    },
  };

  if (packageManager in installArgumentsMap) {
    installArguments.push(...(installArgumentsMap[packageManager] ?? []));
  }

  return execa(packageManager, installArguments, options);
}

export function runApp(rootPath: string, packageManager: PackageManager) {
  return execa(packageManager, ['run', 'develop'], {
    stdio: 'inherit',
    cwd: rootPath,
  });
}

export async function initGit(rootPath: string) {
  try {
    await execa('git', ['init'], {
      cwd: rootPath,
    });
  } catch (err) {
    logger.warn('Could not initialize a git repository');
  }

  try {
    await execa('git', ['add', '-A'], { cwd: rootPath });

    execSync('git commit -m "Create Strapi starter project"', {
      cwd: rootPath,
    });
  } catch (err) {
    logger.warn('Could not create initial git commit');
  }
}
