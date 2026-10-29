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
  NOT_LICENSED_MESSAGE,
  readFilePermissions,
} from './test-helpers';

type InstallDependencies = Parameters<typeof runInstall>[0]['dependencies'];

const LICENSE = createTestLicense();
const AI_BYOK = '@strapi-enterprise/plugin-ai-byok';

const LOCKED_PLUGIN = '@strapi-enterprise/plugin-locked';

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
  packageManager = 'npm@10.9.0',
}: {
  strapiVersion?: string;
  installedPackages?: Record<string, string>;
  packageManager?: string;
} = {}) => {
  const appDir = await createTemporaryDirectory();
  await fse.writeJson(path.join(appDir, 'package.json'), {
    packageManager,
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
    fetchImplementation: createRegistryFetch({
      packuments: { [AI_BYOK]: aiByokPackument },
      catalog: { plugins: [{ name: AI_BYOK, licensed: true }] },
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

  it('says the license does not include a plugin the catalog lists, with the server message', async () => {
    const dependencies = await createDependencies({
      fetchImplementation: createRegistryFetch({
        packuments: { [LOCKED_PLUGIN]: 403 },
        catalog: {
          plugins: [{ name: LOCKED_PLUGIN, licensed: false }],
          notLicensedMessage: NOT_LICENSED_MESSAGE,
        },
      }),
    });

    await expect(
      runInstall({
        appDir: await createApp(),
        packageArguments: ['plugin-locked'],
        logger: createTestLogger(),
        dependencies,
      })
    ).rejects.toThrow(new EnterpriseInstallError(`${LOCKED_PLUGIN}: ${NOT_LICENSED_MESSAGE}`));
    expect(dependencies.installPackages).not.toHaveBeenCalled();
  });

  it('says the license does not include a plugin the catalog lists, when the server sends no message', async () => {
    await expect(
      runInstall({
        appDir: await createApp(),
        packageArguments: ['plugin-locked'],
        logger: createTestLogger(),
        dependencies: await createDependencies({
          fetchImplementation: createRegistryFetch({
            packuments: { [LOCKED_PLUGIN]: 403 },
            catalog: { plugins: [{ name: LOCKED_PLUGIN, licensed: false }] },
          }),
        }),
      })
    ).rejects.toThrow(
      new EnterpriseInstallError(
        `Your license does not include ${LOCKED_PLUGIN}. Run strapi enterprise install without a name to see the plugins you can install.`
      )
    );
  });

  it('asks the catalog once, on the first plugin outside the license', async () => {
    const dependencies = await createDependencies({
      fetchImplementation: createRegistryFetch({
        packuments: { [LOCKED_PLUGIN]: 403, [AI_BYOK]: 403 },
        catalog: {
          plugins: [
            { name: LOCKED_PLUGIN, licensed: false },
            { name: AI_BYOK, licensed: false },
          ],
          notLicensedMessage: NOT_LICENSED_MESSAGE,
        },
      }),
    });

    await expect(
      runInstall({
        appDir: await createApp(),
        packageArguments: ['plugin-locked', 'plugin-ai-byok'],
        logger: createTestLogger(),
        dependencies,
      })
    ).rejects.toThrow(`${LOCKED_PLUGIN}: ${NOT_LICENSED_MESSAGE}`);
    expect(
      (dependencies.fetchImplementation as jest.Mock).mock.calls.filter(([input]) =>
        String(input).endsWith('/-/strapi/plugins')
      )
    ).toHaveLength(1);
  });

  it('does not ask the catalog when every named plugin is in the license', async () => {
    const dependencies = await createDependencies();

    await runInstall({
      appDir: await createApp(),
      packageArguments: ['plugin-ai-byok'],
      logger: createTestLogger(),
      dependencies,
    });

    expect(
      (dependencies.fetchImplementation as jest.Mock).mock.calls.map(([input]) => String(input))
    ).toEqual([`https://packages.strapi.io/${AI_BYOK}`]);
  });

  it('keeps the general message when the catalog does not list the plugin', async () => {
    await expect(
      runInstall({
        appDir: await createApp(),
        packageArguments: ['plugin-locked'],
        logger: createTestLogger(),
        dependencies: await createDependencies({
          fetchImplementation: createRegistryFetch({
            packuments: { [LOCKED_PLUGIN]: 403 },
            catalog: { plugins: [] },
          }),
        }),
      })
    ).rejects.toThrow(`Your license does not include ${LOCKED_PLUGIN}, or it does not exist.`);
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

    expect(dependencies.promptForPlugins).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          state: 'upgrade',
          installedVersion: '1.1.0',
          targetVersion: '1.2.0',
        }),
      ],
      undefined
    );
    expect(dependencies.installPackages).toHaveBeenCalledWith(
      expect.objectContaining({ installSpecs: [`${AI_BYOK}@1.2.0`] })
    );
  });

  it('offers a plugin this CLI does not know, found in the catalog', async () => {
    const newPlugin = '@strapi-enterprise/plugin-new';
    const dependencies = await createDependencies({
      isInteractive: true,
      fetchImplementation: createRegistryFetch({
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
        catalog: {
          plugins: [
            { name: AI_BYOK, licensed: true },
            { name: newPlugin, licensed: true },
          ],
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
      ]),
      undefined
    );
  });

  it('says so when the license includes no Enterprise plugin', async () => {
    const dependencies = await createDependencies({
      isInteractive: true,
      fetchImplementation: createRegistryFetch({
        packuments: {},
        catalog: { plugins: [] },
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

  it('shows the plugins outside the license as locked, and installs only the selection', async () => {
    const dependencies = await createDependencies({
      isInteractive: true,
      fetchImplementation: createRegistryFetch({
        packuments: { [AI_BYOK]: aiByokPackument, [LOCKED_PLUGIN]: 403 },
        catalog: {
          plugins: [
            { name: AI_BYOK, licensed: true },
            { name: LOCKED_PLUGIN, displayName: 'Locked', licensed: false },
          ],
          notLicensedMessage: NOT_LICENSED_MESSAGE,
        },
      }),
      promptForPlugins: jest.fn().mockResolvedValue([`${AI_BYOK}@1.2.0`]),
    });

    await runInstall({
      appDir: await createApp(),
      packageArguments: [],
      logger: createTestLogger(),
      dependencies,
    });

    expect(dependencies.promptForPlugins).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          state: 'install',
          entry: expect.objectContaining({ packageName: AI_BYOK }),
        }),
        {
          entry: expect.objectContaining({ packageName: LOCKED_PLUGIN, displayName: 'Locked' }),
          state: 'locked',
        },
      ],
      NOT_LICENSED_MESSAGE
    );
    expect(dependencies.installPackages).toHaveBeenCalledWith(
      expect.objectContaining({ installSpecs: [`${AI_BYOK}@1.2.0`] })
    );
  });

  it('warns with the server message when an installed plugin is outside the license', async () => {
    const appDir = await createApp({ installedPackages: { [LOCKED_PLUGIN]: '1.0.0' } });
    await fse.outputJson(path.join(appDir, 'node_modules', LOCKED_PLUGIN, 'package.json'), {
      version: '1.0.0',
      strapi: { kind: 'plugin' },
    });
    const logger = createTestLogger();

    await runInstall({
      appDir,
      packageArguments: [],
      logger,
      dependencies: await createDependencies({
        isInteractive: true,
        fetchImplementation: createRegistryFetch({
          packuments: { [LOCKED_PLUGIN]: 403 },
          catalog: {
            plugins: [{ name: LOCKED_PLUGIN, licensed: false }],
            notLicensedMessage: NOT_LICENSED_MESSAGE,
          },
        }),
      }),
    });

    expect(logger.warn).toHaveBeenCalledWith(
      `${LOCKED_PLUGIN} (installed): ${NOT_LICENSED_MESSAGE}`
    );
  });

  it('keeps the general warning when the catalog does not list the installed plugin', async () => {
    const appDir = await createApp({ installedPackages: { [LOCKED_PLUGIN]: '1.0.0' } });
    await fse.outputJson(path.join(appDir, 'node_modules', LOCKED_PLUGIN, 'package.json'), {
      version: '1.0.0',
      strapi: { kind: 'plugin' },
    });
    const logger = createTestLogger();

    await runInstall({
      appDir,
      packageArguments: [],
      logger,
      dependencies: await createDependencies({
        isInteractive: true,
        fetchImplementation: createRegistryFetch({
          packuments: { [LOCKED_PLUGIN]: 403 },
          catalog: { plugins: [], notLicensedMessage: NOT_LICENSED_MESSAGE },
        }),
      }),
    });

    expect(logger.warn).toHaveBeenCalledWith(
      `${LOCKED_PLUGIN} is installed but is not included in your license.`
    );
  });

  it('lists the locked plugins when the license includes no plugin', async () => {
    const dependencies = await createDependencies({
      isInteractive: true,
      fetchImplementation: createRegistryFetch({
        packuments: {},
        catalog: {
          plugins: [{ name: LOCKED_PLUGIN, displayName: 'Locked', licensed: false }],
          notLicensedMessage: NOT_LICENSED_MESSAGE,
        },
      }),
    });
    const logger = createTestLogger();

    await runInstall({ appDir: await createApp(), packageArguments: [], logger, dependencies });

    expect(dependencies.promptForPlugins).not.toHaveBeenCalled();
    expect(dependencies.installPackages).not.toHaveBeenCalled();
    expect(logger.info.mock.calls.slice(-3)).toEqual([
      ['Your license does not include any Enterprise plugins yet.'],
      [[NOT_LICENSED_MESSAGE, `  ✕ Locked (${LOCKED_PLUGIN})`].join('\n')],
      ['Nothing to install.'],
    ]);
    expect(loggedText(logger)).not.toContain('Try again later');
  });

  it('asks nothing when the plugins in the license are up to date, and lists the locked ones', async () => {
    const dependencies = await createDependencies({
      isInteractive: true,
      fetchImplementation: createRegistryFetch({
        packuments: { [AI_BYOK]: aiByokPackument },
        catalog: {
          plugins: [
            { name: AI_BYOK, licensed: true },
            {
              name: LOCKED_PLUGIN,
              displayName: 'Locked',
              description: 'Does locked things.',
              licensed: false,
            },
          ],
          notLicensedMessage: NOT_LICENSED_MESSAGE,
        },
      }),
    });
    const logger = createTestLogger();

    await runInstall({
      appDir: await createApp({ installedPackages: { [AI_BYOK]: '1.2.0' } }),
      packageArguments: [],
      logger,
      dependencies,
    });

    expect(dependencies.promptForPlugins).not.toHaveBeenCalled();
    expect(logger.info.mock.calls.slice(-3)).toEqual([
      ['The Enterprise plugins in your license are installed and up to date.'],
      [[NOT_LICENSED_MESSAGE, `  ✕ Locked (${LOCKED_PLUGIN})  Does locked things.`].join('\n')],
      ['Nothing to install.'],
    ]);
  });

  it('lists no locked group when the plugins in the license are up to date on Growth', async () => {
    const dependencies = await createDependencies({
      isInteractive: true,
      fetchImplementation: createRegistryFetch({
        packuments: { [AI_BYOK]: aiByokPackument },
        catalog: { plugins: [{ name: AI_BYOK, licensed: true }] },
      }),
    });
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
    expect(loggedText(logger)).not.toContain('Not in your license.');
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
        catalog: { plugins: [{ name: AI_BYOK, licensed: true }] },
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

describe('runInstall with --registry', () => {
  const LOCAL_REGISTRY = 'http://localhost:4873';
  const requestedUrls = (dependencies: jest.Mocked<InstallDependencies>) =>
    (dependencies.fetchImplementation as jest.Mock).mock.calls.map(([input]) => String(input));

  it('sends every request to the Strapi registry without the option', async () => {
    const dependencies = await createDependencies({
      isInteractive: true,
      promptForPlugins: jest.fn().mockResolvedValue([`${AI_BYOK}@1.2.0`]),
    });
    const logger = createTestLogger();

    await runInstall({ appDir: await createApp(), packageArguments: [], logger, dependencies });

    expect(requestedUrls(dependencies)).toEqual(
      expect.arrayContaining([
        'https://packages.strapi.io/-/strapi/plugins',
        `https://packages.strapi.io/${AI_BYOK}`,
      ])
    );
    expect(
      requestedUrls(dependencies).every((url) => url.startsWith('https://packages.strapi.io/'))
    ).toBe(true);
    expect(loggedText(logger)).not.toContain('--registry');
    expect(loggedText(logger)).not.toContain('lockfile');
    expect(dependencies.installPackages.mock.calls[0][0].env).toBeUndefined();
  });

  it('ignores STRAPI_ENTERPRISE_REGISTRY_URL, which the app .env can set', async () => {
    const dependencies = await createDependencies({
      isInteractive: true,
      env: { STRAPI_LICENSE: LICENSE, STRAPI_ENTERPRISE_REGISTRY_URL: LOCAL_REGISTRY },
      promptForPlugins: jest.fn().mockResolvedValue([`${AI_BYOK}@1.2.0`]),
    });
    const logger = createTestLogger();

    await runInstall({ appDir: await createApp(), packageArguments: [], logger, dependencies });

    expect(requestedUrls(dependencies).length).toBeGreaterThan(0);
    expect(
      requestedUrls(dependencies).every((url) => url.startsWith('https://packages.strapi.io/'))
    ).toBe(true);
    expect(logger.warn).not.toHaveBeenCalledWith(
      expect.stringContaining('Using the Enterprise registry')
    );
    expect(await fse.readFile(path.join(dependencies.homeDir, '.npmrc'), 'utf8')).toBe(
      `@strapi-enterprise:registry=https://packages.strapi.io/\n//packages.strapi.io/:_authToken=${LICENSE}\n`
    );
  });

  it('sends every request to that registry, and saves nothing to ~/.npmrc', async () => {
    const dependencies = await createDependencies({
      isInteractive: true,
      promptForPlugins: jest.fn().mockResolvedValue([`${AI_BYOK}@1.2.0`]),
    });
    const logger = createTestLogger();

    await runInstall({
      appDir: await createApp(),
      packageArguments: [],
      registry: `${LOCAL_REGISTRY}/`,
      logger,
      dependencies,
    });

    expect(logger.warn).toHaveBeenCalledWith(
      `Using the Enterprise registry at ${LOCAL_REGISTRY} (--registry).`
    );
    expect(requestedUrls(dependencies)).toEqual(
      expect.arrayContaining([`${LOCAL_REGISTRY}/-/strapi/plugins`, `${LOCAL_REGISTRY}/${AI_BYOK}`])
    );
    expect(requestedUrls(dependencies).every((url) => url.startsWith(`${LOCAL_REGISTRY}/`))).toBe(
      true
    );
    expect(await fse.pathExists(path.join(dependencies.homeDir, '.npmrc'))).toBe(false);
  });

  it('asks that registry about a named plugin outside the license', async () => {
    const dependencies = await createDependencies({
      fetchImplementation: createRegistryFetch({
        packuments: { [LOCKED_PLUGIN]: 403 },
        catalog: {
          plugins: [{ name: LOCKED_PLUGIN, licensed: false }],
          notLicensedMessage: NOT_LICENSED_MESSAGE,
        },
      }),
    });

    await expect(
      runInstall({
        appDir: await createApp(),
        packageArguments: ['plugin-locked'],
        registry: LOCAL_REGISTRY,
        logger: createTestLogger(),
        dependencies,
      })
    ).rejects.toThrow(NOT_LICENSED_MESSAGE);
    expect(requestedUrls(dependencies)).toEqual([
      `${LOCAL_REGISTRY}/${LOCKED_PLUGIN}`,
      `${LOCAL_REGISTRY}/-/strapi/plugins`,
    ]);
  });

  it('names that registry when it cannot list the plugins, and writes nothing', async () => {
    const dependencies = await createDependencies({
      isInteractive: true,
      fetchImplementation: createRegistryFetch({
        packuments: { [AI_BYOK]: aiByokPackument },
        catalog: 503,
      }),
    });

    await expect(
      runInstall({
        appDir: await createApp({ installedPackages: { [AI_BYOK]: '1.1.0' } }),
        packageArguments: [],
        registry: LOCAL_REGISTRY,
        logger: createTestLogger(),
        dependencies,
      })
    ).rejects.toThrow(
      new EnterpriseInstallError(
        'Could not list the Enterprise plugins from localhost:4873. Try again later, or name the plugin to install.'
      )
    );
    expect(requestedUrls(dependencies)).toEqual([`${LOCAL_REGISTRY}/-/strapi/plugins`]);
    expect(dependencies.promptForPlugins).not.toHaveBeenCalled();
    expect(await fse.pathExists(path.join(dependencies.homeDir, '.npmrc'))).toBe(false);
  });

  it('stops before any request or write when the value is not allowed', async () => {
    const dependencies = await createDependencies();

    await expect(
      runInstall({
        appDir: await createApp(),
        packageArguments: ['plugin-ai-byok'],
        registry: 'http://registry.example.com',
        logger: createTestLogger(),
        dependencies,
      })
    ).rejects.toThrow('--registry must be http(s) on localhost');
    expect(dependencies.fetchImplementation).not.toHaveBeenCalled();
    expect(await fse.pathExists(path.join(dependencies.homeDir, '.npmrc'))).toBe(false);
  });
});

describe('runInstall with --registry, during the install', () => {
  const LOCAL_REGISTRY = 'http://localhost:4873';
  const OVERRIDE_NPMRC = `@strapi-enterprise:registry=${LOCAL_REGISTRY}/\n//localhost:4873/:_authToken=${LICENSE}\n`;
  const overrideYarnrc = (registryUrl: string) =>
    `npmScopes:\n  strapi-enterprise:\n    npmRegistryServer: '${registryUrl}/'\n    npmAlwaysAuth: true\n    npmAuthToken: '${LICENSE}'\n`;

  /** Stands in for the package manager, and keeps the configuration file it would read. */
  const createConfigReadingInstall = (
    configFileOf: (env: NodeJS.ProcessEnv) => string,
    { fails = false }: { fails?: boolean } = {}
  ) => {
    const seen = { env: {} as NodeJS.ProcessEnv, configPath: '', config: '', permissions: '' };
    const installPackages = jest.fn(async ({ env = {} }: { env?: NodeJS.ProcessEnv }) => {
      seen.env = env;
      seen.configPath = configFileOf(env);
      seen.config = await fse.readFile(seen.configPath, 'utf8');
      seen.permissions = await readFilePermissions(seen.configPath);

      if (fails) {
        throw new PackageManagerError(1);
      }
    });

    return { seen, installPackages };
  };

  const installWithRegistry = async (
    dependencies: jest.Mocked<InstallDependencies>,
    {
      registry = `${LOCAL_REGISTRY}/`,
      packageManager,
    }: { registry?: string; packageManager?: string } = {}
  ) => {
    const logger = createTestLogger();

    await runInstall({
      appDir: await createApp({ packageManager }),
      packageArguments: ['plugin-ai-byok'],
      registry,
      logger,
      dependencies,
    });

    return logger;
  };

  it('gives npm a temporary user configuration with only that registry, readable by its owner, and deletes it', async () => {
    const { seen, installPackages } = createConfigReadingInstall(
      (env) => env.NPM_CONFIG_USERCONFIG ?? ''
    );
    const dependencies = await createDependencies({ installPackages });

    const logger = await installWithRegistry(dependencies);

    expect(seen.env.npm_config_userconfig).toBe(seen.configPath);
    expect(seen.config).toBe(OVERRIDE_NPMRC);
    expect(seen.permissions).toBe('600');
    expect(await fse.pathExists(path.dirname(seen.configPath))).toBe(false);
    expect(await fse.pathExists(path.join(dependencies.homeDir, '.npmrc'))).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith(
      'The lockfile may now contain localhost:4873 URLs. Do not commit it.'
    );
  });

  it('leaves the user ~/.npmrc as it was, and gives npm none of its lines', async () => {
    const { seen, installPackages } = createConfigReadingInstall(
      (env) => env.NPM_CONFIG_USERCONFIG ?? ''
    );
    const dependencies = await createDependencies({ installPackages });
    const userNpmrcPath = path.join(dependencies.homeDir, '.npmrc');
    const userNpmrc = `fund=false\n@strapi-enterprise:registry=https://packages.strapi.io/\n//packages.strapi.io/:_authToken=${LICENSE}\n//localhost:4873/:_authToken=old-license`;
    await fse.writeFile(userNpmrcPath, userNpmrc);

    await installWithRegistry(dependencies);

    expect(seen.config).toBe(OVERRIDE_NPMRC);
    expect(await fse.readFile(userNpmrcPath, 'utf8')).toBe(userNpmrc);
  });

  it('deletes the temporary configuration when the install fails', async () => {
    const { seen, installPackages } = createConfigReadingInstall(
      (env) => env.NPM_CONFIG_USERCONFIG ?? '',
      { fails: true }
    );
    const dependencies = await createDependencies({ installPackages });

    await expect(installWithRegistry(dependencies)).rejects.toBeInstanceOf(PackageManagerError);
    expect(seen.config).toBe(OVERRIDE_NPMRC);
    expect(await fse.pathExists(path.dirname(seen.configPath))).toBe(false);
  });

  it('gives Yarn 2+ a temporary home folder, and leaves the user ~/.yarnrc.yml as it was', async () => {
    const { seen, installPackages } = createConfigReadingInstall((env) =>
      path.join(env.HOME ?? '', '.yarnrc.yml')
    );
    const dependencies = await createDependencies({ installPackages });
    const userYarnrcPath = path.join(dependencies.homeDir, '.yarnrc.yml');
    await fse.writeFile(userYarnrcPath, 'enableTelemetry: false\n');

    await installWithRegistry(dependencies, { packageManager: 'yarn@4.5.0' });

    expect(seen.config).toBe(overrideYarnrc(LOCAL_REGISTRY));
    expect(seen.permissions).toBe('600');
    expect(seen.env).toEqual({
      HOME: path.dirname(seen.configPath),
      USERPROFILE: path.dirname(seen.configPath),
      YARN_GLOBAL_FOLDER: path.join(dependencies.homeDir, '.yarn', 'berry'),
      COREPACK_HOME: path.join(dependencies.homeDir, '.cache', 'node', 'corepack'),
      YARN_UNSAFE_HTTP_WHITELIST: 'localhost',
    });
    expect(await fse.pathExists(path.dirname(seen.configPath))).toBe(false);
    expect(await fse.readFile(userYarnrcPath, 'utf8')).toBe('enableTelemetry: false\n');
  });

  it('keeps the Yarn cache and http allow list already set in the environment', async () => {
    const { seen, installPackages } = createConfigReadingInstall((env) =>
      path.join(env.HOME ?? '', '.yarnrc.yml')
    );
    const dependencies = await createDependencies({
      env: {
        STRAPI_LICENSE: LICENSE,
        YARN_GLOBAL_FOLDER: '/yarn-cache',
        YARN_UNSAFE_HTTP_WHITELIST: 'registry.local',
      },
      installPackages,
    });

    await installWithRegistry(dependencies, { packageManager: 'yarn@4.5.0' });

    expect(seen.env.YARN_GLOBAL_FOLDER).toBeUndefined();
    expect(seen.env.YARN_UNSAFE_HTTP_WHITELIST).toBe('registry.local,localhost');
  });

  it('leaves the Yarn cache alone when XDG_DATA_HOME places it outside the home folder', async () => {
    const { seen, installPackages } = createConfigReadingInstall((env) =>
      path.join(env.HOME ?? '', '.yarnrc.yml')
    );
    const dependencies = await createDependencies({
      env: { STRAPI_LICENSE: LICENSE, XDG_DATA_HOME: '/data' },
      installPackages,
    });

    await installWithRegistry(dependencies, { packageManager: 'yarn@4.5.0' });

    expect(seen.config).toBe(overrideYarnrc(LOCAL_REGISTRY));
    expect(seen.env).not.toHaveProperty('YARN_GLOBAL_FOLDER');
  });

  it('keeps the Corepack folder already set in the environment', async () => {
    const { seen, installPackages } = createConfigReadingInstall((env) =>
      path.join(env.HOME ?? '', '.yarnrc.yml')
    );
    const dependencies = await createDependencies({
      env: { STRAPI_LICENSE: LICENSE, COREPACK_HOME: '/corepack' },
      installPackages,
    });

    await installWithRegistry(dependencies, { packageManager: 'yarn@4.5.0' });

    expect(seen.env).toEqual({
      HOME: path.dirname(seen.configPath),
      USERPROFILE: path.dirname(seen.configPath),
      YARN_GLOBAL_FOLDER: path.join(dependencies.homeDir, '.yarn', 'berry'),
      YARN_UNSAFE_HTTP_WHITELIST: 'localhost',
    });
  });

  it('leaves the Corepack folder alone when XDG_CACHE_HOME places it outside the home folder', async () => {
    const { seen, installPackages } = createConfigReadingInstall((env) =>
      path.join(env.HOME ?? '', '.yarnrc.yml')
    );
    const dependencies = await createDependencies({
      env: { STRAPI_LICENSE: LICENSE, XDG_CACHE_HOME: '/cache' },
      installPackages,
    });

    await installWithRegistry(dependencies, { packageManager: 'yarn@4.5.0' });

    expect(seen.env).not.toHaveProperty('COREPACK_HOME');
  });

  it('allows no http host in Yarn 2+ for an https registry', async () => {
    const registryUrl = 'https://packages.staging.strapi.team';
    const { seen, installPackages } = createConfigReadingInstall((env) =>
      path.join(env.HOME ?? '', '.yarnrc.yml')
    );
    const dependencies = await createDependencies({ installPackages });

    await installWithRegistry(dependencies, {
      registry: registryUrl,
      packageManager: 'yarn@4.5.0',
    });

    expect(seen.config).toBe(overrideYarnrc(registryUrl));
    expect(seen.env).not.toHaveProperty('YARN_UNSAFE_HTTP_WHITELIST');
  });

  it('stops before installing when a project .npmrc sets another license for that registry', async () => {
    const dependencies = await createDependencies();
    const appDir = await createApp();
    await fse.writeFile(
      path.join(appDir, '.npmrc'),
      '//localhost:4873/:_authToken=other-license\n'
    );

    await expect(
      runInstall({
        appDir,
        packageArguments: ['plugin-ai-byok'],
        registry: LOCAL_REGISTRY,
        logger: createTestLogger(),
        dependencies,
      })
    ).rejects.toThrow(
      new EnterpriseInstallError(
        `${path.join(appDir, '.npmrc')} sets another license for localhost:4873 and takes precedence over --registry.\nUpdate or remove that line, then run the command again.`
      )
    );
    expect(dependencies.installPackages).not.toHaveBeenCalled();
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
