import execa from 'execa';

import { EnterpriseInstallError, PackageManagerError } from './errors';
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

  try {
    await execa(command, args, { cwd: appDir, stdio: 'inherit' });
  } catch (error) {
    const { code, exitCode } = (error ?? {}) as { code?: string; exitCode?: number };

    if (code === 'ENOENT') {
      throw new EnterpriseInstallError(`Could not run ${command}. Check that it is installed.`);
    }

    throw new PackageManagerError(typeof exitCode === 'number' && exitCode !== 0 ? exitCode : 1);
  }
};
