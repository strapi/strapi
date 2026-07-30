import type { Core } from '@strapi/types';

import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import { setupDatabaseReset } from '../../../utils/index';
import {
  ARTICLE_UID,
  createMinimalArticleCategoryResources,
} from './resources/minimal-article-category';

const resources = createMinimalArticleCategoryResources({
  withComponents: true,
  withCategory: false,
  withFixtures: false,
  // Non-D&P: writes are published immediately. On a D&P model these same writes would land
  // on a draft, where a missing required leaf is *intentionally* valid — which would prove
  // draft leniency rather than the replacement hazard.
  draftAndPublish: false,
});

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
 * rejected — the component silently loses data that `required` was supposed to guarantee.
 *
 * The article here is deliberately **non-D&P**, so every write below is published content.
 * That is what makes the hazard a data-integrity problem rather than draft leniency: on a
 * D&P model these writes would target a draft, where a missing required leaf is *intentionally*
 * valid and gets caught later at publish time. With draft & publish off there is no later
 * gate — the incomplete component is live the moment it is written.
 *
 * MCP guards this at the schema boundary (`buildComponentInputSchema` validates id-less
 * component objects with create semantics, and `buildDynamicZoneItemSchema` extends the same
 * split to dynamic-zone entries). These tests document the underlying Document Service
 * behaviour that makes the guard necessary — if the server ever starts rejecting these
 * writes, the expectations below are what should change.
 *
 * These reuse `createMinimalArticleCategoryResources` and its existing `article.comp`
 * component (`text` required, `note` optional) rather than registering new schemas.
 * Every schema costs a full Strapi boot during `builder.cleanup()`, so the heavyweight
 * shared `resources/index` set pushes teardown past Jest's hook timeout — which leaves
 * components registered and fails the next suite with `component.alreadyExists`.
 */

let strapi: Core.Strapi;

