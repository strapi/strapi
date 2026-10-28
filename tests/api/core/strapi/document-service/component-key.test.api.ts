'use strict';

/**
 * Durable strapiComponentKey across Draft & Publish.
 * @see docs/docs/packages/core/core/component-key.md
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

describe('Document Service — strapiComponentKey', () => {
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

  test('assigns strapiComponentKey on create and preserves it across publish', async () => {
    const created = await strapi.documents(UID).create({
      data: {
        title: 'hello',
        blocks: [{ name: 'a' }, { name: 'b' }],
      },
      populate: ['blocks'],
    });

    expect(created.blocks).toHaveLength(2);
    expect(created.blocks[0].strapiComponentKey).toEqual(expect.any(String));
    expect(created.blocks[1].strapiComponentKey).toEqual(expect.any(String));
    expect(created.blocks[0].strapiComponentKey).not.toBe(created.blocks[1].strapiComponentKey);

    const draftKeys = created.blocks.map((b) => b.strapiComponentKey);

    await strapi.documents(UID).publish({
      documentId: created.documentId,
    });

    const published = await strapi.documents(UID).findOne({
      documentId: created.documentId,
      status: 'published',
      populate: ['blocks'],
    });

    expect(published.blocks.map((b) => b.strapiComponentKey).sort()).toEqual([...draftKeys].sort());
    // Row ids differ across status even when keys match
    const publishedByKey = Object.fromEntries(
      published.blocks.map((b) => [b.strapiComponentKey, b.id])
    );
    const draftByKey = Object.fromEntries(created.blocks.map((b) => [b.strapiComponentKey, b.id]));
    for (const key of draftKeys) {
      expect(publishedByKey[key]).toBeDefined();
      expect(publishedByKey[key]).not.toBe(draftByKey[key]);
    }
  });

  test('preserves strapiComponentKey across discardDraft', async () => {
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
    const publishedKey = published.blocks[0].strapiComponentKey;

    // Mutate draft so discard has something to restore from published
    await strapi.documents(UID).update({
      documentId: created.documentId,
      data: {
        blocks: [{ strapiComponentKey: publishedKey, name: 'draft-only' }],
      },
    });

    await strapi.documents(UID).discardDraft({ documentId: created.documentId });

    const draft = await strapi.documents(UID).findOne({
      documentId: created.documentId,
      status: 'draft',
      populate: ['blocks'],
    });

    expect(draft.blocks[0].strapiComponentKey).toBe(publishedKey);
    expect(draft.blocks[0].name).toBe('keep-me');
  });

  test('clone mints new strapiComponentKeys (does not copy source keys)', async () => {
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

    const sourceBlockKey = created.blocks[0].strapiComponentKey;
    const sourceNestedKey = created.blocks[0].nested.strapiComponentKey;
    const sourceZoneKeys = created.zones.map((z) => z.strapiComponentKey);

    const { entries } = await strapi.documents(UID).clone({
      documentId: created.documentId,
      populate,
    });

    expect(entries).toHaveLength(1);
    const cloned = entries[0];

    expect(cloned.blocks[0].strapiComponentKey).toEqual(expect.any(String));
    expect(cloned.blocks[0].strapiComponentKey).not.toBe(sourceBlockKey);
    expect(cloned.blocks[0].nested.strapiComponentKey).toEqual(expect.any(String));
    expect(cloned.blocks[0].nested.strapiComponentKey).not.toBe(sourceNestedKey);

    expect(cloned.zones).toHaveLength(2);
    cloned.zones.forEach((zone, i) => {
      expect(zone.strapiComponentKey).toEqual(expect.any(String));
      expect(zone.strapiComponentKey).not.toBe(sourceZoneKeys[i]);
    });
  });

  test('updates draft by strapiComponentKey from published response', async () => {
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

    const targetKey = published.blocks[0].strapiComponentKey;

    const updated = await strapi.documents(UID).update({
      documentId: created.documentId,
      data: {
        blocks: [
          { strapiComponentKey: targetKey, name: 'one-updated' },
          { strapiComponentKey: published.blocks[1].strapiComponentKey, name: 'two' },
        ],
      },
      populate: ['blocks'],
    });

    const updatedBlock = updated.blocks.find((b) => b.strapiComponentKey === targetKey);
    expect(updatedBlock.name).toBe('one-updated');

    // Published unchanged until next publish
    const stillPublished = await strapi.documents(UID).findOne({
      documentId: created.documentId,
      status: 'published',
      populate: ['blocks'],
    });
    expect(stillPublished.blocks.find((b) => b.strapiComponentKey === targetKey).name).toBe('one');
  });

  test('echoing published id + strapiComponentKey updates the draft block', async () => {
    const created = await strapi.documents(UID).create({
      data: {
        title: 'echo',
        blocks: [{ name: 'one' }, { name: 'two' }],
      },
      populate: ['blocks'],
    });

    await strapi.documents(UID).publish({ documentId: created.documentId });

    const published = await strapi.documents(UID).findOne({
      documentId: created.documentId,
      status: 'published',
      populate: ['blocks'],
    });

    const updated = await strapi.documents(UID).update({
      documentId: created.documentId,
      data: {
        blocks: [{ ...published.blocks[0], name: 'one-updated' }, { ...published.blocks[1] }],
      },
      populate: ['blocks'],
    });

    expect(updated.blocks.map((b) => b.strapiComponentKey)).toEqual(
      published.blocks.map((b) => b.strapiComponentKey)
    );
    expect(updated.blocks.map((b) => b.id)).toEqual(created.blocks.map((b) => b.id));
    expect(updated.blocks[0].name).toBe('one-updated');
  });

  test('create ignores client strapiComponentKeys and mints distinct ones', async () => {
    const created = await strapi.documents(UID).create({
      data: {
        title: 'client-keys',
        blocks: [
          { strapiComponentKey: 'client-key', name: 'a' },
          { strapiComponentKey: 'client-key', name: 'b' },
        ],
      },
      populate: ['blocks'],
    });

    const keys = created.blocks.map((b) => b.strapiComponentKey);
    expect(keys).not.toContain('client-key');
    expect(new Set(keys).size).toBe(2);
  });

  test('a strapiComponentKey repeated in one field creates a new block', async () => {
    const created = await strapi.documents(UID).create({
      data: {
        title: 'copied-block',
        blocks: [{ name: 'original' }],
      },
      populate: ['blocks'],
    });
    const [original] = created.blocks;

    const updated = await strapi.documents(UID).update({
      documentId: created.documentId,
      data: {
        blocks: [
          { id: original.id, strapiComponentKey: original.strapiComponentKey, name: 'original' },
          { strapiComponentKey: original.strapiComponentKey, name: 'copy' },
        ],
      },
      populate: ['blocks'],
    });

    expect(updated.blocks.map((b) => b.name)).toEqual(['original', 'copy']);
    expect(updated.blocks[0].id).toBe(original.id);
    expect(updated.blocks[0].strapiComponentKey).toBe(original.strapiComponentKey);
    expect(updated.blocks[1].strapiComponentKey).not.toBe(original.strapiComponentKey);
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
    expect(updated.blocks.every((b) => typeof b.strapiComponentKey === 'string')).toBe(true);
  });

  test('unknown strapiComponentKey throws ApplicationError', async () => {
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
          blocks: [{ strapiComponentKey: 'does-not-exist-on-this-entity', name: 'nope' }],
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

    const blockKey = created.blocks[0].strapiComponentKey;
    const nestedKey = created.blocks[0].nested.strapiComponentKey;
    const dzKey = created.zones[0].strapiComponentKey;
    const dzCompoKey = created.zones[1].strapiComponentKey;
    const dzNestedKey = created.zones[1].nested.strapiComponentKey;

    await strapi.documents(UID).publish({ documentId: created.documentId });

    const updated = await strapi.documents(UID).update({
      documentId: created.documentId,
      data: {
        blocks: [
          {
            strapiComponentKey: blockKey,
            name: 'outer-updated',
            nested: { strapiComponentKey: nestedKey, label: 'inner-updated' },
          },
        ],
        zones: [
          { __component: 'default.key-dz', strapiComponentKey: dzKey, heading: 'first-updated' },
          {
            __component: 'default.key-compo',
            strapiComponentKey: dzCompoKey,
            name: 'second-updated',
            nested: { strapiComponentKey: dzNestedKey, label: 'dz-nested-updated' },
          },
        ],
      },
      populate,
    });

    expect(updated.blocks[0].strapiComponentKey).toBe(blockKey);
    expect(updated.blocks[0].name).toBe('outer-updated');
    expect(updated.blocks[0].nested.strapiComponentKey).toBe(nestedKey);
    expect(updated.blocks[0].nested.label).toBe('inner-updated');

    expect(updated.zones[0].strapiComponentKey).toBe(dzKey);
    expect(updated.zones[0].heading).toBe('first-updated');
    expect(updated.zones[1].strapiComponentKey).toBe(dzCompoKey);
    expect(updated.zones[1].name).toBe('second-updated');
    expect(updated.zones[1].nested.strapiComponentKey).toBe(dzNestedKey);
    expect(updated.zones[1].nested.label).toBe('dz-nested-updated');
  });

  describe('REST Content API', () => {
    test('GET published → PUT with strapiComponentKey updates the entry', async () => {
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
      expect(published.blocks[0].strapiComponentKey).toEqual(expect.any(String));

      const targetKey = published.blocks[0].strapiComponentKey;

      const { statusCode: putStatus, body: putBody } = await rq({
        method: 'PUT',
        url: `/with-key-compos/${created.documentId}`,
        body: {
          data: {
            title: 'rest-round-trip',
            blocks: [
              { strapiComponentKey: targetKey, name: 'alpha-updated' },
              { strapiComponentKey: published.blocks[1].strapiComponentKey, name: 'beta' },
            ],
          },
        },
        qs: { populate: ['blocks'] },
      });

      expect(putStatus).toBe(200);
      expect(putBody.data.blocks.find((b) => b.strapiComponentKey === targetKey).name).toBe(
        'alpha-updated'
      );
    });

    test('unknown strapiComponentKey returns 400', async () => {
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
            blocks: [{ strapiComponentKey: 'foreign-or-unknown-key', name: 'nope' }],
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
