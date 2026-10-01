import path from 'path';
import fse from 'fs-extra';

import { parsePackageArgument, runInstall, type InstallDependencies } from '../action';
import {
  createFetchResponse,
  createPackument,
  createRegistryFetch,
  createTemporaryDirectory,
  createTestLogger,
  loggedText,
} from './test-helpers';

jest.mock('@strapi/core', () => ({
  readLicense: jest.fn(() => undefined),
  verifyLicense: jest.fn(() => ({ type: 'gold', isTrial: false })),
}));

const LICENSE = 'the-license';
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
  await fse.writeJson(path.join(appDir, 'package.json'), { packageManager: 'npm@10.9.0' });
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
    expect(logger.info).toHaveBeenCalledWith(
      'AI BYOK: visit https://docs.strapi.io/cms/plugins/ai-byok to set it up.'
    );
    expect(loggedText(logger)).not.toContain(LICENSE);
  });

  it('passes an explicit version through as is, prereleases included', async () => {
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
    [404, `${AI_BYOK} is not an Enterprise package.`],
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

describe('parsePackageArgument', () => {
  it.each([
    ['plugin-ai-byok', { packageName: AI_BYOK }],
    [AI_BYOK, { packageName: AI_BYOK }],
    ['plugin-ai-byok@1.2.0', { packageName: AI_BYOK, requestedVersion: '1.2.0' }],
    [`${AI_BYOK}@experimental`, { packageName: AI_BYOK, requestedVersion: 'experimental' }],
  ])('reads %s', (packageArgument, expected) => {
    expect(parsePackageArgument(packageArgument)).toEqual(expected);
  });

  it('rejects a package outside the Enterprise scope', () => {
    expect(() => parsePackageArgument('@other/plugin')).toThrow(
      '@other/plugin is not an Enterprise package. Enterprise packages start with @strapi-enterprise/.'
    );
  });
});
