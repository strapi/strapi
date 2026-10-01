import execa from 'execa';

import type { DetectedPackageManager } from './package-manager';

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
