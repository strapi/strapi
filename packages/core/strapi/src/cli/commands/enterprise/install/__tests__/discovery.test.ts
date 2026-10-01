import path from 'path';
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

const discover = async (appDir: string, fetchImplementation: typeof fetch) =>
  discoverEnterprisePlugins({
    appDir,
    license: 'the-license',
    logger: createTestLogger(),
    env: {},
    fetchImplementation,
  });

describe('discoverEnterprisePlugins', () => {
  it('lists the plugins the registry search returns, and skips libraries', async () => {
    const fetchImplementation = createRegistryFetch({
      searchResult: [AI_BYOK, NEW_PLUGIN, AI_WORKFLOWS],
      packuments: {
        [AI_BYOK]: aiByokPackument,
        [NEW_PLUGIN]: newPluginPackument,
        [AI_WORKFLOWS]: aiWorkflowsPackument,
      },
    });

    const discoveredPlugins = await discover(await createTemporaryDirectory(), fetchImplementation);

    expect(discoveredPlugins.map(({ entry }) => entry.packageName)).toEqual([AI_BYOK, NEW_PLUGIN]);
    expect(discoveredPlugins[1]?.entry).toEqual({
      packageName: NEW_PLUGIN,
      pluginId: 'new',
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

    const discoveredPlugins = await discover(await createTemporaryDirectory(), fetchImplementation);

    expect(discoveredPlugins.map(({ entry }) => entry)).toMatchObject([
      { packageName: provider, displayName: 'S3 Upload', kind: 'provider' },
    ]);
  });

  it('leaves out a package the registry fails to describe, and lists the others', async () => {
    const logger = createTestLogger();

    const discoveredPlugins = await discoverEnterprisePlugins({
      appDir: await createTemporaryDirectory(),
      license: 'the-license',
      logger,
      env: {},
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

    const [discoveredPlugin] = await discover(
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

    const discoveredPlugins = await discoverEnterprisePlugins({
      appDir,
      license: 'the-license',
      logger,
      env: {},
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

    const discoveredPlugins = await discover(appDir, fetchImplementation);

    expect(discoveredPlugins.find(({ entry }) => entry.packageName === NEW_PLUGIN)).toMatchObject({
      lookup: { status: 'not-licensed' },
      installedVersion: '2.0.0',
    });
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
      pluginId: 'ai-byok',
      displayName: 'AI BYOK',
      summary: 'Bring your own key.',
      kind: 'plugin',
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
