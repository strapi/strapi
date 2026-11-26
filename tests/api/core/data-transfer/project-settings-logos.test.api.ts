import { join } from 'path';
import { writeFile, mkdir, rm, readFile, access } from 'fs/promises';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

import type { LoadedStrapi } from '@strapi/types';
import { strapi as dataTransfer } from '@strapi/data-transfer';

import { createStrapiInstance } from 'api-tests/strapi';

const { createLocalStrapiSourceProvider, createLocalStrapiDestinationProvider } =
  dataTransfer.providers;

const PROJECT_SETTINGS_KEY = 'core_admin_project-settings';
const LOGO_FILENAME = 'menu_logo_integration.png';

const menuLogoBytes = Buffer.from('integration-menu-logo');

const menuLogo = {
  name: 'menu-logo.png',
  hash: 'menu_logo_integration',
  url: `/uploads/${LOGO_FILENAME}`,
  width: 100,
  height: 100,
  ext: '.png',
  size: menuLogoBytes.length,
  provider: 'local',
  mime: 'image/png',
};

let strapi: LoadedStrapi;
let uploadsDir: string;
let logoPath: string;

const setProjectSettings = (value: unknown) =>
  strapi.store({ type: 'core', name: 'admin' }).set({ key: 'project-settings', value });

const getPersistedProjectSettings = async () => {
  const row = await strapi.db
    .query('strapi::core-store')
    .findOne({ where: { key: PROJECT_SETTINGS_KEY } });

  return JSON.parse(row.value);
};

// Run the real local-source configuration export against the booted instance and
// collect the streamed items (reads logo bytes from disk via the real upload provider config).
const collectExportedConfiguration = async () => {
  const source = createLocalStrapiSourceProvider({
    getStrapi: async () => strapi,
    autoDestroy: false,
  });

  await source.bootstrap();

  try {
    const items: any[] = [];
    for await (const item of source.createConfigurationReadStream()) {
      items.push(item);
    }
    return items;
  } finally {
    await source.close();
  }
};

const findProjectSettings = (items: any[]) =>
  items.find((item) => item.type === 'core-store' && item.value?.key === PROJECT_SETTINGS_KEY);

// Run the real local-destination configuration restore against the booted instance.
const restoreConfiguration = async (item: any) => {
  const destination = createLocalStrapiDestinationProvider({
    getStrapi: async () => strapi,
    autoDestroy: false,
    strategy: 'restore',
    restore: { configuration: { coreStore: false, webhook: false } },
  });

  await destination.bootstrap();

  try {
    const writeStream = await destination.createConfigurationWriteStream();
    await pipeline(Readable.from([item]), writeStream);
  } finally {
    await destination.close();
  }
};

describe('Data transfer | admin project-settings logos', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    uploadsDir = join(strapi.dirs.static.public, 'uploads');
    logoPath = join(uploadsDir, LOGO_FILENAME);
    await mkdir(uploadsDir, { recursive: true });
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  beforeEach(async () => {
    await writeFile(logoPath, menuLogoBytes);
    await setProjectSettings({ menuLogo, authLogo: null });
  });

  afterEach(async () => {
    await rm(logoPath, { force: true });
    await setProjectSettings({ menuLogo: null, authLogo: null });
  });

  test('export embeds the on-disk logo file contents in the configuration stream', async () => {
    const items = await collectExportedConfiguration();
    const projectSettings = findProjectSettings(items);

    expect(projectSettings).toBeDefined();
    expect(projectSettings.value.value.menuLogo.__transferBuffer).toBe(
      menuLogoBytes.toString('base64')
    );
    expect(projectSettings.value.value.authLogo).toBeNull();
  });

  test('restore re-uploads the logo through the upload provider and strips the transfer buffer', async () => {
    const projectSettings = findProjectSettings(await collectExportedConfiguration());

    // Simulate a clean destination: drop the existing core-store row and the file on disk.
    await strapi.db.query('strapi::core-store').delete({ where: { key: PROJECT_SETTINGS_KEY } });
    await rm(logoPath, { force: true });

    await restoreConfiguration(projectSettings);

    // The real local upload provider wrote the file back to disk with the original bytes.
    await expect(access(logoPath)).resolves.toBeUndefined();
    await expect(readFile(logoPath)).resolves.toEqual(menuLogoBytes);

    // The persisted core-store value keeps the logo metadata but never the transfer-only buffer.
    const persisted = await getPersistedProjectSettings();
    expect(persisted.menuLogo.__transferBuffer).toBeUndefined();
    expect(persisted.menuLogo.url).toBe(`/uploads/${LOGO_FILENAME}`);
    expect(persisted.menuLogo.provider).toBe('local');
    expect(persisted.authLogo).toBeNull();
  });

  test('restore re-uploads to a non-local destination provider, persisting its url, provider and a reconstructed mime', async () => {
    const projectSettings = findProjectSettings(await collectExportedConfiguration());

    await strapi.db.query('strapi::core-store').delete({ where: { key: PROJECT_SETTINGS_KEY } });
    await rm(logoPath, { force: true });

    // Swap in a stub remote provider (e.g. S3/Cloudinary) on the live instance so the real
    // restore wiring (config stream, core-store persistence) runs against a non-local provider
    // without requiring real remote infrastructure.
    const uploadPlugin = strapi.plugin('upload');
    const originalProvider = uploadPlugin.provider;
    const originalProviderName = strapi.config.get('plugin::upload.provider');

    const remoteUploads: Array<{ provider?: string; mime?: string; hash?: string }> = [];
    uploadPlugin.provider = {
      ...originalProvider,
      async uploadStream(file: any) {
        remoteUploads.push({ provider: file.provider, mime: file.mime, hash: file.hash });
        file.url = `https://cdn.example.com/${file.hash}${file.ext}`;
      },
    };
    strapi.config.set('plugin::upload.provider', 'aws-s3');

    try {
      await restoreConfiguration(projectSettings);
    } finally {
      uploadPlugin.provider = originalProvider;
      strapi.config.set('plugin::upload.provider', originalProviderName);
    }

    // The destination provider received the destination provider name and a reconstructed
    // Content-Type (admin logos do not persist mime), so remote storage serves a real image.
    expect(remoteUploads).toHaveLength(1);
    expect(remoteUploads[0]).toMatchObject({ provider: 'aws-s3', mime: 'image/png' });

    // Persisted metadata reflects the destination provider and the URL it returned — not the
    // stale local `/uploads/...` path that caused the broken-image bug on remote storage.
    const persisted = await getPersistedProjectSettings();
    expect(persisted.menuLogo.__transferBuffer).toBeUndefined();
    expect(persisted.menuLogo.provider).toBe('aws-s3');
    expect(persisted.menuLogo.url).toBe('https://cdn.example.com/menu_logo_integration.png');
    // No file should have been written to local disk for a remote provider.
    await expect(access(logoPath)).rejects.toThrow();
  });
});
