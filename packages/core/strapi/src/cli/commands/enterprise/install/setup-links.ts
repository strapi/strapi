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

export const printSetupLinks = async ({
  appDir,
  packageNames,
  logger,
}: {
  appDir: string;
  packageNames: string[];
  logger: Logger;
}): Promise<void> => {
  for (const packageName of packageNames) {
    const setupLink = await readSetupLink(appDir, packageName);

    if (setupLink) {
      logger.warn(
        `⚠️  Set up ${setupLink.packageName} before starting Strapi, following the guide at ${setupLink.url}`
      );
    }
  }
};
