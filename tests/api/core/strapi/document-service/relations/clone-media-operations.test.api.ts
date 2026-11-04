/**
 * Clone must treat user-submitted media operation payloads (set / connect / disconnect) as
 * replacements for the original entry's populated media, like it does for relations.
 */
import type { Core, UID } from '@strapi/types';

import { testInTransaction } from '../../../../utils';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');

let strapi: Core.Strapi;
const builder = createTestBuilder();

const ENTRY_UID = 'api::clone-media-entry.clone-media-entry' as UID.ContentType;
const BLOCK_UID = 'default.clone-media-block' as UID.Component;

type MediaFile = { id: number; documentId: string };
type MediaBlock = {
  image?: MediaFile | null;
  images?: MediaFile[] | null;
};
type MediaEntry = {
  documentId: string;
  cover?: MediaFile | null;
  gallery?: MediaFile[] | null;
  block?: MediaBlock | null;
  blocks?: MediaBlock[];
  sections?: Array<MediaBlock & { __component?: string }>;
};

const blockModel = {
  collectionName: 'components_clone_media_blocks',
  attributes: {
    image: { type: 'media', multiple: false },
    images: { type: 'media', multiple: true },
  },
  displayName: 'clone-media-block',
};

const entryModel = {
  attributes: {
    name: { type: 'string' },
    cover: { type: 'media', multiple: false },
    gallery: { type: 'media', multiple: true },
    block: { type: 'component', component: BLOCK_UID },
    blocks: { type: 'component', component: BLOCK_UID, repeatable: true },
    sections: { type: 'dynamiczone', components: [BLOCK_UID] },
  },
  draftAndPublish: true,
  displayName: 'Clone media entry',
  singularName: 'clone-media-entry',
  pluralName: 'clone-media-entries',
  description: '',
  collectionName: '',
};

const populate = {
  cover: true,
  gallery: true,
  block: { populate: { image: true, images: true } },
  blocks: { populate: { image: true, images: true } },
  sections: { on: { [BLOCK_UID]: { populate: { image: true, images: true } } } },
} as const;

const createFile = (name: string): Promise<MediaFile> =>
  strapi.db.query('plugin::upload.file').create({
    data: {
      name: `${name}.png`,
      hash: `${name}_hash`,
      ext: '.png',
      mime: 'image/png',
      size: 1,
      provider: 'local',
      url: `/uploads/${name}.png`,
      folderPath: '/',
    },
  });

const createFiles = async () => {
  const [a, b, c] = await Promise.all([createFile('a'), createFile('b'), createFile('c')]);
  return { a, b, c };
};

const createSource = async ({ a, c }: { a: MediaFile; c: MediaFile }) => {
  return (await strapi.documents(ENTRY_UID).create({
    data: {
      name: 'Source',
      cover: a.id,
      gallery: [a.id, c.id],
      block: { image: a.id, images: [a.id, c.id] },
      blocks: [{ image: a.id, images: [a.id] }],
      sections: [{ __component: BLOCK_UID, image: a.id, images: [a.id] }],
    } as any,
    populate,
  })) as unknown as MediaEntry;
};

const cloneSource = async (source: MediaEntry, data: Record<string, unknown>) => {
  const result = await strapi.documents(ENTRY_UID).clone({
    documentId: source.documentId,
    data: { name: 'Clone', ...data } as any,
  });

  return findEntry(result!.documentId);
};

const findEntry = async (documentId: string) =>
  (await strapi.documents(ENTRY_UID).findOne({
    documentId,
    status: 'draft',
    populate,
  })) as unknown as MediaEntry;

const ids = (files: MediaFile[] | null | undefined) => (files ?? []).map((file) => file.id);

const expectSourceUnchanged = async (source: MediaEntry, { a, c }: Record<string, MediaFile>) => {
  const reloaded = await findEntry(source.documentId);

  expect(reloaded.cover?.id).toBe(a.id);
  expect(ids(reloaded.gallery)).toEqual([a.id, c.id]);
  expect(reloaded.block?.image?.id).toBe(a.id);
  expect(ids(reloaded.block?.images)).toEqual([a.id, c.id]);
  expect(reloaded.blocks?.[0]?.image?.id).toBe(a.id);
  expect(ids(reloaded.sections?.[0]?.images)).toEqual([a.id]);
};

