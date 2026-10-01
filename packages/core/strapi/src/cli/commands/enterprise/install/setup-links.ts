import type { Logger } from '../../../utils/logger';
import { ENTERPRISE_PLUGINS_DOCS_URL } from './constants';
import { declaresStrapiKind } from './discovery';
import { readInstalledPackageJson } from './versions';

export interface SetupLink {
  packageName: string;
  url: string;
}

export const readSetupLink = async (
  appDir: string,
  packageName: string
): Promise<SetupLink | undefined> => {
  const packageJson = await readInstalledPackageJson(appDir, packageName);

  if (!packageJson?.strapi || !declaresStrapiKind(packageJson.strapi.kind)) {
    return undefined;
  }

  const { homepage } = packageJson;

  return {
    packageName,
    url:
      typeof homepage === 'string' && homepage.length > 0 ? homepage : ENTERPRISE_PLUGINS_DOCS_URL,
  };
};

export interface InstalledPackage {
  packageName: string;
  replacesInstalledVersion: boolean;
}

export const printSetupLinks = async ({
  appDir,
  installedPackages,
  logger,
}: {
  appDir: string;
  installedPackages: InstalledPackage[];
  logger: Logger;
}): Promise<void> => {
  for (const { packageName, replacesInstalledVersion } of installedPackages) {
    const setupLink = await readSetupLink(appDir, packageName);

    if (!setupLink) {
      continue;
    }

    if (replacesInstalledVersion) {
      logger.info(`Updated ${setupLink.packageName}. See what changed at ${setupLink.url}`);
    } else {
      logger.warn(
        `Set up ${setupLink.packageName} before starting Strapi, following the guide at ${setupLink.url}`
      );
    }
  }
};
