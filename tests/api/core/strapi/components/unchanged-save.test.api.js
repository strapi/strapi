'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');

let builder;
let strapi;

const block = {
  displayName: 'timed-block',
  attributes: {
    name: {
      type: 'string',
    },
    clock: {
      type: 'time',
    },
  },
};

const BLOCK_UID = 'default.timed-block';

const page = {
  displayName: 'page-with-timed-blocks',
  singularName: 'page-with-timed-blocks',
  pluralName: 'page-with-timed-blocks-list',
  attributes: {
    blocks: {
      type: 'component',
      component: BLOCK_UID,
      repeatable: true,
    },
  },
};

const PAGE_UID = 'api::page-with-timed-blocks.page-with-timed-blocks';

describe('Saving an entry whose components did not change', () => {
  let documentId;
  let update;

  const storedBlocks = async () => {
    const entry = await strapi.documents(PAGE_UID).findOne({ documentId, populate: ['blocks'] });

    return entry.blocks.map(({ id, name, clock }) => ({ id, name, clock }));
  };

  beforeAll(async () => {
    builder = createTestBuilder();

    await builder.addComponent(block).addContentType(page).build();

    strapi = await createStrapiInstance();

    ({ documentId } = await strapi.documents(PAGE_UID).create({
      data: {
        blocks: [
          { name: 'one', clock: '10:30:00.000' },
          { name: 'two', clock: '11:00:00.000' },
        ],
      },
    }));

    // Repositories are cached by uid, so the spy sees the writes of the document service
    update = jest.spyOn(strapi.db.query(BLOCK_UID), 'update');
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  afterEach(() => {
    update.mockClear();
  });

  test('The components are not written again when they are sent as they are stored', async () => {
    const blocks = await storedBlocks();

    const entry = await strapi.documents(PAGE_UID).update({
      documentId,
      data: { blocks },
      populate: ['blocks'],
    });

    expect(update).not.toHaveBeenCalled();
    expect(entry.blocks.map(({ id }) => id)).toEqual(blocks.map(({ id }) => id));
  });

  test('Only the component whose data changed is written', async () => {
    const [first, second] = await storedBlocks();

    await strapi.documents(PAGE_UID).update({
      documentId,
      data: { blocks: [first, { ...second, name: 'two updated' }] },
    });

    expect(update).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: second.id } }));
    await expect(storedBlocks()).resolves.toMatchObject([
      first,
      { ...second, name: 'two updated' },
    ]);
  });

  test('A time the database would not store is rejected, even when nothing else changed', async () => {
    const [first, second] = await storedBlocks();

    await expect(
      strapi.documents(PAGE_UID).update({
        documentId,
        data: { blocks: [{ ...first, clock: '10:30' }, second] },
      })
    ).rejects.toThrow('Invalid time format, expected HH:mm:ss.SSS');
  });
});
