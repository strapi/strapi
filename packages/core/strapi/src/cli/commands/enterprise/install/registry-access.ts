import os from 'os';
import path from 'path';
import fse from 'fs-extra';

import type { Logger } from '../../../utils/logger';
import { ENTERPRISE_REGISTRY_URL, ENTERPRISE_SCOPE } from './constants';
import { EnterpriseInstallError } from './errors';
import { listAncestorDirectories } from './directories';
import type { ResolvedLicense } from './license';
import { readsYarnrcYml, type DetectedPackageManager } from './package-manager';
import { getRegistryUrl } from './registry';

const SCOPE_REGISTRY_KEY = `${ENTERPRISE_SCOPE}:registry`;
const YARNRC_SCOPE_NAME = ENTERPRISE_SCOPE.slice(1);
const LICENSE_PLACEHOLDER = '<your license>';

// References the package manager expands when it reads the file, so the license stays off disk.
// Yarn 2+ fails every command on the machine when a referenced variable is unset, unless it has a
// default. `.npmrc` has no form that works everywhere: an unset variable breaks every Yarn 1
// command and makes pnpm warn on each one, and npm, pnpm and Yarn 1 share `~/.npmrc`.
/* eslint-disable no-template-curly-in-string */
const NPMRC_LICENSE_REFERENCE = '${STRAPI_LICENSE}';
const YARNRC_LICENSE_REFERENCE = '${STRAPI_LICENSE:-}';
/* eslint-enable no-template-curly-in-string */

const shouldReferenceLicense = (
  licenseSource: ResolvedLicense['source'],
  env: NodeJS.ProcessEnv
): boolean => licenseSource === 'environment' && Boolean(env.CI) && env.CI !== 'false';

export type RegistryAccessStatus =
  | 'not-configured'
  | 'already-configured'
  | 'uses-environment-variable'
  | 'different-license'
  | 'manual-edit-needed';

export interface RegistryAccessOutcome {
  status: RegistryAccessStatus;
  filePath: string;
  /** The configuration the file should contain, with a placeholder instead of the license. */
  expectedConfiguration: string;
  /** For `not-configured`: the lines to add, with the license or a reference to it. */
  linesToAdd?: string;
}

export interface ConfiguredRegistry {
  /** Always ends with a slash, as npm expects for a scope registry. */
  url: string;
  host: string;
  /** The npm key holding the token for this registry, such as `//packages.strapi.io/:_authToken`. */
  tokenKey: string;
}

export const describeRegistry = (registryUrl: string): ConfiguredRegistry => {
  const url = new URL(`${registryUrl.replace(/\/+$/, '')}/`);

  return { url: url.href, host: url.host, tokenKey: `//${url.host}${url.pathname}:_authToken` };
};

const STRAPI_REGISTRY = describeRegistry(ENTERPRISE_REGISTRY_URL);

export const buildNpmrcConfiguration = (
  token: string,
  registry: ConfiguredRegistry = STRAPI_REGISTRY
): string => [`${SCOPE_REGISTRY_KEY}=${registry.url}`, `${registry.tokenKey}=${token}`].join('\n');

export const buildYarnrcConfiguration = (
  token: string,
  registry: ConfiguredRegistry = STRAPI_REGISTRY
): string =>
  [
    'npmScopes:',
    `  ${YARNRC_SCOPE_NAME}:`,
    `    npmRegistryServer: '${registry.url}'`,
    '    npmAlwaysAuth: true',
    `    npmAuthToken: '${token}'`,
  ].join('\n');

export const getUserNpmrcPath = (
  env: NodeJS.ProcessEnv = process.env,
  homeDir: string = os.homedir()
): string => env.NPM_CONFIG_USERCONFIG ?? env.npm_config_userconfig ?? path.join(homeDir, '.npmrc');

export const getUserYarnrcPath = (homeDir: string = os.homedir()): string =>
  path.join(homeDir, '.yarnrc.yml');

const readFileIfExists = async (filePath: string): Promise<string> =>
  (await fse.pathExists(filePath)) ? fse.readFile(filePath, 'utf8') : '';

const appendToFile = async (filePath: string, text: string) => {
  const existingContent = await readFileIfExists(filePath);
  const separator = existingContent.length > 0 && !existingContent.endsWith('\n') ? '\n' : '';

  await fse.ensureDir(path.dirname(filePath));
  await fse.appendFile(filePath, `${separator}${text}\n`);
  // The file may now hold the license. A mode passed when writing only applies to a new file, so
  // an existing one is restricted to its owner explicitly, as npm does when it saves this file.
  await fse.chmod(filePath, 0o600);
};

