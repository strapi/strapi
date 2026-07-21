'use strict';

/**
 * Draft coverage for durable componentKey across Draft & Publish.
 * @see docs/docs/rfcs/03-component-key.md
 */

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();

let strapi;

const component = {
  displayName: 'key-compo',
  attributes: {
    name: {
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
  },
};

describe('Document Service — componentKey', () => {
  beforeAll(async () => {
    await builder.addComponent(component).addContentType(ct).build();

    strapi = await createStrapiInstance();
    // Auth request kept for follow-up REST / Content Manager cases
    await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('assigns componentKey on create and preserves it across publish', async () => {
    const created = await strapi.documents('api::with-key-compo.with-key-compo').create({
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

    await strapi.documents('api::with-key-compo.with-key-compo').publish({
      documentId: created.documentId,
    });

    const published = await strapi.documents('api::with-key-compo.with-key-compo').findOne({
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

  test('updates draft by componentKey from published response', async () => {
    const created = await strapi.documents('api::with-key-compo.with-key-compo').create({
      data: {
        title: 'round-trip',
        blocks: [{ name: 'one' }, { name: 'two' }],
      },
      populate: ['blocks'],
    });

    await strapi.documents('api::with-key-compo.with-key-compo').publish({
      documentId: created.documentId,
    });

    const published = await strapi.documents('api::with-key-compo.with-key-compo').findOne({
      documentId: created.documentId,
      status: 'published',
      populate: ['blocks'],
    });

    const targetKey = published.blocks[0].componentKey;

    const updated = await strapi.documents('api::with-key-compo.with-key-compo').update({
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
    const stillPublished = await strapi.documents('api::with-key-compo.with-key-compo').findOne({
      documentId: created.documentId,
      status: 'published',
      populate: ['blocks'],
    });
    expect(stillPublished.blocks.find((b) => b.componentKey === targetKey).name).toBe('one');
  });

  test('omit-id full replace still works (non-breaking)', async () => {
    const created = await strapi.documents('api::with-key-compo.with-key-compo').create({
      data: {
        title: 'replace',
        blocks: [{ name: 'old' }],
      },
      populate: ['blocks'],
    });

    const updated = await strapi.documents('api::with-key-compo.with-key-compo').update({
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

  test.todo('REST Content API GET published → PUT with componentKey');
  test.todo('unknown componentKey returns 400');
});
