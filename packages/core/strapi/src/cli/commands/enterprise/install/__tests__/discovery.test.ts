import path from 'node:path';
import fse from 'fs-extra';

import {
  describeEnterprisePlugin,
  discoverEnterprisePlugins,
  listInstalledEnterprisePlugins,
} from '../discovery';
import {
  createPackument,
  createRegistryFetch,
  createTemporaryDirectory,
  createTestLogger,
  installFakePackage,
  NOT_LICENSED_MESSAGE,
  REGISTRY_URL,
} from './test-helpers';

const AI_BYOK = '@strapi-enterprise/plugin-ai-byok';
const NEW_PLUGIN = '@strapi-enterprise/plugin-new';
const AI_WORKFLOWS = '@strapi-enterprise/ai-workflows';

const aiByokPackument = createPackument(
  AI_BYOK,
  [
    {
      version: '1.0.0',
      strapi: {
        name: 'ai-byok',
        displayName: 'AI BYOK',
        description: 'Bring your own key.',
        kind: 'plugin',
      },
    },
  ],
  { latest: '1.0.0' }
);

const newPluginPackument = createPackument(
  NEW_PLUGIN,
  [
    {
      version: '2.0.0',
      strapi: {
        name: 'new',
        displayName: 'New plugin',
        description: 'Does new things.',
        kind: 'plugin',
      },
    },
  ],
  { latest: '2.0.0' }
);

// A library the plugins depend on: no `strapi` metadata.
const aiWorkflowsPackument = createPackument(AI_WORKFLOWS, [{ version: '0.1.0' }], {
  latest: '0.1.0',
});

const catalogPlugin = (name: string, licensed: boolean) => ({
  name,
  displayName: `${name} name`,
  description: `${name} summary`,
  kind: 'plugin',
  licensed,
});

const discover = async (appDir: string, fetchImplementation: typeof fetch) =>
  discoverEnterprisePlugins({
    appDir,
    registryUrl: REGISTRY_URL,
    license: 'the-license',
    logger: createTestLogger(),
    fetchImplementation,
  });

