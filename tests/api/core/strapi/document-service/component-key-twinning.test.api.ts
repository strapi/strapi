'use strict';

/**
 * Best-effort twinning of componentKey across existing draft/published pairs.
 * @see packages/core/database/src/migrations/internal-migrations/5.0.0-08-component-key-twinning.ts
 */

const path = require('path');
const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { twinComponentKeys } = require(
  path.join(
    __dirname,
    '../../../../../packages/core/database/dist/migrations/internal-migrations/5.0.0-08-component-key-twinning'
  )
);

const builder = createTestBuilder();
let strapi;

const component = {
  displayName: 'twin-compo',
  attributes: {
    name: {
      type: 'string',
    },
  },
};

const ct = {
  displayName: 'with-twin-compo',
  singularName: 'with-twin-compo',
  pluralName: 'with-twin-compos',
  draftAndPublish: true,
  attributes: {
    title: {
      type: 'string',
    },
    blocks: {
      type: 'component',
      component: 'default.twin-compo',
      repeatable: true,
    },
  },
};

const UID = 'api::with-twin-compo.with-twin-compo';

describe('componentKey twinning migration', () => {
  beforeAll(async () => {
    await builder.addComponent(component).addContentType(ct).build();
    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('aligns divergent draft/published componentKeys without re-publish', async () => {
    const created = await strapi.documents(UID).create({
      data: {
        title: 'twin-me',
        blocks: [{ name: 'a' }, { name: 'b' }],
      },
      populate: ['blocks'],
    });

    await strapi.documents(UID).publish({ documentId: created.documentId });

    const draft = await strapi.documents(UID).findOne({
      documentId: created.documentId,
      status: 'draft',
      populate: ['blocks'],
    });
    const published = await strapi.documents(UID).findOne({
      documentId: created.documentId,
      status: 'published',
      populate: ['blocks'],
    });

    // Sanity: publish already shared keys
    expect(published.blocks.map((b) => b.componentKey).sort()).toEqual(
      draft.blocks.map((b) => b.componentKey).sort()
    );

    // Simulate a 5.0.0-07 backfill where each status row got a unique key
    const publishedTable = strapi.db.metadata.get('default.twin-compo').tableName;
    await strapi.db
      .connection(publishedTable)
      .where({ id: published.blocks[0].id })
      .update({ component_key: 'force-divergent-key-aaa' });
    await strapi.db
      .connection(publishedTable)
      .where({ id: published.blocks[1].id })
      .update({ component_key: 'force-divergent-key-bbb' });

    const before = await strapi.documents(UID).findOne({
      documentId: created.documentId,
      status: 'published',
      populate: ['blocks'],
    });
    expect(before.blocks.map((b) => b.componentKey).sort()).not.toEqual(
      draft.blocks.map((b) => b.componentKey).sort()
    );

    await twinComponentKeys(strapi.db.connection, strapi.db);

    const afterDraft = await strapi.documents(UID).findOne({
      documentId: created.documentId,
      status: 'draft',
      populate: ['blocks'],
    });
    const afterPublished = await strapi.documents(UID).findOne({
      documentId: created.documentId,
      status: 'published',
      populate: ['blocks'],
    });

    expect(afterPublished.blocks.map((b) => b.componentKey).sort()).toEqual(
      afterDraft.blocks.map((b) => b.componentKey).sort()
    );
    // Draft keys are the source of truth (copied onto published)
    expect(afterPublished.blocks.map((b) => b.componentKey).sort()).toEqual(
      draft.blocks.map((b) => b.componentKey).sort()
    );
  });
});
