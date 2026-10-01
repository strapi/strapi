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
      configuration: undefined,
    });
  });

  it('still lists the known plugins when the registry search is unavailable, and says so', async () => {
    const fetchImplementation = createRegistryFetch({
      searchResult: 500,
      packuments: { [AI_BYOK]: aiByokPackument },
    });
    const logger = createTestLogger();

    const discoveredPlugins = await discoverEnterprisePlugins({
      appDir: await createTemporaryDirectory(),
      license: 'the-license',
      logger,
      env: {},
      fetchImplementation,
    });

    expect(discoveredPlugins.map(({ entry }) => entry.packageName)).toEqual([AI_BYOK]);
    expect(logger.warn).toHaveBeenCalledWith(
      'Could not search packages.strapi.io, so only the known and installed Enterprise plugins are listed.'
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
  it('finds installed plugins and leaves libraries out', async () => {
    const appDir = await createTemporaryDirectory();
    await installFakePackage(appDir, NEW_PLUGIN, { version: '2.0.0', strapi: { kind: 'plugin' } });
    await installFakePackage(appDir, AI_WORKFLOWS, { version: '0.1.0' });

    await expect(listInstalledEnterprisePlugins(appDir)).resolves.toEqual([NEW_PLUGIN]);
  });
});

describe('describeEnterprisePlugin', () => {
  it('uses the copy the package publishes, and the configuration this CLI knows', () => {
    const entry = describeEnterprisePlugin(AI_BYOK, {
      status: 'available',
      packument: aiByokPackument,
    });

    expect(entry).toMatchObject({ displayName: 'AI BYOK', summary: 'Bring your own key.' });
    expect(entry?.configuration?.envLines).toContain('STRAPI_AI_PROVIDER_API_KEY=');
  });

  it('is undefined for a package that is not a plugin', () => {
    expect(
      describeEnterprisePlugin(AI_WORKFLOWS, {
        status: 'available',
        packument: aiWorkflowsPackument,
      })
    ).toBeUndefined();
  });
});
