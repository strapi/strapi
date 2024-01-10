import execa from 'execa';
import preferredPM from 'preferred-pm';

import type { Options as ProcessOptions } from 'execa';

const SUPPORTED_PACKAGE_MANAGERS = ['npm', 'yarn'];
const DEFAULT_PACKAGE_MANAGER = 'npm' as const;

type SupportedPackageManagerName = 'npm' | 'yarn';

export const getPreferred = async (pkgPath: string): Promise<SupportedPackageManagerName> => {
  const pm = await preferredPM(pkgPath);

  const hasPackageManager = pm !== undefined;
  if (!hasPackageManager) {
    throw new Error(`Couldn't find a package manager in your project.`);
  }

  const isPackageManagerSupported = SUPPORTED_PACKAGE_MANAGERS.includes(pm.name);
  if (!isPackageManagerSupported) {
    process.emitWarning(
      `We detected your package manager (${pm.name} v${pm.version}), but it's not officially supported by Strapi yet. Defaulting to npm instead.`
    );

    return DEFAULT_PACKAGE_MANAGER;
  }

  return pm.name as SupportedPackageManagerName;
};

export const installDependencies = (
  path: string,
  packageManager: SupportedPackageManagerName,
  options: ProcessOptions<string> = {}
) => {
  return execa(packageManager, ['install'], { ...options, cwd: path, stdin: 'ignore' });
};
