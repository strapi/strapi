import type { Core } from '@strapi/types';

import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import { setupDatabaseReset } from '../../../utils/index';
import baseResources from './resources/index';

/**
 * Entity-backed regression coverage for component *replacement* on update.
 *
 * `document-service/components.ts` `updateOrCreateComponent` branches on `id`: with an `id`
 * it runs a partial UPDATE on that row; without one it CREATEs a fresh row (stripping any
 * `id`) and `deleteOldComponents` removes the row that was there before. So an id-less
 * component on update is a replacement, not a patch.
 *
 * The hazard these tests pin down: recursive entity validation applies *update* semantics to
 * the nested component, which downgrades `required` to `notNull`. An absent key satisfies
 * `notNull`, so a replacement that omits a required nested field is persisted rather than
 * rejected. On a non-D&P content type that write is published immediately, so the entry ends
 * up published with incomplete component data.
 *
 * MCP guards this at the schema boundary (`buildComponentInputSchema` validates id-less
 * component objects with create semantics). These tests document the underlying
 * Document Service behaviour that makes the guard necessary — if the server ever starts
 * rejecting these writes, the expectations below are what should change.
 */

let strapi: Core.Strapi;

const PRODUCT_UID = 'api::product.product' as const;

/** Non-D&P: writes are published immediately, which is where the defect bites. */
const productSchema = {
  kind: 'collectionType',
  collectionName: 'products',
  singularName: 'product',
  pluralName: 'products',
  displayName: 'Product',
  draftAndPublish: false,
  attributes: {
    name: { type: 'string' },
    // Non-repeatable component with a required leaf.
    seo: { type: 'component', repeatable: false, component: 'product.seo' },
    // Repeatable component with a required leaf.
    specs: { type: 'component', repeatable: true, component: 'product.spec' },
  },
};

const seoComponent = {
  collectionName: 'components_product_seos',
  displayName: 'Seo',
  singularName: 'seo',
  category: 'product',
  attributes: {
    metaTitle: { type: 'string', required: true },
    keywords: { type: 'string' },
  },
};

const specComponent = {
  collectionName: 'components_product_specs',
  displayName: 'Spec',
  singularName: 'spec',
  category: 'product',
  attributes: {
    label: { type: 'string', required: true },
    value: { type: 'string' },
  },
};

const resources = {
  ...baseResources,
  schemas: {
    ...baseResources.schemas,
    components: {
      ...baseResources.schemas.components,
      'product.seo': seoComponent,
      'product.spec': specComponent,
    },
    'content-types': {
      ...baseResources.schemas['content-types'],
      [PRODUCT_UID]: productSchema,
    },
  },
  fixtures: {
    ...baseResources.fixtures,
    'content-types': {
      ...baseResources.fixtures['content-types'],
      [PRODUCT_UID]: [],
    },
  },
};

const findProductDb = (where: any, populate?: any) =>
  strapi.db.query(PRODUCT_UID).findOne({ where, populate });

const countRows = async (uid: string) => {
  const rows = await strapi.db.query(uid).findMany({});
  return rows.length;
};

