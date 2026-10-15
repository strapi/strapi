import path from 'node:path';
import fse from 'fs-extra';

import { EnterpriseInstallError, PackageManagerError, PromptCancelledError } from '../errors';
import { parsePackageArgument, reportInstallError, runInstall } from '../action';
import {
  createFetchResponse,
  createPackument,
  createRegistryFetch,
  createTemporaryDirectory,
  createTestLicense,
  createTestLogger,
  expectedSetupWarning,
  loggedText,
} from './test-helpers';

type InstallDependencies = Parameters<typeof runInstall>[0]['dependencies'];

const LICENSE = createTestLicense();
const AI_BYOK = '@strapi-enterprise/plugin-ai-byok';

const AI_BYOK_METADATA = { name: 'ai-byok', displayName: 'AI BYOK', kind: 'plugin' };

const aiByokPackument = createPackument(
  AI_BYOK,
  [
    { version: '1.1.0', strapiRange: '^5.52.0', strapi: AI_BYOK_METADATA },
    { version: '1.2.0', strapiRange: '^5.54.0', strapi: AI_BYOK_METADATA },
    { version: '1.3.0', strapiRange: '^5.56.0', strapi: AI_BYOK_METADATA },
    {
      version: '0.0.0-experimental.8be2653',
      strapiRange: '>=5.52.0 <6.0.0',
      strapi: AI_BYOK_METADATA,
    },
  ],
  { latest: '1.3.0' }
);

/** Stands in for the package manager: writes each installed plugin's package.json. */
const installLikeAPackageManager = async ({
  appDir,
  installSpecs,
}: {
  appDir: string;
  installSpecs: string[];
}) => {
  for (const installSpec of installSpecs) {
    const packageName = installSpec.slice(0, installSpec.lastIndexOf('@'));
    const packageDirectory = path.join(appDir, 'node_modules', packageName);

    await fse.outputJson(path.join(packageDirectory, 'package.json'), {
      version: installSpec.slice(installSpec.lastIndexOf('@') + 1),
      homepage: 'https://docs.strapi.io/cms/plugins/ai-byok',
      strapi: AI_BYOK_METADATA,
    });
  }
};

const createApp = async ({
  strapiVersion = '5.54.1',
  installedPackages = {},
}: { strapiVersion?: string; installedPackages?: Record<string, string> } = {}) => {
  const appDir = await createTemporaryDirectory();
  await fse.writeJson(path.join(appDir, 'package.json'), {
    packageManager: 'npm@10.9.0',
    dependencies: installedPackages,
  });
  await fse.outputJson(path.join(appDir, 'node_modules', '@strapi', 'strapi', 'package.json'), {
    version: strapiVersion,
  });

  for (const [packageName, version] of Object.entries(installedPackages)) {
    await fse.outputJson(path.join(appDir, 'node_modules', packageName, 'package.json'), {
      version,
    });
  }

  return appDir;
};

const createDependencies = async (
  overrides: Partial<InstallDependencies> = {}
): Promise<jest.Mocked<InstallDependencies>> =>
  ({
    isInteractive: false,
    env: { STRAPI_LICENSE: LICENSE },
    homeDir: await createTemporaryDirectory(),
    now: new Date('2026-09-28T12:00:00.000Z'),
    fetchImplementation: createRegistryFetch({
      searchResult: [AI_BYOK],
      packuments: { [AI_BYOK]: aiByokPackument },
    }),
    promptForLicense: jest.fn(),
    promptForPlugins: jest.fn(),
    installPackages: jest.fn(installLikeAPackageManager),
    ...overrides,
  }) as jest.Mocked<InstallDependencies>;