const countCompRows = async () => {
  const rows = await strapi.db.query('article.comp').findMany({});
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

  // These tests write articles and count component rows, so each one needs the shared
  // fixture state back afterwards.
  setupDatabaseReset();

  const createArticle = (comp: any) =>
    strapi.documents(ARTICLE_UID).create({
      data: { title: 'Article', comp },
      populate: ['comp'],
      locale: 'en',
    });

  describe('non-repeatable component', () => {
    it('an id-bearing component patches the existing row in place', async () => {
      const created = await createArticle({ text: 'original', note: 'first' });
      const originalRowId = (created as any).comp.id;

      const updated = await strapi.documents(ARTICLE_UID).update({
        documentId: created.documentId,
        data: { comp: { id: originalRowId, note: 'second' } },
        populate: ['comp'],
        locale: 'en',
      });

      // Same row, and the field we did not send kept its value.
      expect((updated as any).comp.id).toBe(originalRowId);
      expect((updated as any).comp.text).toBe('original');
      expect((updated as any).comp.note).toBe('second');
    });

    it('an id-less component replaces the row and persists a missing required field', async () => {
      const rowsBefore = await countCompRows();
      const created = await createArticle({ text: 'original', note: 'first' });
      const originalRowId = (created as any).comp.id;

      // No `id` → the server deletes row `originalRowId` and creates a new one from exactly
      // these fields. `text` is required on the component but omitted here.
      const updated = await strapi.documents(ARTICLE_UID).update({
        documentId: created.documentId,
        data: { comp: { note: 'second' } },
        populate: ['comp'],
        locale: 'en',
      });

      // Replacement, not a patch: a different row.
      expect((updated as any).comp.id).not.toBe(originalRowId);
      // The required field is gone — this is the data-integrity gap the MCP schema guards.
      expect((updated as any).comp.text).toBeNull();
      expect((updated as any).comp.note).toBe('second');

      // The write was accepted and read back from the database, not just echoed.
      const persisted = await strapi.db
        .query(ARTICLE_UID)
        .findOne({ where: { documentId: created.documentId, locale: 'en' }, populate: ['comp'] });
      expect((persisted as any).comp.text).toBeNull();

      // The old row is gone rather than orphaned: the article contributed exactly one
      // component row, and the replacement swapped it rather than adding a second.
      expect(await countCompRows()).toBe(rowsBefore + 1);
    });

    it('an empty id-less component object still replaces the row', async () => {
      const created = await createArticle({ text: 'original', note: 'first' });
      const originalRowId = (created as any).comp.id;

      const updated = await strapi.documents(ARTICLE_UID).update({
        documentId: created.documentId,
        data: { comp: {} },
        populate: ['comp'],
        locale: 'en',
      });

      // Every field of a previously valid component is now empty.
      expect((updated as any).comp.id).not.toBe(originalRowId);
      expect((updated as any).comp.text).toBeNull();
      expect((updated as any).comp.note).toBeNull();
    });

    it('omitting the component key entirely leaves it untouched', async () => {
      const created = await createArticle({ text: 'original', note: 'first' });
      const originalRowId = (created as any).comp.id;

      const updated = await strapi.documents(ARTICLE_UID).update({
        documentId: created.documentId,
        data: { title: 'Article renamed' },
        populate: ['comp'],
        locale: 'en',
      });

      expect((updated as any).title).toBe('Article renamed');
      expect((updated as any).comp.id).toBe(originalRowId);
      expect((updated as any).comp.text).toBe('original');
      expect((updated as any).comp.note).toBe('first');
    });
  });

  describe('dynamic zone', () => {
    it('an id-less entry replaces the row, an id-bearing one patches it', async () => {
      const created = await strapi.documents(ARTICLE_UID).create({
        data: {
          title: 'Article',
          dz: [
            { __component: 'article.dz-comp', name: 'first' },
            { __component: 'article.dz-comp', name: 'second' },
          ],
        },
        populate: ['dz'],
        locale: 'en',
      });

      const [first, second] = (created as any).dz;

      const updated = await strapi.documents(ARTICLE_UID).update({
        documentId: created.documentId,
        data: {
          dz: [
            // id-bearing: patched in place, `name` preserved.
            { __component: 'article.dz-comp', id: first.id },
            // id-less: a brand new row replaces the old one.
            { __component: 'article.dz-comp', name: 'replaced' },
          ],
        },
        populate: ['dz'],
        locale: 'en',
      });

      const dz = (updated as any).dz;
      expect(dz).toHaveLength(2);
      expect(dz[0].id).toBe(first.id);
      expect(dz[0].name).toBe('first');
      expect(dz[1].id).not.toBe(second.id);
      expect(dz[1].name).toBe('replaced');
    });

    it('an id-less entry persists a missing required field on published content', async () => {
      // The dynamic-zone counterpart of the non-repeatable case above, and the reason the MCP
      // schema models entries as a `__component`-discriminated union with the same id split.
      // `dz-comp.name` is required, the article is non-D&P, and this write is live.
      const created = await strapi.documents(ARTICLE_UID).create({
        data: {
          title: 'Article',
          dz: [{ __component: 'article.dz-comp', name: 'original' }],
        },
        populate: ['dz'],
        locale: 'en',
      });

      const [original] = (created as any).dz;

      const updated = await strapi.documents(ARTICLE_UID).update({
        documentId: created.documentId,
        // No `id` → the old row is deleted and a new one created from these fields alone.
        // `name` is required on the component but omitted.
        data: { dz: [{ __component: 'article.dz-comp' }] },
        populate: ['dz'],
        locale: 'en',
      });

      // Accepted rather than rejected: a different row, with the required field empty.
      expect((updated as any).dz).toHaveLength(1);
      expect((updated as any).dz[0].id).not.toBe(original.id);
      expect((updated as any).dz[0].name).toBeNull();

      // Read back from the database, and live — the model has no draft to fix it in.
      const persisted = await strapi.db
        .query(ARTICLE_UID)
        .findOne({ where: { documentId: created.documentId, locale: 'en' }, populate: ['dz'] });
      expect((persisted as any).dz[0].name).toBeNull();
    });

    it('omitting an existing entry from the array deletes it (wholesale replacement)', async () => {
      const created = await strapi.documents(ARTICLE_UID).create({
        data: {
          title: 'Article',
          dz: [
            { __component: 'article.dz-comp', name: 'first' },
            { __component: 'article.dz-comp', name: 'second' },
          ],
        },
        populate: ['dz'],
        locale: 'en',
      });

      const [first] = (created as any).dz;

      // Only the first entry is sent — the array is replaced, not merged.
      const updated = await strapi.documents(ARTICLE_UID).update({
        documentId: created.documentId,
        data: { dz: [{ __component: 'article.dz-comp', id: first.id }] },
        populate: ['dz'],
        locale: 'en',
      });

      expect((updated as any).dz).toHaveLength(1);
      expect((updated as any).dz[0].id).toBe(first.id);
    });
  });
});
