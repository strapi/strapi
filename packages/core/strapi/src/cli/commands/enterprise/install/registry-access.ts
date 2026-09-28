import os from 'os';
import path from 'path';
import fse from 'fs-extra';

import type { Logger } from '../../../utils/logger';
import { ENTERPRISE_REGISTRY_URL, ENTERPRISE_SCOPE } from './constants';
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

/**
 * Whether the user-level file should reference STRAPI_LICENSE instead of holding the license: when
 * the license came from that variable in CI, where the machine is set up for the job and the
 * variable is set for every step. On a developer's machine another project's package manager could
 * read the same file without the variable, so the license is written as is there.
 */
const shouldReferenceLicense = (
  licenseSource: ResolvedLicense['source'],
  env: NodeJS.ProcessEnv
): boolean => licenseSource === 'environment' && Boolean(env.CI) && env.CI !== 'false';

export type RegistryAccessStatus =
  | 'written'
  | 'already-configured'
  | 'uses-environment-variable'
  | 'different-license'
  | 'manual-edit-needed';

export interface RegistryAccessOutcome {
  status: RegistryAccessStatus;
  filePath: string;
  /** The configuration the file should contain, with a placeholder instead of the license. */
  expectedConfiguration: string;
}

/** The registry the configuration points to: the Strapi one, unless STRAPI_ENTERPRISE_REGISTRY_URL is set. */
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

/** Adds text at the end of a file, keeping its content. New files are readable by the owner only. */
const appendToFile = async (filePath: string, existingContent: string, text: string) => {
  const separator = existingContent.length > 0 && !existingContent.endsWith('\n') ? '\n' : '';

  await fse.ensureDir(path.dirname(filePath));
  await fse.writeFile(filePath, `${existingContent}${separator}${text}\n`, { mode: 0o600 });
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

export const configureNpmrc = async (
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
    await appendToFile(filePath, content, buildNpmrcConfiguration(writtenToken, registry));
    return outcome('written');
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

/** The `npmAuthToken` set under the `strapi-enterprise` scope of a `.yarnrc.yml`, if any. */
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

/**
 * `.yarnrc.yml` is edited only when it has no `npmScopes` key yet. Merging into an existing
 * `npmScopes` needs a YAML-aware edit, so the expected block is printed instead.
 */
export const configureYarnrc = async (
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
    await appendToFile(filePath, content, buildYarnrcConfiguration(writtenToken, registry));
    return outcome('written');
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

const reportOutcome = (
  { status, filePath, expectedConfiguration }: RegistryAccessOutcome,
  { registryHost, referencesLicense }: { registryHost: string; referencesLicense: boolean },
  logger: Logger
) => {
  switch (status) {
    case 'written':
      logger.success(
        referencesLicense
          ? `Configured access to ${registryHost} in ${filePath}, reading the license from STRAPI_LICENSE.`
          : `Configured access to ${registryHost} in ${filePath}.`
      );
      break;
    case 'already-configured':
      logger.info(`Access to ${registryHost} is already configured in ${filePath}.`);
      break;
    case 'uses-environment-variable':
      logger.info(
        `${filePath} reads the ${registryHost} token from an environment variable. Make sure it holds your Strapi license.`
      );
      break;
    case 'different-license':
      logger.warn(
        `${filePath} already configures ${registryHost} with a different license, so it was not changed. Installing will fail until it contains:\n\n${expectedConfiguration}\n`
      );
      break;
    case 'manual-edit-needed':
      logger.warn(
        `${filePath} could not be updated automatically. Add this to it to access ${registryHost}:\n\n${expectedConfiguration}\n`
      );
      break;
    default:
      break;
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

/**
 * The folders where the package manager reads a project-level file. Yarn, 1 and 2+ alike, reads
 * one in every parent folder. npm and pnpm read only the one at the root of the workspace when the
 * app is in one, and ignore the app's own, otherwise the one in the app folder.
 */
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

/**
 * Project-level files that set this registry's token to something other than the license. The
 * package manager reads them before the user-level file, so the install would fail although the
 * lookups, which send the license themselves, succeeded. They may be committed, so they are only
 * reported, never edited. A token read from an environment variable is left to the user.
 */
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

export const configureRegistryAccess = async ({
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
}): Promise<RegistryAccessOutcome & { overridingFiles: string[] }> => {
  const registry = describeRegistry(getRegistryUrl(env));
  const usesYarnrcYml = readsYarnrcYml(packageManager);
  const userConfigPath = usesYarnrcYml
    ? getUserYarnrcPath(homeDir)
    : getUserNpmrcPath(env, homeDir);
  const referencesLicense = shouldReferenceLicense(licenseSource, env);
  const licenseReference = usesYarnrcYml ? YARNRC_LICENSE_REFERENCE : NPMRC_LICENSE_REFERENCE;
  const writtenToken = referencesLicense ? licenseReference : license;
  const outcome = usesYarnrcYml
    ? await configureYarnrc(userConfigPath, license, registry, writtenToken)
    : await configureNpmrc(userConfigPath, license, registry, writtenToken);

  reportOutcome(outcome, { registryHost: registry.host, referencesLicense }, logger);

  const overridingFiles = await findOverridingConfigFiles({
    appDir,
    packageManager,
    userConfigPaths: [userConfigPath, path.join(homeDir, usesYarnrcYml ? '.yarnrc.yml' : '.npmrc')],
    license,
    registry,
  });

  overridingFiles.forEach((filePath) =>
    logger.warn(
      `${filePath} sets another license for ${registry.host} and takes precedence over ${userConfigPath}. Update or remove that line, or installing can fail with a 401 or 403.`
    )
  );

  return { ...outcome, overridingFiles };
};
