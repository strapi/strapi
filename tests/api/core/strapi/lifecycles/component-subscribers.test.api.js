'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');

let builder;
let strapi;

const block = {
  displayName: 'block',
  attributes: {
    name: {
      type: 'string',
    },
  },
};

const BLOCK_UID = 'default.block';

const page = {
  displayName: 'page-with-blocks',
  singularName: 'page-with-blocks',
  pluralName: 'page-with-blocks-list',
  draftAndPublish: true,
  attributes: {
    blocks: {
      type: 'component',
      component: BLOCK_UID,
      repeatable: true,
    },
  },
};

const PAGE_UID = 'api::page-with-blocks.page-with-blocks';

const blocksOf = async (documentId, status = 'draft') => {
  const entry = await strapi.documents(PAGE_UID).findOne({
    documentId,
    status,
    populate: ['blocks'],
  });

  return entry.blocks;
};

describe('Lifecycle subscribers on components', () => {
  const unsubscribers = [];

  const subscribe = (subscriber) => {
    unsubscribers.push(strapi.db.lifecycles.subscribe(subscriber));
  };

  beforeAll(async () => {
    builder = createTestBuilder();

    await builder.addComponent(block).addContentType(page).build();

    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  afterEach(() => {
    unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
  });

  test('A subscriber to the update of a component receives one event per component on a save that changes nothing', async () => {
    const afterUpdate = jest.fn();
    subscribe({ models: [BLOCK_UID], afterUpdate });

    const { documentId } = await strapi.documents(PAGE_UID).create({
      data: { blocks: [{ name: 'one' }, { name: 'two' }] },
    });
    const blocks = await blocksOf(documentId);

    await strapi.documents(PAGE_UID).update({
      documentId,
      data: { blocks: blocks.map(({ id, name }) => ({ id, name })) },
    });

    expect(afterUpdate).toHaveBeenCalledTimes(2);
    expect(afterUpdate.mock.calls.map(([event]) => event.result.id).sort()).toEqual(
      blocks.map(({ id }) => id).sort()
    );
  });

  test('A subscriber that listens to every model does not receive delete-many events for components', async () => {
    const afterDeleteMany = jest.fn((event) => {
      if (event.model.uid === BLOCK_UID) {
        throw new Error('a subscriber that was never called for components');
      }
    });
    subscribe({ afterDeleteMany });

    const { documentId } = await strapi.documents(PAGE_UID).create({
      data: { blocks: [{ name: 'one' }, { name: 'two' }] },
    });
    await strapi.documents(PAGE_UID).publish({ documentId });
    const firstPublished = await blocksOf(documentId, 'published');

    // The second publish replaces the published row, components included
    await expect(strapi.documents(PAGE_UID).publish({ documentId })).resolves.toBeDefined();

    const secondPublished = await blocksOf(documentId, 'published');
    expect(secondPublished.map(({ name }) => name)).toEqual(['one', 'two']);
    expect(secondPublished.map(({ id }) => id)).not.toEqual(firstPublished.map(({ id }) => id));
    for (const { id } of firstPublished) {
      await expect(strapi.db.query(BLOCK_UID).findOne({ where: { id } })).resolves.toBeNull();
    }

    await expect(strapi.documents(PAGE_UID).delete({ documentId })).resolves.toBeDefined();
    expect(afterDeleteMany.mock.calls.map(([event]) => event.model.uid)).not.toContain(BLOCK_UID);
  });
});
