import execa from 'execa';

import type { Options as ProcessOptions } from 'execa';
import { getPreferredPM } from './get-preferred-pm';

const SUPPORTED_PACKAGE_MANAGERS = ['npm', 'yarn', 'pnpm'] as const;
const DEFAULT_PACKAGE_MANAGER = 'npm' as const;

type SupportedPackageManagerName = (typeof SUPPORTED_PACKAGE_MANAGERS)[number];

export const getPreferred = async (pkgPath: string): Promise<SupportedPackageManagerName> => {
  const preferredPM = await getPreferredPM();
  const pm = await preferredPM(pkgPath);

  if (pm == null) {
    throw new Error(`Couldn't find a package manager in your project.`);
  }

  const isPackageManagerSupported = (SUPPORTED_PACKAGE_MANAGERS as readonly string[]).includes(
    pm.name
  );
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