describe('Document Service clone media operation payloads', () => {
  beforeAll(async () => {
    await builder.addComponent(blockModel).addContentType(entryModel).build();

    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('single media at the root', () => {
    testInTransaction('applies a set by documentId', async () => {
      const files = await createFiles();
      const source = await createSource(files);

      const clone = await cloneSource(source, {
        cover: { set: [{ documentId: files.b.documentId }] },
      });

      expect(clone.cover?.id).toBe(files.b.id);
      await expectSourceUnchanged(source, files);
    });

    testInTransaction('applies a set by id', async () => {
      const files = await createFiles();
      const source = await createSource(files);

      const clone = await cloneSource(source, { cover: { set: [{ id: files.b.id }] } });

      expect(clone.cover?.id).toBe(files.b.id);
      await expectSourceUnchanged(source, files);
    });

    testInTransaction('applies a disconnect of the current file', async () => {
      const files = await createFiles();
      const source = await createSource(files);

      const clone = await cloneSource(source, {
        cover: { disconnect: [{ documentId: files.a.documentId }] },
      });

      expect(clone.cover ?? null).toBeNull();
      await expectSourceUnchanged(source, files);
    });

    testInTransaction('clears the media with an empty set', async () => {
      const files = await createFiles();
      const source = await createSource(files);

      const clone = await cloneSource(source, { cover: { set: [] } });

      expect(clone.cover ?? null).toBeNull();
      await expectSourceUnchanged(source, files);
    });

    testInTransaction('keeps the source media for empty operations', async () => {
      const files = await createFiles();
      const source = await createSource(files);

      const clone = await cloneSource(source, { cover: { connect: [], disconnect: [] } });

      expect(clone.cover?.id).toBe(files.a.id);
    });

    testInTransaction('keeps all source media when none is submitted', async () => {
      const files = await createFiles();
      const source = await createSource(files);

      const clone = await cloneSource(source, {});

      expect(clone.cover?.id).toBe(files.a.id);
      expect(ids(clone.gallery)).toEqual([files.a.id, files.c.id]);
      expect(clone.block?.image?.id).toBe(files.a.id);
      expect(ids(clone.block?.images)).toEqual([files.a.id, files.c.id]);
      expect(clone.blocks?.[0]?.image?.id).toBe(files.a.id);
      expect(ids(clone.sections?.[0]?.images)).toEqual([files.a.id]);
    });

    testInTransaction('applies a plain id and a plain documentId', async () => {
      const files = await createFiles();
      const source = await createSource(files);

      const byId = await cloneSource(source, { cover: files.b.id });
      const byDocumentId = await cloneSource(source, { cover: files.c.documentId });

      expect(byId.cover?.id).toBe(files.b.id);
      expect(byDocumentId.cover?.id).toBe(files.c.id);
      await expectSourceUnchanged(source, files);
    });
  });

  describe('multiple media at the root', () => {
    testInTransaction('applies a set', async () => {
      const files = await createFiles();
      const source = await createSource(files);

      const clone = await cloneSource(source, {
        gallery: { set: [{ documentId: files.b.documentId }] },
      });

      expect(ids(clone.gallery)).toEqual([files.b.id]);
      await expectSourceUnchanged(source, files);
    });
  });

  describe('media in components and dynamic zones', () => {
    testInTransaction('applies operations in a single component', async () => {
      const files = await createFiles();
      const source = await createSource(files);

      const clone = await cloneSource(source, {
        block: {
          image: { set: [{ documentId: files.b.documentId }] },
          images: { set: [{ documentId: files.b.documentId }] },
        },
      });

      expect(clone.block?.image?.id).toBe(files.b.id);
      expect(ids(clone.block?.images)).toEqual([files.b.id]);
      await expectSourceUnchanged(source, files);
    });

    testInTransaction('applies operations in a repeatable component', async () => {
      const files = await createFiles();
      const source = await createSource(files);

      const clone = await cloneSource(source, {
        blocks: [{ image: { set: [{ documentId: files.b.documentId }] } }],
      });

      expect(clone.blocks?.[0]?.image?.id).toBe(files.b.id);
      await expectSourceUnchanged(source, files);
    });

    testInTransaction('applies operations in a dynamic zone', async () => {
      const files = await createFiles();
      const source = await createSource(files);

      const clone = await cloneSource(source, {
        sections: [
          {
            __component: BLOCK_UID,
            images: { set: [{ documentId: files.b.documentId }] },
          },
        ],
      });

      expect(ids(clone.sections?.[0]?.images)).toEqual([files.b.id]);
      await expectSourceUnchanged(source, files);
    });
  });
});