describe('Document Service | component replacement on update', () => {
  let testUtils;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  setupDatabaseReset();

  describe('non-repeatable component', () => {
    it('an id-bearing component patches the existing row in place', async () => {
      const created = await strapi.documents(PRODUCT_UID).create({
        data: { name: 'Widget', seo: { metaTitle: 'Widget | Shop', keywords: 'widget,shop' } },
        populate: ['seo'],
      });

      const originalRowId = (created as any).seo.id;

      const updated = await strapi.documents(PRODUCT_UID).update({
        documentId: created.documentId,
        data: { seo: { id: originalRowId, keywords: 'widget,store' } },
        populate: ['seo'],
      });

      // Same row, and the field we did not send kept its value.
      expect((updated as any).seo.id).toBe(originalRowId);
      expect((updated as any).seo.metaTitle).toBe('Widget | Shop');
      expect((updated as any).seo.keywords).toBe('widget,store');
    });

    it('an id-less component replaces the row and persists a missing required field', async () => {
      const created = await strapi.documents(PRODUCT_UID).create({
        data: { name: 'Widget', seo: { metaTitle: 'Widget | Shop', keywords: 'widget,shop' } },
        populate: ['seo'],
      });

      const originalRowId = (created as any).seo.id;

      // No `id` → the server deletes row `originalRowId` and creates a new one from exactly
      // these fields. `metaTitle` is required on the component but omitted here.
      const updated = await strapi.documents(PRODUCT_UID).update({
        documentId: created.documentId,
        data: { seo: { keywords: 'widget,store' } },
        populate: ['seo'],
      });

      // Replacement, not a patch: a different row.
      expect((updated as any).seo.id).not.toBe(originalRowId);
      // The required field is gone — this is the data-integrity gap the MCP schema guards.
      expect((updated as any).seo.metaTitle).toBeNull();
      expect((updated as any).seo.keywords).toBe('widget,store');

      // The write was accepted and is live (non-D&P publishes immediately).
      const persisted = await findProductDb({ documentId: created.documentId }, ['seo']);
      expect((persisted as any).seo.metaTitle).toBeNull();

      // The old row is gone rather than orphaned.
      expect(await countRows('product.seo')).toBe(1);
    });

    it('an empty id-less component object still replaces the row', async () => {
      const created = await strapi.documents(PRODUCT_UID).create({
        data: { name: 'Widget', seo: { metaTitle: 'Widget | Shop', keywords: 'widget,shop' } },
        populate: ['seo'],
      });

      const updated = await strapi.documents(PRODUCT_UID).update({
        documentId: created.documentId,
        data: { seo: {} },
        populate: ['seo'],
      });

      // Every field of a previously valid component is now empty.
      expect((updated as any).seo.metaTitle).toBeNull();
      expect((updated as any).seo.keywords).toBeNull();
    });
  });

  describe('repeatable component', () => {
    it('id-bearing items patch in place and keep their rows', async () => {
      const created = await strapi.documents(PRODUCT_UID).create({
        data: {
          name: 'Widget',
          specs: [
            { label: 'Weight', value: '2kg' },
            { label: 'Colour', value: 'red' },
          ],
        },
        populate: ['specs'],
      });

      const [first, second] = (created as any).specs;

      const updated = await strapi.documents(PRODUCT_UID).update({
        documentId: created.documentId,
        data: { specs: [{ id: first.id, value: '3kg' }, { id: second.id }] },
        populate: ['specs'],
      });

      const specs = (updated as any).specs;
      expect(specs).toHaveLength(2);
      expect(specs.map((s: any) => s.id)).toEqual([first.id, second.id]);
      // Omitted fields on an id-bearing item are preserved.
      expect(specs[0]).toMatchObject({ label: 'Weight', value: '3kg' });
      expect(specs[1]).toMatchObject({ label: 'Colour', value: 'red' });
    });

    it('an id-less item persists a replacement missing its required field', async () => {
      const created = await strapi.documents(PRODUCT_UID).create({
        data: { name: 'Widget', specs: [{ label: 'Weight', value: '2kg' }] },
        populate: ['specs'],
      });

      const originalRowId = (created as any).specs[0].id;

      const updated = await strapi.documents(PRODUCT_UID).update({
        documentId: created.documentId,
        data: { specs: [{ value: '3kg' }] },
        populate: ['specs'],
      });

      const specs = (updated as any).specs;
      expect(specs).toHaveLength(1);
      expect(specs[0].id).not.toBe(originalRowId);
      // Required `label` omitted on a replacement — accepted and persisted.
      expect(specs[0].label).toBeNull();
      expect(specs[0].value).toBe('3kg');
    });

    it('omitting an existing item from the array deletes it (wholesale replacement)', async () => {
      const created = await strapi.documents(PRODUCT_UID).create({
        data: {
          name: 'Widget',
          specs: [
            { label: 'Weight', value: '2kg' },
            { label: 'Colour', value: 'red' },
          ],
        },
        populate: ['specs'],
      });

      const [first] = (created as any).specs;

      // Only the first item is sent — the array is replaced, not merged.
      const updated = await strapi.documents(PRODUCT_UID).update({
        documentId: created.documentId,
        data: { specs: [{ id: first.id }] },
        populate: ['specs'],
      });

      expect((updated as any).specs).toHaveLength(1);
      expect((updated as any).specs[0].id).toBe(first.id);
      // The dropped row is deleted outright.
      expect(await countRows('product.spec')).toBe(1);
    });

    it('omitting the component key entirely leaves the list untouched', async () => {
      const created = await strapi.documents(PRODUCT_UID).create({
        data: {
          name: 'Widget',
          specs: [
            { label: 'Weight', value: '2kg' },
            { label: 'Colour', value: 'red' },
          ],
        },
        populate: ['specs'],
      });

      const updated = await strapi.documents(PRODUCT_UID).update({
        documentId: created.documentId,
        data: { name: 'Widget renamed' },
        populate: ['specs'],
      });

      expect((updated as any).name).toBe('Widget renamed');
      expect((updated as any).specs).toHaveLength(2);
      expect(await countRows('product.spec')).toBe(2);
    });
  });
});
