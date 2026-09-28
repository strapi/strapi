import execa from 'execa';

import type { DetectedPackageManager } from './package-manager';

/**
 * The install specs name the exact version picked for the app's Strapi. npm alone saves them as a
 * `^` range, which a later `npm update` would move past that choice, so it is told to keep them
 * exact. pnpm and Yarn already save an exact version as is.
 */
export const buildInstallCommand = (
  packageManager: DetectedPackageManager,
  installSpecs: string[]
): { command: string; args: string[] } => ({
  command: packageManager.name,
  args:
    packageManager.name === 'npm'
      ? ['install', '--save-exact', ...installSpecs]
      : ['add', ...installSpecs],
});

/**
 * Runs the app's own package manager with the terminal attached, so its output and prompts are
 * exactly what the user would see running it themselves. A failure rejects with its exit code.
 */
export const installPackages = async ({
  appDir,
  packageManager,
  installSpecs,
}: {
  appDir: string;
  packageManager: DetectedPackageManager;
  installSpecs: string[];
}): Promise<void> => {
  const { command, args } = buildInstallCommand(packageManager, installSpecs);

  await execa(command, args, { cwd: appDir, stdio: 'inherit' });
};