describe('discoverEnterprisePlugins', () => {
  it('leaves out a search result with an invalid name, without asking for its metadata', async () => {
    const invalidName = '@strapi-enterprise/plugin\u001B[2J';
    const fetchImplementation = createRegistryFetch({
      searchResult: [AI_BYOK, invalidName],
      packuments: { [AI_BYOK]: aiByokPackument, [invalidName]: aiByokPackument },
    });

    const { plugins } = await discover(await createTemporaryDirectory(), fetchImplementation);

    expect(plugins.map(({ entry }) => entry.packageName)).toEqual([AI_BYOK]);
    expect(fetchImplementation.mock.calls.map(([input]) => String(input))).not.toContainEqual(
      expect.stringContaining('plugin%1B')
    );
  });

  it('lists the plugins the registry search returns, and skips libraries', async () => {
    const fetchImplementation = createRegistryFetch({
      searchResult: [AI_BYOK, NEW_PLUGIN, AI_WORKFLOWS],
      packuments: {
        [AI_BYOK]: aiByokPackument,
        [NEW_PLUGIN]: newPluginPackument,
        [AI_WORKFLOWS]: aiWorkflowsPackument,
      },
    });

    const { plugins: discoveredPlugins } = await discover(
      await createTemporaryDirectory(),
      fetchImplementation
    );

    expect(discoveredPlugins.map(({ entry }) => entry.packageName)).toEqual([AI_BYOK, NEW_PLUGIN]);
    expect(discoveredPlugins[1]?.entry).toEqual({
      packageName: NEW_PLUGIN,
      displayName: 'New plugin',
      summary: 'Does new things.',
      kind: 'plugin',
    });
  });

  it('lists a package of another kind, such as a provider', async () => {
    const provider = '@strapi-enterprise/provider-upload-s3';
    const fetchImplementation = createRegistryFetch({
      searchResult: [provider],
      packuments: {
        [provider]: createPackument(
          provider,
          [{ version: '1.0.0', strapi: { displayName: 'S3 Upload', kind: 'provider' } }],
          { latest: '1.0.0' }
        ),
      },
    });

    const { plugins: discoveredPlugins } = await discover(
      await createTemporaryDirectory(),
      fetchImplementation
    );

    expect(discoveredPlugins.map(({ entry }) => entry)).toMatchObject([
      { packageName: provider, displayName: 'S3 Upload', kind: 'provider' },
    ]);
  });

  it('leaves out a package the registry fails to describe, and lists the others', async () => {
    const logger = createTestLogger();

    const { plugins: discoveredPlugins } = await discoverEnterprisePlugins({
      appDir: await createTemporaryDirectory(),
      registryUrl: REGISTRY_URL,
      license: 'the-license',
      logger,
      fetchImplementation: createRegistryFetch({
        searchResult: [AI_BYOK, NEW_PLUGIN],
        packuments: { [AI_BYOK]: aiByokPackument, [NEW_PLUGIN]: 503 },
      }),
    });

    expect(discoveredPlugins.map(({ entry }) => entry.packageName)).toEqual([AI_BYOK]);
    expect(logger.warn).toHaveBeenCalledWith(
      `${NEW_PLUGIN} is left out of the list: https://packages.strapi.io answered HTTP 503 for ${NEW_PLUGIN}. Try again later.`
    );
  });

  it('does not count a copy hoisted for another app as installed, so it is no upgrade', async () => {
    const rootDir = await createTemporaryDirectory();
    const appDir = path.join(rootDir, 'apps', 'my-app');
    await fse.outputJson(path.join(appDir, 'package.json'), { dependencies: {} });
    await installFakePackage(
      rootDir,
      AI_BYOK,
      { version: '0.9.0', strapi: { kind: 'plugin' } },
      { asDependency: false }
    );

    const {
      plugins: [discoveredPlugin],
    } = await discover(
      appDir,
      createRegistryFetch({ searchResult: [AI_BYOK], packuments: { [AI_BYOK]: aiByokPackument } })
    );

    expect(discoveredPlugin).toMatchObject({ entry: { packageName: AI_BYOK } });
    expect(discoveredPlugin?.installedVersion).toBeUndefined();
  });

  it('stops when the registry fails to describe every package', async () => {
    await expect(
      discover(
        await createTemporaryDirectory(),
        createRegistryFetch({
          searchResult: [AI_BYOK, NEW_PLUGIN],
          packuments: { [AI_BYOK]: 503, [NEW_PLUGIN]: 503 },
        })
      )
    ).rejects.toThrow('answered HTTP 503');
  });

  it('lists the installed plugins when the registry search is unavailable, and says so', async () => {
    const appDir = await createTemporaryDirectory();
    await installFakePackage(appDir, AI_BYOK, { version: '1.0.0', strapi: { kind: 'plugin' } });
    const logger = createTestLogger();

    const { plugins: discoveredPlugins } = await discoverEnterprisePlugins({
      appDir,
      registryUrl: REGISTRY_URL,
      license: 'the-license',
      logger,
      fetchImplementation: createRegistryFetch({
        searchResult: 500,
        packuments: { [AI_BYOK]: aiByokPackument },
      }),
    });

    expect(discoveredPlugins.map(({ entry }) => entry.packageName)).toEqual([AI_BYOK]);
    expect(logger.warn).toHaveBeenCalledWith(
      'Could not search packages.strapi.io, so only the installed Enterprise plugins are listed.'
    );
  });

  it('stops with the license error when the search rejects the license', async () => {
    await expect(
      discover(
        await createTemporaryDirectory(),
        createRegistryFetch({ searchResult: 401, packuments: {} })
      )
    ).rejects.toThrow('https://packages.strapi.io rejected this Strapi license.');
  });

  it('stops when the registry search is unavailable and no plugin is installed', async () => {
    await expect(
      discover(
        await createTemporaryDirectory(),
        createRegistryFetch({ searchResult: 500, packuments: {} })
      )
    ).rejects.toThrow(
      'Could not search packages.strapi.io. Try again later, or name the plugin to install.'
    );
  });

  it('includes an installed plugin that the license no longer includes', async () => {
    const appDir = await createTemporaryDirectory();
    await installFakePackage(appDir, NEW_PLUGIN, {
      version: '2.0.0',
      strapi: { kind: 'plugin' },
    });
    const fetchImplementation = createRegistryFetch({
      searchResult: [AI_BYOK],
      packuments: { [AI_BYOK]: aiByokPackument, [NEW_PLUGIN]: 403 },
    });

    const { plugins: discoveredPlugins } = await discover(appDir, fetchImplementation);

    expect(discoveredPlugins.find(({ entry }) => entry.packageName === NEW_PLUGIN)).toMatchObject({
      lookup: { status: 'not-licensed' },
      installedVersion: '2.0.0',
    });
  });
});

