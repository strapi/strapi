'use strict';

/**
 * Durable componentKey across Draft & Publish.
 * @see docs/docs/rfcs/03-component-key.md
 */

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest, createContentAPIRequest } = require('api-tests/request');

const builder = createTestBuilder();

let strapi;
let rq;

const nestedComponent = {
  displayName: 'key-nested',
  attributes: {
    label: {
      type: 'string',
    },
  },
};

const component = {
  displayName: 'key-compo',
  attributes: {
    name: {
      type: 'string',
    },
    nested: {
      type: 'component',
      component: 'default.key-nested',
      repeatable: false,
    },
  },
};

const dzComponent = {
  displayName: 'key-dz',
  attributes: {
    heading: {
      type: 'string',
    },
  },
};

const ct = {
  displayName: 'with-key-compo',
  singularName: 'with-key-compo',
  pluralName: 'with-key-compos',
  draftAndPublish: true,
  attributes: {
    title: {
      type: 'string',
    },
    blocks: {
      type: 'component',
      component: 'default.key-compo',
      repeatable: true,
    },
    zones: {
      type: 'dynamiczone',
      components: ['default.key-dz', 'default.key-compo'],
    },
  },
};

const UID = 'api::with-key-compo.with-key-compo';
const populate = {
  blocks: { populate: ['nested'] },
  zones: {
    on: {
      'default.key-dz': true,
      'default.key-compo': { populate: ['nested'] },
    },
  },
};