describe('runInstall with package names', () => {
  it('installs the newest version that fits the app, then prints the configuration to add', async () => {
    const appDir = await createApp();
    const dependencies = await createDependencies();
    const logger = createTestLogger();

    await runInstall({
      appDir,
      packageArguments: ['plugin-ai-byok'],
      logger,
      dependencies,
    });

    expect(dependencies.installPackages).toHaveBeenCalledWith({
      appDir,
      packageManager: { name: 'npm', majorVersion: 10 },
      installSpecs: [`${AI_BYOK}@1.2.0`],
    });
    expect(await fse.readFile(path.join(dependencies.homeDir, '.npmrc'), 'utf8')).toContain(
      `//packages.strapi.io/:_authToken=${LICENSE}`
    );
    expect(logger.info).toHaveBeenCalledWith(
      `${AI_BYOK}: 1.3.0 is available but requires Strapi ^5.56.0.`
    );
    expect(logger.info).toHaveBeenCalledWith(`Running npm install --save-exact ${AI_BYOK}@1.2.0`);
    expect(logger.warn).toHaveBeenCalledWith(expectedSetupWarning(AI_BYOK));
    expect(loggedText(logger)).not.toContain(LICENSE);
  });

  it.each([
    ['a version that does not exist', '9.9.9'],
    ['an alias to another package', 'npm:left-pad'],
    ['a URL', 'https://example.com/plugin.tgz'],
  ])('stops before writing anything for %s', async (_case, requestedVersion) => {
    const dependencies = await createDependencies();

    await expect(
      runInstall({
        appDir: await createApp(),
        packageArguments: [`plugin-ai-byok@${requestedVersion}`],
        logger: createTestLogger(),
        dependencies,
      })
    ).rejects.toThrow(`${AI_BYOK} has no version or tag ${requestedVersion}.`);
    expect(dependencies.installPackages).not.toHaveBeenCalled();
    expect(await fse.pathExists(path.join(dependencies.homeDir, '.npmrc'))).toBe(false);
  });

  it('installs the highest version in a range that fits the app', async () => {
    const dependencies = await createDependencies();
    const logger = createTestLogger();

    await runInstall({
      appDir: await createApp({ strapiVersion: '5.54.1' }),
      packageArguments: ['plugin-ai-byok@^1.1.0'],
      logger,
      dependencies,
    });

    expect(dependencies.installPackages).toHaveBeenCalledWith(
      expect.objectContaining({ installSpecs: [`${AI_BYOK}@1.2.0`] })
    );
    expect(logger.warn).not.toHaveBeenCalledWith(expect.stringContaining('requires Strapi'));
  });

  it('warns when no version in the range fits the app, and installs the highest one', async () => {
    const dependencies = await createDependencies();
    const logger = createTestLogger();

    await runInstall({
      appDir: await createApp({ strapiVersion: '5.54.1' }),
      packageArguments: ['plugin-ai-byok@^1.3.0'],
      logger,
      dependencies,
    });

    expect(logger.warn).toHaveBeenCalledWith(
      `${AI_BYOK} 1.3.0 requires Strapi ^5.56.0 and this app uses 5.54.1. Strapi may not start until you upgrade it.`
    );
    expect(dependencies.installPackages).toHaveBeenCalledWith(
      expect.objectContaining({ installSpecs: [`${AI_BYOK}@1.3.0`] })
    );
  });

  it('installs the exact version a tag points to', async () => {
    const dependencies = await createDependencies({
      fetchImplementation: createRegistryFetch({
        searchResult: [AI_BYOK],
        packuments: {
          [AI_BYOK]: {
            ...aiByokPackument,
            'dist-tags': { latest: '1.2.0', experimental: '0.0.0-experimental.8be2653' },
          },
        },
      }),
    });

    await runInstall({
      appDir: await createApp(),
      packageArguments: ['plugin-ai-byok@experimental'],
      logger: createTestLogger(),
      dependencies,
    });

    expect(dependencies.installPackages).toHaveBeenCalledWith(
      expect.objectContaining({ installSpecs: [`${AI_BYOK}@0.0.0-experimental.8be2653`] })
    );
  });

  it('installs an explicit version, prereleases included', async () => {
    const dependencies = await createDependencies();

    await runInstall({
      appDir: await createApp(),
      packageArguments: [`${AI_BYOK}@0.0.0-experimental.8be2653`],
      logger: createTestLogger(),
      dependencies,
    });

    expect(dependencies.installPackages).toHaveBeenCalledWith(
      expect.objectContaining({ installSpecs: [`${AI_BYOK}@0.0.0-experimental.8be2653`] })
    );
  });

  it('warns before a named install makes a major upgrade', async () => {
    const dependencies = await createDependencies();
    const logger = createTestLogger();

    await runInstall({
      appDir: await createApp({ installedPackages: { [AI_BYOK]: '0.9.0' } }),
      packageArguments: ['plugin-ai-byok'],
      logger,
      dependencies,
    });

    expect(logger.warn).toHaveBeenCalledWith(
      `${AI_BYOK}: upgrading from 0.9.0 to 1.2.0, a major upgrade that may include breaking changes.`
    );
    // Already set up: points to what changed, not to the setup guide.
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/^Updated .+\. See what changed at /)
    );
    expect(logger.warn).not.toHaveBeenCalledWith(expectedSetupWarning(AI_BYOK));
    expect(dependencies.installPackages).toHaveBeenCalledWith(
      expect.objectContaining({ installSpecs: [`${AI_BYOK}@1.2.0`] })
    );
  });

  it('says so when a named install replaces an installed prerelease', async () => {
    const dependencies = await createDependencies();
    const logger = createTestLogger();

    await runInstall({
      appDir: await createApp({ installedPackages: { [AI_BYOK]: '0.0.0-experimental.8be2653' } }),
      packageArguments: ['plugin-ai-byok'],
      logger,
      dependencies,
    });

    expect(logger.info).toHaveBeenCalledWith(
      `${AI_BYOK}: replacing the installed prerelease 0.0.0-experimental.8be2653 with the stable release 1.2.0.`
    );
    expect(dependencies.installPackages).toHaveBeenCalledWith(
      expect.objectContaining({ installSpecs: [`${AI_BYOK}@1.2.0`] })
    );
  });

  it.each([
    ['an exact version', '0.0.0-experimental.8be2653'],
    ['a tag pointing to it', 'experimental'],
  ])('installs nothing when %s is already installed', async (_case, requestedVersion) => {
    const dependencies = await createDependencies({
      fetchImplementation: createRegistryFetch({
        searchResult: [AI_BYOK],
        packuments: {
          [AI_BYOK]: {
            ...aiByokPackument,
            'dist-tags': { latest: '1.2.0', experimental: '0.0.0-experimental.8be2653' },
          },
        },
      }),
    });
    const logger = createTestLogger();

    await runInstall({
      appDir: await createApp({ installedPackages: { [AI_BYOK]: '0.0.0-experimental.8be2653' } }),
      packageArguments: [`${AI_BYOK}@${requestedVersion}`],
      logger,
      dependencies,
    });

    expect(dependencies.installPackages).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      `${AI_BYOK} 0.0.0-experimental.8be2653 is already installed.`
    );
  });

  it('installs a named version that differs from the installed one', async () => {
    const dependencies = await createDependencies();

    await runInstall({
      appDir: await createApp({ installedPackages: { [AI_BYOK]: '1.1.0' } }),
      packageArguments: [`${AI_BYOK}@0.0.0-experimental.8be2653`],
      logger: createTestLogger(),
      dependencies,
    });

    expect(dependencies.installPackages).toHaveBeenCalledWith(
      expect.objectContaining({ installSpecs: [`${AI_BYOK}@0.0.0-experimental.8be2653`] })
    );
  });

  it('installs nothing when the plugin is already up to date', async () => {
    const dependencies = await createDependencies();
    const logger = createTestLogger();

    await runInstall({
      appDir: await createApp({ installedPackages: { [AI_BYOK]: '1.2.0' } }),
      packageArguments: ['plugin-ai-byok'],
      logger,
      dependencies,
    });

    expect(dependencies.installPackages).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      `${AI_BYOK} 1.2.0 is already installed and up to date.`
    );
  });

  it.each([
    [403, `Your license does not include ${AI_BYOK}, or it does not exist.`],
    [404, `No Enterprise package named ${AI_BYOK}.`],
    [401, 'https://packages.strapi.io rejected this Strapi license.'],
  ])('stops without installing when the registry answers %s', async (status, message) => {
    const dependencies = await createDependencies({
      fetchImplementation: jest.fn().mockResolvedValue(createFetchResponse(status)),
    });

    await expect(
      runInstall({
        appDir: await createApp(),
        packageArguments: ['plugin-ai-byok'],
        logger: createTestLogger(),
        dependencies,
      })
    ).rejects.toThrow(message);
    expect(dependencies.installPackages).not.toHaveBeenCalled();
    // The license was not accepted, so it is not saved for later runs.
    expect(await fse.pathExists(path.join(dependencies.homeDir, '.npmrc'))).toBe(false);
  });

  it('stops before any request when ~/.npmrc holds another license, and leaves it as is', async () => {
    const dependencies = await createDependencies();
    const npmrcPath = path.join(dependencies.homeDir, '.npmrc');
    const otherLicenseLines =
      '@strapi-enterprise:registry=https://packages.strapi.io/\n//packages.strapi.io/:_authToken=other-license\n';
    await fse.writeFile(npmrcPath, otherLicenseLines);

    await expect(
      runInstall({
        appDir: await createApp(),
        packageArguments: ['plugin-ai-byok'],
        logger: createTestLogger(),
        dependencies,
      })
    ).rejects.toThrow('already sets up packages.strapi.io with another license');
    expect(dependencies.fetchImplementation).not.toHaveBeenCalled();
    expect(dependencies.installPackages).not.toHaveBeenCalled();
    expect(await fse.readFile(npmrcPath, 'utf8')).toBe(otherLicenseLines);
  });

  it('writes the license itself in CI when it comes from .env, which later steps do not load', async () => {
    const dependencies = await createDependencies({ env: { STRAPI_LICENSE: LICENSE, CI: 'true' } });
    const appDir = await createApp();
    await fse.writeFile(path.join(appDir, '.env'), `STRAPI_LICENSE=${LICENSE}\n`);

    await runInstall({
      appDir,
      packageArguments: ['plugin-ai-byok'],
      logger: createTestLogger(),
      dependencies,
    });

    const npmrc = await fse.readFile(path.join(dependencies.homeDir, '.npmrc'), 'utf8');
    expect(npmrc).toContain(`//packages.strapi.io/:_authToken=${LICENSE}`);
    // eslint-disable-next-line no-template-curly-in-string
    expect(npmrc).not.toContain('${STRAPI_LICENSE}');
  });

  it('writes a reference in CI when STRAPI_LICENSE is set in the environment', async () => {
    const dependencies = await createDependencies({ env: { STRAPI_LICENSE: LICENSE, CI: 'true' } });

    await runInstall({
      appDir: await createApp(),
      packageArguments: ['plugin-ai-byok'],
      logger: createTestLogger(),
      dependencies,
    });

    expect(await fse.readFile(path.join(dependencies.homeDir, '.npmrc'), 'utf8')).toContain(
      // eslint-disable-next-line no-template-curly-in-string
      '//packages.strapi.io/:_authToken=${STRAPI_LICENSE}'
    );
  });

  it('drops the newer-version note when that version is already installed', async () => {
    const logger = createTestLogger();

    await runInstall({
      appDir: await createApp({ installedPackages: { [AI_BYOK]: '1.3.0' } }),
      packageArguments: ['plugin-ai-byok'],
      logger,
      dependencies: await createDependencies(),
    });

    expect(logger.info).not.toHaveBeenCalledWith(
      `${AI_BYOK}: 1.3.0 is available but requires Strapi ^5.56.0.`
    );
    expect(logger.info).toHaveBeenCalledWith(
      `${AI_BYOK} 1.3.0 is already installed and up to date.`
    );
  });

  it('installs a plugin whose only copy is hoisted for another app of the monorepo', async () => {
    const rootDir = await createTemporaryDirectory();
    const appDir = path.join(rootDir, 'apps', 'my-app');
    await fse.outputJson(path.join(appDir, 'package.json'), { packageManager: 'npm@10.9.0' });
    await fse.outputJson(path.join(rootDir, 'node_modules', '@strapi', 'strapi', 'package.json'), {
      version: '5.54.1',
    });
    // A sibling app depends on 1.2.0, so it sits in the root node_modules.
    await fse.outputJson(path.join(rootDir, 'node_modules', AI_BYOK, 'package.json'), {
      version: '1.2.0',
    });
    const dependencies = await createDependencies();
    const logger = createTestLogger();

    await runInstall({ appDir, packageArguments: ['plugin-ai-byok'], logger, dependencies });

    expect(logger.info).not.toHaveBeenCalledWith(
      `${AI_BYOK} 1.2.0 is already installed and up to date.`
    );
    expect(dependencies.installPackages).toHaveBeenCalledWith(
      expect.objectContaining({ installSpecs: [`${AI_BYOK}@1.2.0`] })
    );
  });

  it('writes nothing to ~/.npmrc when there is nothing to install', async () => {
    const dependencies = await createDependencies();

    await runInstall({
      appDir: await createApp({ installedPackages: { [AI_BYOK]: '1.2.0' } }),
      packageArguments: ['plugin-ai-byok'],
      logger: createTestLogger(),
      dependencies,
    });

    expect(dependencies.installPackages).not.toHaveBeenCalled();
    expect(await fse.pathExists(path.join(dependencies.homeDir, '.npmrc'))).toBe(false);
  });

  it('stops when no version fits the app Strapi version', async () => {
    await expect(
      runInstall({
        appDir: await createApp({ strapiVersion: '5.50.0' }),
        packageArguments: ['plugin-ai-byok'],
        logger: createTestLogger(),
        dependencies: await createDependencies(),
      })
    ).rejects.toThrow(
      `${AI_BYOK} requires Strapi ^5.56.0 and this app uses 5.50.0. Upgrade Strapi first.`
    );
  });
});