const unquote = (value: string): string => value.replace(/^(['"])(.*)\1$/, '$2');

const parseNpmrc = (content: string): Map<string, string> =>
  new Map(
    content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('#') && !line.startsWith(';'))
      .map((line): [string, string] => {
        const separatorIndex = line.indexOf('=');

        return separatorIndex === -1
          ? [line, '']
          : [line.slice(0, separatorIndex).trim(), unquote(line.slice(separatorIndex + 1).trim())];
      })
  );

const withoutTrailingSlash = (url: string | undefined) => url?.replace(/\/+$/, '');

const isEnvironmentVariableReference = (value: string | undefined): boolean =>
  value?.startsWith('${') ?? false;

export const inspectNpmrc = async (
  filePath: string,
  license: string,
  registry: ConfiguredRegistry = STRAPI_REGISTRY,
  writtenToken: string = license
): Promise<RegistryAccessOutcome> => {
  const content = await readFileIfExists(filePath);
  const entries = parseNpmrc(content);
  const scopeRegistry = entries.get(SCOPE_REGISTRY_KEY);
  const registryToken = entries.get(registry.tokenKey);
  const outcome = (status: RegistryAccessStatus): RegistryAccessOutcome => ({
    status,
    filePath,
    expectedConfiguration: buildNpmrcConfiguration(LICENSE_PLACEHOLDER, registry),
  });

  if (scopeRegistry === undefined && registryToken === undefined) {
    return {
      ...outcome('not-configured'),
      linesToAdd: buildNpmrcConfiguration(writtenToken, registry),
    };
  }

  if (isEnvironmentVariableReference(registryToken)) {
    return outcome('uses-environment-variable');
  }

  const isScopeRegistryCorrect =
    withoutTrailingSlash(scopeRegistry) === withoutTrailingSlash(registry.url);

  if (registryToken === license && isScopeRegistryCorrect) {
    return outcome('already-configured');
  }

  if (registryToken !== undefined && registryToken !== license) {
    return outcome('different-license');
  }

  return outcome('manual-edit-needed');
};

const YARNRC_SCOPE_LINE = new RegExp(`^\\s+["']?${YARNRC_SCOPE_NAME}["']?\\s*:`);

const hasYarnrcScope = (content: string): boolean =>
  content.split(/\r?\n/).some((line) => YARNRC_SCOPE_LINE.test(line));

const readYarnrcScopeToken = (content: string): string | undefined => {
  const lines = content.split(/\r?\n/);
  const scopeLineIndex = lines.findIndex((line) => YARNRC_SCOPE_LINE.test(line));

  if (scopeLineIndex === -1) {
    return undefined;
  }

  const scopeIndentation = lines[scopeLineIndex].search(/\S/);

  for (const line of lines.slice(scopeLineIndex + 1)) {
    if (line.trim() === '' || line.trim().startsWith('#')) {
      continue;
    }

    if (line.search(/\S/) <= scopeIndentation) {
      return undefined;
    }

    const tokenMatch = /^\s*npmAuthToken\s*:\s*(.*)$/.exec(line);

    if (tokenMatch) {
      return unquote(tokenMatch[1].trim());
    }
  }

  return undefined;
};

export const inspectYarnrc = async (
  filePath: string,
  license: string,
  registry: ConfiguredRegistry = STRAPI_REGISTRY,
  writtenToken: string = license
): Promise<RegistryAccessOutcome> => {
  const content = await readFileIfExists(filePath);
  const outcome = (status: RegistryAccessStatus): RegistryAccessOutcome => ({
    status,
    filePath,
    expectedConfiguration: buildYarnrcConfiguration(LICENSE_PLACEHOLDER, registry),
  });

  if (!/^npmScopes\s*:/m.test(content)) {
    return {
      ...outcome('not-configured'),
      linesToAdd: buildYarnrcConfiguration(writtenToken, registry),
    };
  }

  if (!hasYarnrcScope(content)) {
    return outcome('manual-edit-needed');
  }

  if (content.includes(license)) {
    // The license may be set for another registry, such as a local one used for testing.
    return outcome(content.includes(registry.url) ? 'already-configured' : 'manual-edit-needed');
  }

  if (/npmAuthToken\s*:\s*["']?\$\{/.test(content)) {
    return outcome('uses-environment-variable');
  }

  return outcome('different-license');
};

const assertRegistryAccessUsable = ({
  outcome: { status, filePath, expectedConfiguration },
  overridingFiles,
  registryHost,
  userConfigPath,
}: {
  outcome: RegistryAccessOutcome;
  overridingFiles: string[];
  registryHost: string;
  userConfigPath: string;
}): void => {
  if (status === 'different-license') {
    throw new EnterpriseInstallError(
      `${filePath} already sets up ${registryHost} with another license, so installing would fail. Replace those lines with:\n\n${expectedConfiguration}\n`
    );
  }

  if (status === 'manual-edit-needed') {
    throw new EnterpriseInstallError(
      `${filePath} could not be updated automatically. Add this to it, then run the command again:\n\n${expectedConfiguration}\n`
    );
  }

  if (overridingFiles.length > 0) {
    throw new EnterpriseInstallError(
      [
        ...overridingFiles.map(
          (filePath) =>
            `${filePath} sets another license for ${registryHost} and takes precedence over ${userConfigPath}.`
        ),
        'Update or remove that line, then run the command again.',
      ].join('\n')
    );
  }
};

const isWorkspaceRoot = async (directory: string): Promise<boolean> => {
  if (await fse.pathExists(path.join(directory, 'pnpm-workspace.yaml'))) {
    return true;
  }

  try {
    const packageJson = await fse.readJson(path.join(directory, 'package.json'));
    return packageJson?.workspaces !== undefined;
  } catch {
    return false;
  }
};

export const listProjectConfigDirectories = async (
  appDir: string,
  packageManager: DetectedPackageManager
): Promise<string[]> => {
  const [appDirectory, ...parentDirectories] = listAncestorDirectories(appDir);

  if (packageManager.name === 'yarn') {
    return [appDirectory, ...parentDirectories];
  }

  for (const directory of parentDirectories) {
    if (await isWorkspaceRoot(directory)) {
      return [directory];
    }
  }

  return [appDirectory];
};

export const findOverridingConfigFiles = async ({
  appDir,
  packageManager,
  userConfigPaths,
  license,
  registry,
}: {
  appDir: string;
  packageManager: DetectedPackageManager;
  userConfigPaths: string[];
  license: string;
  registry: ConfiguredRegistry;
}): Promise<string[]> => {
  const usesYarnrcYml = readsYarnrcYml(packageManager);
  const fileName = usesYarnrcYml ? '.yarnrc.yml' : '.npmrc';
  const skippedPaths = new Set(userConfigPaths.map((filePath) => path.resolve(filePath)));
  const overridingFiles: string[] = [];

  for (const directory of await listProjectConfigDirectories(appDir, packageManager)) {
    const filePath = path.join(directory, fileName);

    if (skippedPaths.has(filePath)) {
      continue;
    }

    const content = await readFileIfExists(filePath);
    const token = usesYarnrcYml
      ? readYarnrcScopeToken(content)
      : parseNpmrc(content).get(registry.tokenKey);

    if (token !== undefined && token !== license && !isEnvironmentVariableReference(token)) {
      overridingFiles.push(filePath);
    }
  }

  return overridingFiles;
};

export interface RegistryAccess {
  outcome: RegistryAccessOutcome;
  /** Adds the setup when it is missing. Called once the registry has accepted the license. */
  apply: () => Promise<void>;
}

export const prepareRegistryAccess = async ({
  appDir,
  packageManager,
  license,
  licenseSource,
  logger,
  env = process.env,
  homeDir = os.homedir(),
}: {
  appDir: string;
  packageManager: DetectedPackageManager;
  license: string;
  licenseSource: ResolvedLicense['source'];
  logger: Logger;
  env?: NodeJS.ProcessEnv;
  homeDir?: string;
}): Promise<RegistryAccess> => {
  const registry = describeRegistry(getRegistryUrl(env));
  const usesYarnrcYml = readsYarnrcYml(packageManager);
  const userConfigPath = usesYarnrcYml
    ? getUserYarnrcPath(homeDir)
    : getUserNpmrcPath(env, homeDir);
  const referencesLicense = shouldReferenceLicense(licenseSource, env);
  const licenseReference = usesYarnrcYml ? YARNRC_LICENSE_REFERENCE : NPMRC_LICENSE_REFERENCE;
  const writtenToken = referencesLicense ? licenseReference : license;
  const outcome = usesYarnrcYml
    ? await inspectYarnrc(userConfigPath, license, registry, writtenToken)
    : await inspectNpmrc(userConfigPath, license, registry, writtenToken);
  const overridingFiles = await findOverridingConfigFiles({
    appDir,
    packageManager,
    userConfigPaths: [userConfigPath, path.join(homeDir, usesYarnrcYml ? '.yarnrc.yml' : '.npmrc')],
    license,
    registry,
  });

  assertRegistryAccessUsable({
    outcome,
    overridingFiles,
    registryHost: registry.host,
    userConfigPath,
  });

  if (outcome.status === 'already-configured') {
    logger.info(`Access to ${registry.host} is already configured in ${userConfigPath}.`);
  }

  if (outcome.status === 'uses-environment-variable') {
    logger.info(
      `${userConfigPath} reads the ${registry.host} token from an environment variable. Make sure it holds your Strapi license.`
    );
  }

  return {
    outcome,
    async apply() {
      if (outcome.status !== 'not-configured' || outcome.linesToAdd === undefined) {
        return;
      }

      await appendToFile(userConfigPath, outcome.linesToAdd);
      logger.success(
        referencesLicense
          ? `Configured access to ${registry.host} in ${userConfigPath}, reading the license from STRAPI_LICENSE.`
          : `Configured access to ${registry.host} in ${userConfigPath}.`
      );
    },
  };
};