describe('discoverEnterprisePlugins with the plugin catalog', () => {
  it('describes the licensed plugins, and lists the others as locked with the message', async () => {
    const fetchImplementation = createRegistryFetch({
      searchResult: 500,
      packuments: { [AI_BYOK]: aiByokPackument, [NEW_PLUGIN]: 403 },
      catalog: {
        plugins: [catalogPlugin(AI_BYOK, true), catalogPlugin(NEW_PLUGIN, false)],
        notLicensedMessage: NOT_LICENSED_MESSAGE,
      },
    });

    const { plugins, lockedPlugins, notLicensedMessage } = await discover(
      await createTemporaryDirectory(),
      fetchImplementation
    );

    expect(plugins.map(({ entry }) => entry)).toEqual([
      {
        packageName: AI_BYOK,
        displayName: 'AI BYOK',
        summary: 'Bring your own key.',
        kind: 'plugin',
      },
    ]);
    expect(lockedPlugins).toEqual([
      {
        packageName: NEW_PLUGIN,
        displayName: `${NEW_PLUGIN} name`,
        summary: `${NEW_PLUGIN} summary`,
        kind: 'plugin',
      },
    ]);
    expect(notLicensedMessage).toBe(NOT_LICENSED_MESSAGE);
    const requestedPaths = fetchImplementation.mock.calls.map(
      ([input]) => new URL(String(input)).pathname
    );
    expect(requestedPaths).not.toContain('/-/v1/search');
    expect(requestedPaths).not.toContain(`/${NEW_PLUGIN}`);
  });

  it('keeps an installed plugin outside the license with the plugins, not locked', async () => {
    const appDir = await createTemporaryDirectory();
    await installFakePackage(appDir, NEW_PLUGIN, { version: '2.0.0', strapi: { kind: 'plugin' } });

    const { plugins, lockedPlugins, installedOutsideLicense, notLicensedMessage } = await discover(
      appDir,
      createRegistryFetch({
        searchResult: [],
        packuments: { [NEW_PLUGIN]: 403 },
        catalog: {
          plugins: [catalogPlugin(NEW_PLUGIN, false)],
          notLicensedMessage: NOT_LICENSED_MESSAGE,
        },
      })
    );

    expect(plugins).toMatchObject([
      { entry: { packageName: NEW_PLUGIN }, lookup: { status: 'not-licensed' } },
    ]);
    expect(lockedPlugins).toEqual([]);
    expect(installedOutsideLicense).toEqual([NEW_PLUGIN]);
    expect(notLicensedMessage).toBe(NOT_LICENSED_MESSAGE);
  });

  it('drops the message when every plugin is in the license', async () => {
    const result = await discover(
      await createTemporaryDirectory(),
      createRegistryFetch({
        searchResult: [],
        packuments: { [AI_BYOK]: aiByokPackument },
        catalog: {
          plugins: [catalogPlugin(AI_BYOK, true)],
          notLicensedMessage: NOT_LICENSED_MESSAGE,
        },
      })
    );

    expect(result).toMatchObject({
      lockedPlugins: [],
      installedOutsideLicense: [],
      notLicensedMessage: undefined,
    });
  });

  it('leaves out a package outside the Enterprise scope, or with an invalid name', async () => {
    const { plugins, lockedPlugins } = await discover(
      await createTemporaryDirectory(),
      createRegistryFetch({
        searchResult: [],
        packuments: {},
        catalog: {
          plugins: [
            catalogPlugin('left-pad', true),
            catalogPlugin('@other/plugin', false),
            catalogPlugin('@strapi-enterprise/\u001B[2Jplugin', false),
          ],
        },
      })
    );

    expect(plugins).toEqual([]);
    expect(lockedPlugins).toEqual([]);
  });

  it('uses the registry search when the catalog fails', async () => {
    const { plugins, lockedPlugins } = await discover(
      await createTemporaryDirectory(),
      createRegistryFetch({
        searchResult: [AI_BYOK],
        packuments: { [AI_BYOK]: aiByokPackument },
        catalog: 500,
      })
    );

    expect(plugins.map(({ entry }) => entry.packageName)).toEqual([AI_BYOK]);
    expect(lockedPlugins).toEqual([]);
  });

  it.each([
    ['answers with a plugin list that is not an array', { plugins: 'not-a-list' }],
    ['answers with no object', null],
  ])('uses the registry search when the catalog %s', async (_case, catalog) => {
    const { plugins } = await discover(
      await createTemporaryDirectory(),
      createRegistryFetch({
        searchResult: [AI_BYOK],
        packuments: { [AI_BYOK]: aiByokPackument },
        catalog,
      })
    );

    expect(plugins.map(({ entry }) => entry.packageName)).toEqual([AI_BYOK]);
  });

  it('uses the registry search when the catalog times out', async () => {
    const registryFetch = createRegistryFetch({
      searchResult: [AI_BYOK],
      packuments: { [AI_BYOK]: aiByokPackument },
    });
    const fetchImplementation = jest.fn(async (input: Parameters<typeof fetch>[0]) => {
      if (new URL(String(input)).pathname === '/-/strapi/plugins') {
        throw new DOMException('The operation was aborted due to timeout', 'TimeoutError');
      }

      return registryFetch(input);
    });

    const { plugins, lockedPlugins } = await discover(
      await createTemporaryDirectory(),
      fetchImplementation
    );

    expect(plugins.map(({ entry }) => entry.packageName)).toEqual([AI_BYOK]);
    expect(lockedPlugins).toEqual([]);
  });

  it('lists a plugin the catalog repeats once, as licensed when one entry says so', async () => {
    const fetchImplementation = createRegistryFetch({
      searchResult: [],
      packuments: { [AI_BYOK]: aiByokPackument },
      catalog: {
        plugins: [
          catalogPlugin(AI_BYOK, false),
          catalogPlugin(AI_BYOK, true),
          catalogPlugin(NEW_PLUGIN, false),
          catalogPlugin(NEW_PLUGIN, false),
        ],
      },
    });

    const { plugins, lockedPlugins } = await discover(
      await createTemporaryDirectory(),
      fetchImplementation
    );

    expect(plugins.map(({ entry }) => entry.packageName)).toEqual([AI_BYOK]);
    expect(lockedPlugins.map(({ packageName }) => packageName)).toEqual([NEW_PLUGIN]);
    expect(
      fetchImplementation.mock.calls.filter(
        ([input]) => new URL(String(input)).pathname === `/${AI_BYOK}`
      )
    ).toHaveLength(1);
  });

  it('stops with the license error when the catalog rejects the license', async () => {
    await expect(
      discover(
        await createTemporaryDirectory(),
        createRegistryFetch({ searchResult: [], packuments: {}, catalog: 401 })
      )
    ).rejects.toThrow('https://packages.strapi.io rejected this Strapi license.');
  });
});