describe('Document Service — componentKey', () => {
  beforeAll(async () => {
    await builder
      .addComponent(nestedComponent)
      .addComponent(component)
      .addComponent(dzComponent)
      .addContentType(ct)
      .build();

    strapi = await createStrapiInstance();
    await createAuthRequest({ strapi });
    rq = await createContentAPIRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('assigns componentKey on create and preserves it across publish', async () => {
    const created = await strapi.documents(UID).create({
      data: {
        title: 'hello',
        blocks: [{ name: 'a' }, { name: 'b' }],
      },
      populate: ['blocks'],
    });

    expect(created.blocks).toHaveLength(2);
    expect(created.blocks[0].componentKey).toEqual(expect.any(String));
    expect(created.blocks[1].componentKey).toEqual(expect.any(String));
    expect(created.blocks[0].componentKey).not.toBe(created.blocks[1].componentKey);

    const draftKeys = created.blocks.map((b) => b.componentKey);

    await strapi.documents(UID).publish({
      documentId: created.documentId,
    });

    const published = await strapi.documents(UID).findOne({
      documentId: created.documentId,
      status: 'published',
      populate: ['blocks'],
    });

    expect(published.blocks.map((b) => b.componentKey).sort()).toEqual([...draftKeys].sort());
    // Row ids differ across status even when keys match
    const publishedByKey = Object.fromEntries(published.blocks.map((b) => [b.componentKey, b.id]));
    const draftByKey = Object.fromEntries(created.blocks.map((b) => [b.componentKey, b.id]));
    for (const key of draftKeys) {
      expect(publishedByKey[key]).toBeDefined();
      expect(publishedByKey[key]).not.toBe(draftByKey[key]);
    }
  });

  test('preserves componentKey across discardDraft', async () => {
    const created = await strapi.documents(UID).create({
      data: {
        title: 'discard',
        blocks: [{ name: 'keep-me' }],
      },
      populate: ['blocks'],
    });

    await strapi.documents(UID).publish({ documentId: created.documentId });

    const published = await strapi.documents(UID).findOne({
      documentId: created.documentId,
      status: 'published',
      populate: ['blocks'],
    });
    const publishedKey = published.blocks[0].componentKey;

    // Mutate draft so discard has something to restore from published
    await strapi.documents(UID).update({
      documentId: created.documentId,
      data: {
        blocks: [{ componentKey: publishedKey, name: 'draft-only' }],
      },
    });

    await strapi.documents(UID).discardDraft({ documentId: created.documentId });

    const draft = await strapi.documents(UID).findOne({
      documentId: created.documentId,
      status: 'draft',
      populate: ['blocks'],
    });

    expect(draft.blocks[0].componentKey).toBe(publishedKey);
    expect(draft.blocks[0].name).toBe('keep-me');
  });

  test('clone mints new componentKeys (does not copy source keys)', async () => {
    const created = await strapi.documents(UID).create({
      data: {
        title: 'clone-source',
        blocks: [{ name: 'a', nested: { label: 'n' } }],
        zones: [
          { __component: 'default.key-dz', heading: 'z1' },
          { __component: 'default.key-compo', name: 'z2' },
        ],
      },
      populate,
    });

    const sourceBlockKey = created.blocks[0].componentKey;
    const sourceNestedKey = created.blocks[0].nested.componentKey;
    const sourceZoneKeys = created.zones.map((z) => z.componentKey);

    const { entries } = await strapi.documents(UID).clone({
      documentId: created.documentId,
      populate,
    });

    expect(entries).toHaveLength(1);
    const cloned = entries[0];

    expect(cloned.blocks[0].componentKey).toEqual(expect.any(String));
    expect(cloned.blocks[0].componentKey).not.toBe(sourceBlockKey);
    expect(cloned.blocks[0].nested.componentKey).toEqual(expect.any(String));
    expect(cloned.blocks[0].nested.componentKey).not.toBe(sourceNestedKey);

    expect(cloned.zones).toHaveLength(2);
    cloned.zones.forEach((zone, i) => {
      expect(zone.componentKey).toEqual(expect.any(String));
      expect(zone.componentKey).not.toBe(sourceZoneKeys[i]);
    });
  });

  test('updates draft by componentKey from published response', async () => {
    const created = await strapi.documents(UID).create({
      data: {
        title: 'round-trip',
        blocks: [{ name: 'one' }, { name: 'two' }],
      },
      populate: ['blocks'],
    });

    await strapi.documents(UID).publish({
      documentId: created.documentId,
    });

    const published = await strapi.documents(UID).findOne({
      documentId: created.documentId,
      status: 'published',
      populate: ['blocks'],
    });

    const targetKey = published.blocks[0].componentKey;

    const updated = await strapi.documents(UID).update({
      documentId: created.documentId,
      data: {
        blocks: [
          { componentKey: targetKey, name: 'one-updated' },
          { componentKey: published.blocks[1].componentKey, name: 'two' },
        ],
      },
      populate: ['blocks'],
    });

    const updatedBlock = updated.blocks.find((b) => b.componentKey === targetKey);
    expect(updatedBlock.name).toBe('one-updated');

    // Published unchanged until next publish
    const stillPublished = await strapi.documents(UID).findOne({
      documentId: created.documentId,
      status: 'published',
      populate: ['blocks'],
    });
    expect(stillPublished.blocks.find((b) => b.componentKey === targetKey).name).toBe('one');
  });

  test('omit-id full replace still works (non-breaking)', async () => {
    const created = await strapi.documents(UID).create({
      data: {
        title: 'replace',
        blocks: [{ name: 'old' }],
      },
      populate: ['blocks'],
    });

    const updated = await strapi.documents(UID).update({
      documentId: created.documentId,
      data: {
        blocks: [{ name: 'new-a' }, { name: 'new-b' }],
      },
      populate: ['blocks'],
    });

    expect(updated.blocks).toHaveLength(2);
    expect(updated.blocks.map((b) => b.name).sort()).toEqual(['new-a', 'new-b']);
    expect(updated.blocks.every((b) => typeof b.componentKey === 'string')).toBe(true);
  });

  test('unknown componentKey throws ApplicationError', async () => {
    const created = await strapi.documents(UID).create({
      data: {
        title: 'unknown-key',
        blocks: [{ name: 'only' }],
      },
      populate: ['blocks'],
    });

    await expect(
      strapi.documents(UID).update({
        documentId: created.documentId,
        data: {
          blocks: [{ componentKey: 'does-not-exist-on-this-entity', name: 'nope' }],
        },
      })
    ).rejects.toMatchObject({
      name: 'ApplicationError',
      message: 'Some of the provided components in blocks are not related to the entity',
    });
  });

  test('nested component and dynamic zone keys round-trip on update', async () => {
    const created = await strapi.documents(UID).create({
      data: {
        title: 'nested-dz',
        blocks: [{ name: 'outer', nested: { label: 'inner' } }],
        zones: [
          { __component: 'default.key-dz', heading: 'first' },
          { __component: 'default.key-compo', name: 'second', nested: { label: 'dz-nested' } },
        ],
      },
      populate,
    });

    const blockKey = created.blocks[0].componentKey;
    const nestedKey = created.blocks[0].nested.componentKey;
    const dzKey = created.zones[0].componentKey;
    const dzCompoKey = created.zones[1].componentKey;
    const dzNestedKey = created.zones[1].nested.componentKey;

    await strapi.documents(UID).publish({ documentId: created.documentId });

    const updated = await strapi.documents(UID).update({
      documentId: created.documentId,
      data: {
        blocks: [
          {
            componentKey: blockKey,
            name: 'outer-updated',
            nested: { componentKey: nestedKey, label: 'inner-updated' },
          },
        ],
        zones: [
          { __component: 'default.key-dz', componentKey: dzKey, heading: 'first-updated' },
          {
            __component: 'default.key-compo',
            componentKey: dzCompoKey,
            name: 'second-updated',
            nested: { componentKey: dzNestedKey, label: 'dz-nested-updated' },
          },
        ],
      },
      populate,
    });

    expect(updated.blocks[0].componentKey).toBe(blockKey);
    expect(updated.blocks[0].name).toBe('outer-updated');
    expect(updated.blocks[0].nested.componentKey).toBe(nestedKey);
    expect(updated.blocks[0].nested.label).toBe('inner-updated');

    expect(updated.zones[0].componentKey).toBe(dzKey);
    expect(updated.zones[0].heading).toBe('first-updated');
    expect(updated.zones[1].componentKey).toBe(dzCompoKey);
    expect(updated.zones[1].name).toBe('second-updated');
    expect(updated.zones[1].nested.componentKey).toBe(dzNestedKey);
    expect(updated.zones[1].nested.label).toBe('dz-nested-updated');
  });

  describe('REST Content API', () => {
    test('GET published → PUT with componentKey updates the entry', async () => {
      const created = await strapi.documents(UID).create({
        data: {
          title: 'rest-round-trip',
          blocks: [{ name: 'alpha' }, { name: 'beta' }],
        },
        populate: ['blocks'],
      });

      await strapi.documents(UID).publish({ documentId: created.documentId });

      const {
        statusCode: getStatus,
        body: { data: published },
      } = await rq({
        method: 'GET',
        url: `/with-key-compos/${created.documentId}`,
        qs: { populate: ['blocks'] },
      });

      expect(getStatus).toBe(200);
      expect(published.blocks[0].componentKey).toEqual(expect.any(String));

      const targetKey = published.blocks[0].componentKey;

      const { statusCode: putStatus, body: putBody } = await rq({
        method: 'PUT',
        url: `/with-key-compos/${created.documentId}`,
        body: {
          data: {
            title: 'rest-round-trip',
            blocks: [
              { componentKey: targetKey, name: 'alpha-updated' },
              { componentKey: published.blocks[1].componentKey, name: 'beta' },
            ],
          },
        },
        qs: { populate: ['blocks'] },
      });

      expect(putStatus).toBe(200);
      expect(putBody.data.blocks.find((b) => b.componentKey === targetKey).name).toBe(
        'alpha-updated'
      );
    });

    test('unknown componentKey returns 400', async () => {
      const created = await strapi.documents(UID).create({
        data: {
          title: 'rest-unknown',
          blocks: [{ name: 'only' }],
        },
        populate: ['blocks'],
      });

      await strapi.documents(UID).publish({ documentId: created.documentId });

      const { statusCode, body } = await rq({
        method: 'PUT',
        url: `/with-key-compos/${created.documentId}`,
        body: {
          data: {
            blocks: [{ componentKey: 'foreign-or-unknown-key', name: 'nope' }],
          },
        },
        qs: { populate: ['blocks'] },
      });

      expect(statusCode).toBe(400);
      expect(body.error).toMatchObject({
        name: 'ApplicationError',
        message: 'Some of the provided components in blocks are not related to the entity',
      });
    });
  });
});
