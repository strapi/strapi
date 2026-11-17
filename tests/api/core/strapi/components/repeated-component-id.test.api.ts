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
    hero: { type: 'component', component: BLOCK_UID, repeatable: false },
  },
};

type Row = { id: number; label?: string; name?: string; __component?: string; inner?: Row[] };
type Page = {
  documentId: string;
  title: string;
  items: Row[];
  zone: Row[];
  blocks: Row[];
  hero: Row;
};
type Response = { statusCode: number; body: Record<string, any> };
type Request = (options: Record<string, unknown>) => Promise<Response>;

const builder = createTestBuilder();
let strapi: Core.Strapi;
let rqContent: Request;
let rqAdmin: Request;
let graphqlQuery: (body: Record<string, unknown>) => Promise<Response>;

const populate = {
  items: true,
  zone: { on: { [ITEM_UID]: true, [BLOCK_UID]: { populate: { inner: true } } } },
  blocks: { populate: { inner: true } },
  hero: { populate: { inner: true } },
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
      hero: { name: 'h', inner: [{ label: 'h1' }, { label: 'h2' }] },
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
  [
    'a list nested in a single component',
    (page) => ({
      hero: {
        id: page.hero.id,
        inner: [
          { id: page.hero.inner![0].id, label: 'dup-1' },
          { id: page.hero.inner![0].id, label: 'dup-2' },
        ],
      },
    }),
    ['hero', 'inner', '1', 'id'],
  ],
];

/**
 * A component sent without an id is created, and creating a component drops the ids nested in
 * it. So repeated ids inside it lose no data, and the update is accepted as before.
 */
const createdComponentCases: Array<[string, (page: Page) => Record<string, unknown>]> = [
  [
    'a new item of a repeatable component',
    (page) => ({
      blocks: [
        {
          name: 'new',
          inner: [
            { id: page.blocks[0].inner![0].id, label: 'copy-1' },
            { id: page.blocks[0].inner![0].id, label: 'copy-2' },
          ],
        },
      ],
    }),
  ],
  [
    'a new single component',
    (page) => ({
      hero: {
        name: 'new',
        inner: [
          { id: page.hero.inner![0].id, label: 'copy-1' },
          { id: page.hero.inner![0].id, label: 'copy-2' },
        ],
      },
    }),
  ],
  [
    'a new item of a dynamic zone',
    (page) => ({
      zone: [
        {
          __component: BLOCK_UID,
          name: 'new',
          inner: [
            { id: page.blocks[0].inner![0].id, label: 'copy-1' },
            { id: page.blocks[0].inner![0].id, label: 'copy-2' },
          ],
        },
      ],
    }),
  ],
];

/**
 * Create and delete one row of a component type, and return the id it was given.
 * Ids are not reused, so this moves the next id of that type forward.
 */
const takeNextId = async (uid: typeof ITEM_UID | typeof BLOCK_UID) => {
  const row = await strapi.db.query(uid).create({ data: {} });
  await strapi.db.query(uid).delete({ where: { id: row.id } });

  return row.id as number;
};

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
    graphqlQuery = (body) => rqAdmin({ url: '/graphql', method: 'POST', body });
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

  describe('GraphQL update', () => {
    test('answers BAD_USER_INPUT for a repeated id in a repeatable component', async () => {
      const page = await seedPage();

      const res = await graphqlQuery({
        query: /* GraphQL */ `
          mutation UpdatePage($documentId: ID!, $data: RciPageInput!) {
            updateRciPage(documentId: $documentId, data: $data) {
              documentId
            }
          }
        `,
        variables: {
          documentId: page.documentId,
          data: {
            items: [
              { id: page.items[0].id, label: 'dup-1' },
              { id: page.items[0].id, label: 'dup-2' },
            ],
          },
        },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual({ updateRciPage: null });
      expect(res.body.errors).toMatchObject([
        {
          message: `The component id ${page.items[0].id} appears more than once in items`,
          extensions: { code: 'BAD_USER_INPUT' },
        },
      ]);
      expect(await findPage(page.documentId)).toEqual(page);
    });
  });

  describe('unchanged behaviour', () => {
    test.each(createdComponentCases)(
      'accepts repeated ids nested in %s, which is created',
      async (_, buildData) => {
        const page = await seedPage();
        const copiedId = page.blocks[0].inner![0].id;

        const res = await rqContent({
          method: 'PUT',
          url: `/rci-pages/${page.documentId}`,
          body: { data: buildData(page) },
        });

        expect(res.statusCode).toBe(200);
        const stored = await findPage(page.documentId);
        const created = [...stored.blocks, ...stored.zone, stored.hero].find(
          (component) => component.name === 'new'
        );
        expect(labels(created!.inner!)).toEqual(['copy-1', 'copy-2']);
        expect(created!.inner!.map((inner) => inner.id)).not.toContain(copiedId);
      }
    );

    test('the same id under two component types of a dynamic zone is accepted', async () => {
      // Each component type has its own table, so give the next item and the next block the
      // same id
      let itemId = await takeNextId(ITEM_UID);
      let blockId = await takeNextId(BLOCK_UID);
      while (itemId < blockId) {
        itemId = await takeNextId(ITEM_UID);
      }
      while (blockId < itemId) {
        blockId = await takeNextId(BLOCK_UID);
      }

      const created = await strapi.documents(PAGE_UID).create({
        data: {
          title: 'zone',
          zone: [
            { __component: ITEM_UID, label: 'z1' },
            { __component: BLOCK_UID, name: 'zb' },
          ],
        },
      } as any);
      const page = await findPage(created.documentId);
      const [item, block] = page.zone;
      expect(item.id).toBe(block.id);

      const res = await rqContent({
        method: 'PUT',
        url: `/rci-pages/${page.documentId}`,
        body: {
          data: {
            zone: [
              { __component: BLOCK_UID, id: block.id, name: 'zb updated' },
              { __component: ITEM_UID, id: item.id, label: 'z1 updated' },
            ],
          },
        },
      });

      expect(res.statusCode).toBe(200);
      const stored = await findPage(page.documentId);
      expect(stored.zone).toMatchObject([
        { __component: BLOCK_UID, id: block.id, name: 'zb updated' },
        { __component: ITEM_UID, id: item.id, label: 'z1 updated' },
      ]);
    });

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