describe('runInstall with the checklist', () => {
  it('asks which plugins to install, then installs the selection', async () => {
    const dependencies = await createDependencies({
      isInteractive: true,
      promptForPlugins: jest.fn().mockResolvedValue([`${AI_BYOK}@1.2.0`]),
    });

    await runInstall({
      appDir: await createApp({ installedPackages: { [AI_BYOK]: '1.1.0' } }),
      packageArguments: [],
      logger: createTestLogger(),
      dependencies,
    });

    expect(dependencies.promptForPlugins).toHaveBeenCalledWith([
      expect.objectContaining({
        state: 'upgrade',
        installedVersion: '1.1.0',
        targetVersion: '1.2.0',
      }),
    ]);
    expect(dependencies.installPackages).toHaveBeenCalledWith(
      expect.objectContaining({ installSpecs: [`${AI_BYOK}@1.2.0`] })
    );
  });

  it('offers a plugin this CLI does not know, found through the registry search', async () => {
    const newPlugin = '@strapi-enterprise/plugin-new';
    const dependencies = await createDependencies({
      isInteractive: true,
      fetchImplementation: createRegistryFetch({
        searchResult: [AI_BYOK, newPlugin],
        packuments: {
          [AI_BYOK]: aiByokPackument,
          [newPlugin]: createPackument(
            newPlugin,
            [
              {
                version: '2.0.0',
                strapiRange: '^5.0.0',
                strapi: { name: 'new', displayName: 'New plugin', kind: 'plugin' },
              },
            ],
            { latest: '2.0.0' }
          ),
        },
      }),
      promptForPlugins: jest.fn().mockResolvedValue([]),
    });

    await runInstall({
      appDir: await createApp(),
      packageArguments: [],
      logger: createTestLogger(),
      dependencies,
    });

    expect(dependencies.promptForPlugins).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          state: 'install',
          targetVersion: '2.0.0',
          entry: expect.objectContaining({ packageName: newPlugin, displayName: 'New plugin' }),
        }),
      ])
    );
  });

  it('says so when the license includes no Enterprise plugin', async () => {
    const dependencies = await createDependencies({
      isInteractive: true,
      fetchImplementation: createRegistryFetch({
        searchResult: [],
        packuments: { [AI_BYOK]: 403 },
      }),
    });

    await expect(
      runInstall({
        appDir: await createApp(),
        packageArguments: [],
        logger: createTestLogger(),
        dependencies,
      })
    ).rejects.toThrow('Your license does not include any Enterprise plugins.');
    expect(dependencies.promptForPlugins).not.toHaveBeenCalled();
  });

  it('asks nothing when everything is up to date', async () => {
    const dependencies = await createDependencies({ isInteractive: true });
    const logger = createTestLogger();

    await runInstall({
      appDir: await createApp({ installedPackages: { [AI_BYOK]: '1.2.0' } }),
      packageArguments: [],
      logger,
      dependencies,
    });

    expect(dependencies.promptForPlugins).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      'The Enterprise plugins in your license are installed and up to date.'
    );
  });

  it('says why nothing can be installed when only a prerelease is published', async () => {
    const dependencies = await createDependencies({
      isInteractive: true,
      fetchImplementation: createRegistryFetch({
        searchResult: [AI_BYOK],
        packuments: {
          [AI_BYOK]: createPackument(
            AI_BYOK,
            [
              {
                version: '0.0.0-experimental.658048e',
                strapiRange: '>=5.52.0 <6.0.0',
                strapi: AI_BYOK_METADATA,
              },
            ],
            { latest: '0.0.0-experimental.658048e' }
          ),
        },
      }),
    });
    const logger = createTestLogger();

    await runInstall({ appDir: await createApp(), packageArguments: [], logger, dependencies });

    expect(dependencies.promptForPlugins).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      `${AI_BYOK} has no stable release yet. To install a prerelease, name its version: ${AI_BYOK}@<version>.`
    );
    expect(logger.info).not.toHaveBeenCalledWith(
      'The Enterprise plugins in your license are installed and up to date.'
    );
  });

  it('says why nothing can be installed when no version fits the app', async () => {
    const dependencies = await createDependencies({ isInteractive: true });
    const logger = createTestLogger();

    await runInstall({
      appDir: await createApp({ strapiVersion: '5.50.0' }),
      packageArguments: [],
      logger,
      dependencies,
    });

    expect(logger.info).toHaveBeenCalledWith(
      `${AI_BYOK} requires Strapi ^5.56.0 and this app uses 5.50.0. Upgrade Strapi first.`
    );
    expect(logger.info).not.toHaveBeenCalledWith(
      'The Enterprise plugins in your license are installed and up to date.'
    );
  });

  it('fails before any request when there is no terminal and no package name', async () => {
    const dependencies = await createDependencies();

    await expect(
      runInstall({
        appDir: await createApp(),
        packageArguments: [],
        logger: createTestLogger(),
        dependencies,
      })
    ).rejects.toThrow('Pass package names, or run the command in an interactive terminal.');
    expect(dependencies.fetchImplementation).not.toHaveBeenCalled();
  });
});

