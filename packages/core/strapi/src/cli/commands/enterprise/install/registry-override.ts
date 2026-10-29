import os from 'node:os';
import path from 'node:path';
import fse from 'fs-extra';

import type { Logger } from '../../../utils/logger';
import { EnterpriseInstallError } from './errors';
import { readsYarnrcYml, type DetectedPackageManager } from './package-manager';
import {
  buildNpmrcConfiguration,
  buildYarnrcConfiguration,
  describeRegistry,
  findOverridingConfigFiles,
  getUserNpmrcPath,
  type ConfiguredRegistry,
  type RegistrySetup,
} from './registry-access';

const buildYarnEnvironment = (
  configDir: string,
  registry: ConfiguredRegistry,
  env: NodeJS.ProcessEnv,
  homeDir: string
): NodeJS.ProcessEnv => {
  const { protocol, hostname } = new URL(registry.url);
  // Yarn keeps its global cache under the home folder, unless one of these moves it elsewhere.
  // Pointing it to the real home folder keeps the cache where it was.
  const keepsGlobalFolder =
    env.YARN_GLOBAL_FOLDER !== undefined ||
    env.XDG_DATA_HOME !== undefined ||
    process.platform === 'win32';

  return {
    HOME: configDir,
    USERPROFILE: configDir,
    ...(keepsGlobalFolder ? {} : { YARN_GLOBAL_FOLDER: path.join(homeDir, '.yarn', 'berry') }),
    ...(protocol === 'http:'
      ? {
          YARN_UNSAFE_HTTP_WHITELIST: [env.YARN_UNSAFE_HTTP_WHITELIST, hostname]
            .filter(Boolean)
            .join(','),
        }
      : {}),
  };
};

/**
 * Sets up a `--registry` override for the install only. The package manager reads a temporary user
 * configuration, so the override and the license are never saved to the real one.
 */
export const prepareRegistryOverride = async ({
  registryUrl,
  appDir,
  packageManager,
  license,
  logger,
  env,
  homeDir,
}: {
  registryUrl: string;
  appDir: string;
  packageManager: DetectedPackageManager;
  license: string;
  logger: Logger;
  env: NodeJS.ProcessEnv;
  homeDir: string;
}): Promise<RegistrySetup> => {
  const registry = describeRegistry(registryUrl);
  const usesYarnrcYml = readsYarnrcYml(packageManager);
  const overridingFiles = await findOverridingConfigFiles({
    appDir,
    packageManager,
    // Yarn 2+ reads a `.yarnrc.yml` above the app before the one in the home folder, so the real
    // `~/.yarnrc.yml` still takes precedence when the app is inside the home folder.
    userConfigPaths: usesYarnrcYml
      ? []
      : [getUserNpmrcPath(env, homeDir), path.join(homeDir, '.npmrc')],
    license,
    registry,
  });

  if (overridingFiles.length > 0) {
    throw new EnterpriseInstallError(
      [
        ...overridingFiles.map(
          (filePath) =>
            `${filePath} sets another license for ${registry.host} and takes precedence over --registry.`
        ),
        'Update or remove that line, then run the command again.',
      ].join('\n')
    );
  }

  return {
    async apply() {
      // Nothing is saved: the setup only exists while the install runs.
    },
    async install(installPackages) {
      const configDir = await fse.mkdtemp(path.join(os.tmpdir(), 'strapi-enterprise-registry-'));

      try {
        if (usesYarnrcYml) {
          await fse.writeFile(
            path.join(configDir, '.yarnrc.yml'),
            `${buildYarnrcConfiguration(license, registry)}\n`,
            { mode: 0o600 }
          );
          await installPackages(buildYarnEnvironment(configDir, registry, env, homeDir));
        } else {
          const configPath = path.join(configDir, '.npmrc');

          await fse.writeFile(configPath, `${buildNpmrcConfiguration(license, registry)}\n`, {
            mode: 0o600,
          });
          await installPackages({
            NPM_CONFIG_USERCONFIG: configPath,
            npm_config_userconfig: configPath,
          });
        }
      } finally {
        await fse.remove(configDir);
      }

      logger.warn(`The lockfile may now contain ${registry.host} URLs. Do not commit it.`);
    },
  };
};