describe('listInstalledEnterprisePlugins', () => {
  it('leaves out a plugin hoisted for another app of the same monorepo', async () => {
    const rootDir = await createTemporaryDirectory();
    const appDir = path.join(rootDir, 'apps', 'my-app');
    await fse.outputJson(path.join(appDir, 'package.json'), { dependencies: {} });
    // Installed at the monorepo root because a sibling app depends on it.
    await installFakePackage(
      rootDir,
      NEW_PLUGIN,
      { version: '2.0.0', strapi: { kind: 'plugin' } },
      { asDependency: false }
    );

    await expect(listInstalledEnterprisePlugins(appDir)).resolves.toEqual([]);
  });

  it('finds installed plugins and leaves libraries out', async () => {
    const appDir = await createTemporaryDirectory();
    await installFakePackage(appDir, NEW_PLUGIN, { version: '2.0.0', strapi: { kind: 'plugin' } });
    await installFakePackage(appDir, AI_WORKFLOWS, { version: '0.1.0' });

    await expect(listInstalledEnterprisePlugins(appDir)).resolves.toEqual([NEW_PLUGIN]);
  });
});

describe('describeEnterprisePlugin', () => {
  it('uses the name and copy the package publishes', () => {
    const entry = describeEnterprisePlugin(AI_BYOK, {
      status: 'available',
      packument: aiByokPackument,
    });

    expect(entry).toEqual({
      packageName: AI_BYOK,
      displayName: 'AI BYOK',
      summary: 'Bring your own key.',
      kind: 'plugin',
    });
  });

  it('removes control characters, ANSI codes and format characters from the copy', () => {
    const entry = describeEnterprisePlugin(AI_BYOK, {
      status: 'available',
      packument: createPackument(
        AI_BYOK,
        [
          {
            version: '1.0.0',
            strapi: {
              displayName: '\u001B[31mAI\u001B[0m\u202E BYOK',
              description: 'Bring\r\nyour own\u200B key.\u0007',
              kind: 'provider\u001B]8;;https://example.com\u0007',
            },
          },
        ],
        { latest: '1.0.0' }
      ),
    });

    expect(entry).toMatchObject({
      displayName: 'AI BYOK',
      summary: 'Bring your own key.',
      kind: 'provider',
    });
  });

  it('is undefined for a library, which declares no kind', () => {
    expect(
      describeEnterprisePlugin(AI_WORKFLOWS, {
        status: 'available',
        packument: aiWorkflowsPackument,
      })
    ).toBeUndefined();
  });
});