describe('runInstall checks that need no license', () => {
  it('rejects a package outside the Enterprise scope before asking for a license', async () => {
    const appDir = await createApp();
    const dependencies = await createDependencies({
      isInteractive: true,
      env: {},
      promptForLicense: jest.fn().mockResolvedValue(LICENSE),
    });

    await expect(
      runInstall({
        appDir,
        packageArguments: ['@strapi/foo'],
        logger: createTestLogger(),
        dependencies,
      })
    ).rejects.toThrow('@strapi/foo is not an Enterprise package.');
    expect(dependencies.promptForLicense).not.toHaveBeenCalled();
    expect(await fse.pathExists(path.join(appDir, 'license.txt'))).toBe(false);
    expect(await fse.pathExists(path.join(appDir, '.gitignore'))).toBe(false);
    expect(await fse.pathExists(path.join(dependencies.homeDir, '.npmrc'))).toBe(false);
  });
});

describe('parsePackageArgument', () => {
  it.each([
    ['plugin-ai-byok', { packageName: AI_BYOK }],
    [AI_BYOK, { packageName: AI_BYOK }],
    ['plugin-ai-byok@1.2.0', { packageName: AI_BYOK, requestedVersion: '1.2.0' }],
    [`${AI_BYOK}@experimental`, { packageName: AI_BYOK, requestedVersion: 'experimental' }],
  ])('reads %s', (packageArgument, expected) => {
    expect(parsePackageArgument(packageArgument)).toEqual(expected);
  });

  it('accepts a name of exactly 214 characters, the npm limit', () => {
    const packageName = `@strapi-enterprise/${'a'.repeat(195)}`;

    expect(parsePackageArgument(packageName)).toEqual({ packageName });
  });

  it('rejects a package outside the Enterprise scope', () => {
    expect(() => parsePackageArgument('@other/plugin')).toThrow(
      '@other/plugin is not an Enterprise package. Enterprise packages start with @strapi-enterprise/.'
    );
  });

  it.each([
    '@strapi-enterprise/../x',
    'plugin-ai-byok/../../x',
    '@strapi-enterprise/Plugin-AI-BYOK',
    '@strapi-enterprise/.hidden',
    `@strapi-enterprise/${'a'.repeat(196)}`,
  ])('rejects %s, which is not a valid package name', (packageArgument) => {
    expect(() => parsePackageArgument(packageArgument)).toThrow(
      `${packageArgument} is not a valid package name.`
    );
  });
});

