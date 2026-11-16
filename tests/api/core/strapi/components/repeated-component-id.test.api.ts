import type { Core } from '@strapi/types';

import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest, createContentAPIRequest } from 'api-tests/request';
import { createTestBuilder } from 'api-tests/builder';

/**
 * An update that sends the same component id twice in one list used to answer success, update
 * that row twice, and keep one row holding the last copy's values: the first copy was lost.
 * It must be rejected with a 400 naming the list, and leave the entry unchanged.
 */

const PAGE_UID = 'api::rci-page.rci-page';
const ITEM_UID = 'rci.item';
const BLOCK_UID = 'rci.block';

const itemComponent = {
  displayName: 'item',
  category: 'rci',
  attributes: {
    label: { type: 'string' },
  },
};

const innerComponent = {
  displayName: 'inner',
  category: 'rci',
  attributes: {
    label: { type: 'string' },
  },
};

const blockComponent = {
  displayName: 'block',
  category: 'rci',
  attributes: {
    name: { type: 'string' },
    inner: { type: 'component', component: 'rci.inner', repeatable: true },
  },
};

const pageModel = {
  kind: 'collectionType',
  displayName: 'rci-page',
  singularName: 'rci-page',
  pluralName: 'rci-pages',
  draftAndPublish: false,
  attributes: {
    title: { type: 'string' },
    items: { type: 'component', component: ITEM_UID, repeatable: true },
    zone: { type: 'dynamiczone', components: [ITEM_UID, BLOCK_UID] },
    blocks: { type: 'component', component: BLOCK_UID, repeatable: true },
  },
};

type Row = { id: number; label?: string; name?: string; __component?: string; inner?: Row[] };
type Page = { documentId: string; title: string; items: Row[]; zone: Row[]; blocks: Row[] };
type Response = { statusCode: number; body: Record<string, any> };
type Request = (options: Record<string, unknown>) => Promise<Response>;

const builder = createTestBuilder();
let strapi: Core.Strapi;
let rqContent: Request;
let rqAdmin: Request;

const populate = {
  items: true,
  zone: { on: { [ITEM_UID]: true, [BLOCK_UID]: { populate: { inner: true } } } },
  blocks: { populate: { inner: true } },
} as const;

const findPage = async (documentId: string) => {
  return (await strapi
    .documents(PAGE_UID)
    .findOne({ documentId, populate } as any)) as unknown as Page;
};

const seedPage = async () => {
  const created = await strapi.documents(PAGE_UID).create({
    data: {
      title: 'page',
      items: [{ label: 'i1' }, { label: 'i2' }],
      zone: [
        { __component: ITEM_UID, label: 'z1' },
        { __component: ITEM_UID, label: 'z2' },
      ],
      blocks: [
        { name: 'b1', inner: [{ label: 'n1' }, { label: 'n2' }] },
        { name: 'b2', inner: [{ label: 'n3' }] },
      ],
    },
  } as any);

  return findPage(created.documentId);
};

const labels = (rows: Row[]) => rows.map((row) => row.label ?? row.name);

/**
 * Each case builds an update payload from the seeded page and names the path of the repeated id.
 */
const repeatedIdCases: Array<[string, (page: Page) => Record<string, unknown>, string[]]> = [
  [
    'a repeatable component',
    (page) => ({
      items: [
        { id: page.items[0].id, label: 'dup-1' },
        { id: page.items[0].id, label: 'dup-2' },
      ],
    }),
    ['items', '1', 'id'],
  ],
  [
    'a repeatable component, as a number and as a string',
    (page) => ({
      items: [
        { id: page.items[0].id, label: 'dup-1' },
        { id: `${page.items[0].id}`, label: 'dup-2' },
      ],
    }),
    ['items', '1', 'id'],
  ],
  [
    'a dynamic zone',
    (page) => ({
      zone: [
        { __component: ITEM_UID, id: page.zone[0].id, label: 'dup-1' },
        { __component: ITEM_UID, id: page.zone[0].id, label: 'dup-2' },
      ],
    }),
    ['zone', '1', 'id'],
  ],
  [
    'the outer list of a nested repeatable component',
    (page) => ({
      blocks: [
        { id: page.blocks[0].id, name: 'dup-1' },
        { id: page.blocks[0].id, name: 'dup-2' },
      ],
    }),
    ['blocks', '1', 'id'],
  ],
  [
    'the inner list of a nested repeatable component',
    (page) => ({
      blocks: [
        {
          id: page.blocks[0].id,
          inner: [
            { id: page.blocks[0].inner![0].id, label: 'dup-1' },
            { id: page.blocks[0].inner![0].id, label: 'dup-2' },
          ],
        },
        { id: page.blocks[1].id },
      ],
    }),
    ['blocks', '0', 'inner', '1', 'id'],
  ],
];

