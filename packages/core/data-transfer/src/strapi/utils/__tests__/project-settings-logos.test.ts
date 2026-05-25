import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

import { collect, createMockedQueryBuilder, getStrapiFactory } from '../../../__tests__/test-utils';
import { createConfigurationStream } from '../../providers/local-source/configuration';
import { restoreConfigs } from '../../providers/local-destination/strategies/restore';
import {
  PROJECT_SETTINGS_CORE_STORE_KEY,
  enrichProjectSettingsForExport,
  restoreProjectSettingsLogos,
} from '../project-settings-logos';

describe('Project settings logos transfer', () => {
  let publicDir: string;

  beforeEach(async () => {
    publicDir = await mkdtemp(join(tmpdir(), 'strapi-transfer-logos-'));
    await mkdir(join(publicDir, 'uploads'), { recursive: true });
    await writeFile(join(publicDir, 'uploads', 'menu_logo.png'), Buffer.from('menu-logo'));
    await writeFile(join(publicDir, 'uploads', 'auth_logo.png'), Buffer.from('auth-logo'));
  });

  afterEach(async () => {
    await rm(publicDir, { recursive: true, force: true });
  });

  const createLogo = (name: 'menu' | 'auth') => ({
    name: `${name}-logo.png`,
    hash: `${name}_logo`,
    url: `/uploads/${name}_logo.png`,
    width: 100,
    height: 100,
    ext: '.png',
    size: 123,
    provider: 'local',
  });

  const createProjectSettingsRow = () => ({
    id: 1,
    key: PROJECT_SETTINGS_CORE_STORE_KEY,
    type: 'object',
    environment: null,
    tag: null,
    value: {
      menuLogo: createLogo('menu'),
      authLogo: createLogo('auth'),
    },
  });

  test('exports admin logo file contents alongside project settings configuration', async () => {
    const uploadStream = jest.fn();
    const strapi = getStrapiFactory({
      dirs: { static: { public: publicDir } },
      log: { warn: jest.fn() },
      plugins: {
        upload: {
          provider: {
            uploadStream,
          },
        },
      },
      config: {
        get: () => ({ provider: 'local' }),
      },
    })();

    const row = createProjectSettingsRow();
    const exported = await enrichProjectSettingsForExport(strapi, row);

    expect(exported.value.menuLogo?.__transferBuffer).toBe(
      Buffer.from('menu-logo').toString('base64')
    );
    expect(exported.value.authLogo?.__transferBuffer).toBe(
      Buffer.from('auth-logo').toString('base64')
    );
  });

  test('configuration stream includes logo transfer buffers for project settings', async () => {
    const queryBuilder = createMockedQueryBuilder({
      'strapi::core-store': [
        {
          id: 1,
          key: PROJECT_SETTINGS_CORE_STORE_KEY,
          type: 'object',
          environment: null,
          tag: null,
          value: JSON.stringify(createProjectSettingsRow().value),
        },
      ],
      'strapi::webhook': [],
    });

    const strapi = getStrapiFactory({
      db: { queryBuilder },
      dirs: { static: { public: publicDir } },
      log: { warn: jest.fn() },
      plugins: {
        upload: {
          provider: {
            uploadStream: jest.fn(),
          },
        },
      },
      config: {
        get: () => ({ provider: 'local' }),
      },
    })();

    const results = await collect(createConfigurationStream(strapi));
    const projectSettings = results.find(
      (item) => item.type === 'core-store' && item.value.key === PROJECT_SETTINGS_CORE_STORE_KEY
    );

    expect(projectSettings?.value.value.menuLogo?.__transferBuffer).toBe(
      Buffer.from('menu-logo').toString('base64')
    );
    expect(projectSettings?.value.value.authLogo?.__transferBuffer).toBe(
      Buffer.from('auth-logo').toString('base64')
    );
  });

  test('restore uploads admin logos and strips transfer buffers before persisting', async () => {
    const uploadStream = jest.fn(async (file: { url?: string }) => {
      file.url = '/uploads/restored.png';
    });

    const create = jest.fn((data) => data);
    const strapi = getStrapiFactory({
      db: { query: jest.fn(() => ({ create })) },
      plugin: () => ({
        provider: {
          uploadStream,
        },
      }),
      plugins: {
        upload: {
          provider: {
            uploadStream,
          },
        },
      },
      config: {
        get: () => ({ provider: 'local' }),
      },
    })();

    const settings = {
      menuLogo: {
        ...createLogo('menu'),
        __transferBuffer: Buffer.from('menu-logo').toString('base64'),
      },
      authLogo: {
        ...createLogo('auth'),
        __transferBuffer: Buffer.from('auth-logo').toString('base64'),
      },
    };

    const restored = await restoreProjectSettingsLogos(strapi, settings);

    expect(uploadStream).toHaveBeenCalledTimes(2);
    expect(restored.menuLogo?.__transferBuffer).toBeUndefined();
    expect(restored.authLogo?.__transferBuffer).toBeUndefined();
    expect(restored.menuLogo?.url).toBe('/uploads/restored.png');
    expect(restored.authLogo?.url).toBe('/uploads/restored.png');
  });

  test('restoreConfigs persists project settings without transfer buffers', async () => {
    const uploadStream = jest.fn(async (file: { url?: string }) => {
      file.url = '/uploads/restored.png';
    });
    const create = jest.fn((data) => data);

    const strapi = getStrapiFactory({
      db: { query: jest.fn(() => ({ create })) },
      plugin: () => ({
        provider: {
          uploadStream,
        },
      }),
      plugins: {
        upload: {
          provider: {
            uploadStream,
          },
        },
      },
      config: {
        get: () => ({ provider: 'local' }),
      },
    })();

    const config = {
      type: 'core-store' as const,
      value: {
        id: 1,
        key: PROJECT_SETTINGS_CORE_STORE_KEY,
        type: 'object',
        environment: null,
        tag: null,
        value: {
          menuLogo: {
            ...createLogo('menu'),
            __transferBuffer: Buffer.from('menu-logo').toString('base64'),
          },
          authLogo: null,
        },
      },
    };

    const result = await restoreConfigs(strapi, config);
    const persistedValue = JSON.parse(result.data.value);

    expect(uploadStream).toHaveBeenCalledTimes(1);
    expect(persistedValue.menuLogo.__transferBuffer).toBeUndefined();
    expect(persistedValue.menuLogo.url).toBe('/uploads/restored.png');
    expect(persistedValue.authLogo).toBeNull();
  });

  describe('regression guards', () => {
    test('does not enrich unrelated core-store rows on export', async () => {
      const strapi = getStrapiFactory({
        dirs: { static: { public: publicDir } },
        log: { warn: jest.fn() },
      })();

      const row = {
        id: 2,
        key: 'plugin_i18n_default-locale',
        type: 'string',
        environment: null,
        tag: null,
        value: 'en',
      };

      await expect(enrichProjectSettingsForExport(strapi, row)).resolves.toBe(row);
    });

    test('does not add transfer buffers to other core-store rows in the configuration stream', async () => {
      const queryBuilder = createMockedQueryBuilder({
        'strapi::core-store': [
          {
            id: 1,
            key: 'plugin_i18n_default-locale',
            type: 'string',
            environment: null,
            tag: null,
            value: JSON.stringify('en'),
          },
          {
            id: 2,
            key: PROJECT_SETTINGS_CORE_STORE_KEY,
            type: 'object',
            environment: null,
            tag: null,
            value: JSON.stringify({ menuLogo: null, authLogo: null }),
          },
        ],
        'strapi::webhook': [{ id: 1, url: '/foo', headers: {}, events: [], enabled: true }],
      });

      const strapi = getStrapiFactory({
        db: { queryBuilder },
        dirs: { static: { public: publicDir } },
        log: { warn: jest.fn() },
      })();

      const results = await collect(createConfigurationStream(strapi));

      expect(results).toHaveLength(3);

      const unrelatedCoreStore = results.find(
        (item) => item.type === 'core-store' && item.value.key === 'plugin_i18n_default-locale'
      );
      expect(unrelatedCoreStore?.value.value).toBe('en');
      expect(JSON.stringify(unrelatedCoreStore?.value)).not.toContain('__transferBuffer');

      const webhook = results.find((item) => item.type === 'webhook');
      expect(webhook?.value.url).toBe('/foo');
    });

    test('export leaves null logos unchanged and does not read the filesystem', async () => {
      const strapi = getStrapiFactory({
        dirs: { static: { public: publicDir } },
        log: { warn: jest.fn() },
      })();

      const row = {
        ...createProjectSettingsRow(),
        value: { menuLogo: null, authLogo: null },
      };

      const exported = await enrichProjectSettingsForExport(strapi, row);

      expect(exported.value).toEqual({ menuLogo: null, authLogo: null });
    });

    test('export warns and skips buffer when the logo file is missing on disk', async () => {
      const warn = jest.fn();
      const strapi = getStrapiFactory({
        dirs: { static: { public: publicDir } },
        log: { warn },
      })();

      const row = {
        ...createProjectSettingsRow(),
        value: {
          menuLogo: {
            ...createLogo('menu'),
            url: '/uploads/does-not-exist.png',
            hash: 'does-not-exist',
          },
          authLogo: null,
        },
      };

      const exported = await enrichProjectSettingsForExport(strapi, row);

      expect(warn).toHaveBeenCalledWith(expect.stringContaining('no corresponding file was found'));
      expect(exported.value.menuLogo?.__transferBuffer).toBeUndefined();
      expect(exported.value.menuLogo?.url).toBe('/uploads/does-not-exist.png');
    });

    test('restore leaves logo metadata unchanged when no transfer buffer is present', async () => {
      const uploadStream = jest.fn();
      const strapi = getStrapiFactory({
        plugin: () => ({ provider: { uploadStream } }),
        config: { get: () => ({ provider: 'local' }) },
      })();

      const settings = {
        menuLogo: createLogo('menu'),
        authLogo: null,
      };

      const restored = await restoreProjectSettingsLogos(strapi, settings);

      expect(uploadStream).not.toHaveBeenCalled();
      expect(restored).toEqual(settings);
    });

    test('generic core-store restore does not invoke the upload provider', async () => {
      const uploadStream = jest.fn();
      const create = jest.fn((data) => data);
      const strapi = getStrapiFactory({
        db: { query: jest.fn(() => ({ create })) },
        plugin: () => ({ provider: { uploadStream } }),
      })();

      const config = {
        type: 'core-store' as const,
        value: {
          id: 1,
          key: 'plugin_i18n_default-locale',
          type: 'string',
          environment: null,
          tag: null,
          value: 'en',
        },
      };

      const result = await restoreConfigs(strapi, config);

      expect(uploadStream).not.toHaveBeenCalled();
      expect(JSON.parse(result.data.value)).toBe('en');
    });
  });
});