describe('reportInstallError', () => {
  it('keeps the package manager exit code without logging, since it printed its own output', () => {
    const logger = createTestLogger();

    expect(reportInstallError(new PackageManagerError(2), logger)).toBe(2);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('exits with 130 and logs nothing when the prompt is cancelled with Ctrl+C', () => {
    const logger = createTestLogger();

    expect(reportInstallError(new PromptCancelledError(), logger)).toBe(130);
    expect(logger.error).not.toHaveBeenCalled();
  });

  it('logs an EnterpriseInstallError as is, and exits with 1', () => {
    const logger = createTestLogger();

    expect(reportInstallError(new EnterpriseInstallError('Something to fix.'), logger)).toBe(1);
    expect(logger.error).toHaveBeenCalledWith('Something to fix.');
  });

  it('logs any other error in one line, without its stack, and exits with 1', () => {
    const logger = createTestLogger();

    expect(reportInstallError(new TypeError('Cannot read properties of undefined'), logger)).toBe(
      1
    );
    expect(logger.error).toHaveBeenCalledWith(
      'strapi enterprise install failed: Cannot read properties of undefined'
    );
  });

  it('does not treat another error with an exit code as a package manager failure', () => {
    const logger = createTestLogger();
    const execaError = Object.assign(new Error('Command failed: yarn --version'), { exitCode: 1 });

    expect(reportInstallError(execaError, logger)).toBe(1);
    expect(logger.error).toHaveBeenCalledWith(
      'strapi enterprise install failed: Command failed: yarn --version'
    );
  });
});