const expectedError = (path: string[]) => ({
  name: 'ValidationError',
  details: { errors: [expect.objectContaining({ path, name: 'ValidationError' })] },
});

describe('Repeated component id in one list', () => {
  beforeAll(async () => {
    await builder
      .addComponent(itemComponent)
      .addComponent(innerComponent)
      .addComponent(blockComponent)
      .addContentType(pageModel)
      .build();

    strapi = await createStrapiInstance();
    rqContent = await createContentAPIRequest({ strapi });
    rqAdmin = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Document Service update', () => {
    test.each(repeatedIdCases)('rejects a repeated id in %s', async (_, buildData, path) => {
      const page = await seedPage();

      await expect(
        strapi.documents(PAGE_UID).update({
          documentId: page.documentId,
          data: buildData(page),
        } as any)
      ).rejects.toMatchObject(expectedError(path));

      expect(await findPage(page.documentId)).toEqual(page);
    });
  });

  describe('REST PUT', () => {
    test.each(repeatedIdCases)(
      'answers 400 for a repeated id in %s',
      async (_, buildData, path) => {
        const page = await seedPage();

        const res = await rqContent({
          method: 'PUT',
          url: `/rci-pages/${page.documentId}`,
          body: { data: buildData(page) },
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toMatchObject({ status: 400, ...expectedError(path) });
        expect(await findPage(page.documentId)).toEqual(page);
      }
    );
  });

  describe('Content Manager PUT', () => {
    test.each(repeatedIdCases)(
      'answers 400 for a repeated id in %s',
      async (_, buildData, path) => {
        const page = await seedPage();

        const res = await rqAdmin({
          method: 'PUT',
          url: `/content-manager/collection-types/${PAGE_UID}/${page.documentId}`,
          body: buildData(page),
        });

        expect(res.statusCode).toBe(400);
        expect(res.body.error).toMatchObject({ status: 400, ...expectedError(path) });
        expect(await findPage(page.documentId)).toEqual(page);
      }
    );
  });

  describe('unchanged behaviour', () => {
    test('distinct ids keep and update each row', async () => {
      const page = await seedPage();

      const res = await rqContent({
        method: 'PUT',
        url: `/rci-pages/${page.documentId}`,
        body: {
          data: {
            items: [
              { id: page.items[1].id, label: 'second' },
              { id: page.items[0].id, label: 'first' },
            ],
          },
        },
      });

      expect(res.statusCode).toBe(200);
      const stored = await findPage(page.documentId);
      expect(stored.items).toEqual([
        { id: page.items[1].id, label: 'second' },
        { id: page.items[0].id, label: 'first' },
      ]);
    });

    test('the same content without ids creates one row per item', async () => {
      const page = await seedPage();

      const res = await rqContent({
        method: 'PUT',
        url: `/rci-pages/${page.documentId}`,
        body: { data: { items: [{ label: 'same' }, { label: 'same' }] } },
      });

      expect(res.statusCode).toBe(200);
      const stored = await findPage(page.documentId);
      expect(labels(stored.items)).toEqual(['same', 'same']);
      expect(new Set(stored.items.map((item) => item.id)).size).toBe(2);
    });

    test('the same id in two different lists is checked per list', async () => {
      const page = await seedPage();

      // Each id belongs to its own list, so sending each one once per list is valid
      const res = await rqContent({
        method: 'PUT',
        url: `/rci-pages/${page.documentId}`,
        body: {
          data: {
            items: [{ id: page.items[0].id, label: 'kept' }],
            blocks: [
              { id: page.blocks[0].id, inner: [{ id: page.blocks[0].inner![0].id }] },
              { id: page.blocks[1].id, inner: [{ id: page.blocks[1].inner![0].id }] },
            ],
          },
        },
      });

      expect(res.statusCode).toBe(200);
      const stored = await findPage(page.documentId);
      expect(labels(stored.items)).toEqual(['kept']);
      expect(stored.blocks.map((block) => labels(block.inner!))).toEqual([['n1'], ['n3']]);
    });

    test('create drops the ids it is sent and keeps every item', async () => {
      const page = await seedPage();

      const res = await rqContent({
        method: 'POST',
        url: '/rci-pages',
        body: {
          data: {
            title: 'created',
            items: [
              { id: page.items[0].id, label: 'dup-1' },
              { id: page.items[0].id, label: 'dup-2' },
            ],
          },
        },
      });

      expect(res.statusCode).toBe(201);
      const stored = await findPage(res.body.data.documentId);
      expect(labels(stored.items)).toEqual(['dup-1', 'dup-2']);
      expect(stored.items.map((item) => item.id)).not.toContain(page.items[0].id);
    });
  });
});
