import { join } from 'path';
import { writeFile, mkdir, rm, readFile, access } from 'fs/promises';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';

import type { LoadedStrapi } from '@strapi/types';
import { strapi as dataTransfer } from '@strapi/data-transfer';

import { createStrapiInstance } from 'api-tests/strapi';

const { createLocalStrapiSourceProvider, createLocalStrapiDestinationProvider } =
  dataTransfer.providers;

const CONTENT_STRUCTURE_FILE_NAME = 'groups.json';

const groupsFile = {
  version: 1,
  sections: {
    collectionTypes: {
      groups: [
        {
          parent: null,
          name: 'Content',
          id: 'grp_root01',
          children: [
            { type: 'group', id: 'grp_child1' },
            { type: 'contentType', uid: 'api::article.article' },
          ],
        },
        {
          parent: 'grp_root01',
          name: 'Nested',
          id: 'grp_child1',
          children: [],
        },
      ],
    },
    singleTypes: { groups: [] },
  },
};

let strapi: LoadedStrapi;
let contentStructureDir: string;
let groupsPath: string;

const writeGroupsFile = async (value: unknown) => {
  return await writeFile(groupsPath, JSON.stringify(value, null, 2), 'utf8');
};
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

const findContentStructure = (items: any[]) =>
  items.find((item) => item.type === 'content-structure');

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

describe('Data transfer | content-structure groups.json', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    contentStructureDir = strapi.dirs.app.contentStructure;
    groupsPath = join(contentStructureDir, CONTENT_STRUCTURE_FILE_NAME);
    await mkdir(contentStructureDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(groupsPath, { force: true });
    await strapi.destroy();
  });

  afterEach(async () => {
    await rm(groupsPath, { force: true });
  });

  test('export emits the on-disk groups.json as a content-structure configuration item', async () => {
    await writeGroupsFile(groupsFile);

    const contentStructure = findContentStructure(await collectExportedConfiguration());

    expect(contentStructure).toBeDefined();
    expect(contentStructure.value).toEqual(groupsFile);
  });

  test('no content-structure item is emitted when groups.json is absent', async () => {
    await rm(groupsPath, { force: true });

    const contentStructure = findContentStructure(await collectExportedConfiguration());

    expect(contentStructure).toBeUndefined();
  });

  test('restore writes the transferred groups.json back to disk (DTS round-trip)', async () => {
    // Export from a source that has the folder tree...
    await writeGroupsFile(groupsFile);
    const contentStructure = findContentStructure(await collectExportedConfiguration());
    expect(contentStructure).toBeDefined();

    // ...simulate a clean destination by removing the file...
    await rm(groupsPath, { force: true });
    await expect(access(groupsPath)).rejects.toThrow();

    // ...then restore it through the real destination provider.
    await restoreConfiguration(contentStructure);

    await expect(access(groupsPath)).resolves.toBeUndefined();
    const restored = JSON.parse(await readFile(groupsPath, 'utf8'));
    expect(restored).toEqual(groupsFile);
  });
});
