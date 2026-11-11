/**
 * Pending-relation records (`strapi_pending_relations`) written at publish and restored when the
 * target is published: locale handling, non-localized fields, and the cleanup of the records when
 * entries, locales or published versions go away.
 */
import type { Core } from '@strapi/types';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');

let strapi: Core.Strapi;
const builder = createTestBuilder();

const PENDING_UID = 'strapi::pending-relation';
const LABEL_UID = 'api::label.label';
const TAG_UID = 'api::tag.tag';
const GALLERY_UID = 'api::gallery.gallery';
const PAGE_UID = 'api::page.page';
const PLAIN_UID = 'api::plain.plain';
const SECTION_COMPONENT_UID = 'default.section';
const ITEM_COMPONENT_UID = 'default.item';
const SHARED_COMPONENT_UID = 'default.shared';

const labelModel = {
  attributes: { name: { type: 'string' } },
  draftAndPublish: true,
  displayName: 'Label',
  singularName: 'label',
  pluralName: 'labels',
  description: '',
  collectionName: '',
};

const tagModel = {
  attributes: { name: { type: 'string', pluginOptions: { i18n: { localized: true } } } },
  pluginOptions: { i18n: { localized: true } },
  draftAndPublish: true,
  displayName: 'Tag',
  singularName: 'tag',
  pluralName: 'tags',
  description: '',
  collectionName: '',
};

// Not localized, links to a localized target
const galleryModel = {
  attributes: {
    title: { type: 'string' },
    label: { type: 'relation', relation: 'oneToOne', target: LABEL_UID },
    tags: { type: 'relation', relation: 'oneToMany', target: TAG_UID },
  },
  draftAndPublish: true,
  displayName: 'Gallery',
  singularName: 'gallery',
  pluralName: 'galleries',
  description: '',
  collectionName: '',
};

// Holds a relation; used as a non-localized component on page
const sharedComponentModel = {
  collectionName: 'components_default_shareds',
  attributes: {
    marker: { type: 'string' },
    label: { type: 'relation', relation: 'oneToOne', target: LABEL_UID },
  },
  displayName: 'shared',
};

// Localized, with localized relations, a relation marked non-localized (i18n still treats
// relations as per locale) and a non-localized component holding a relation
const pageModel = {
  attributes: {
    title: { type: 'string', pluginOptions: { i18n: { localized: true } } },
    label: {
      type: 'relation',
      relation: 'oneToOne',
      target: LABEL_UID,
      pluginOptions: { i18n: { localized: true } },
    },
    tag: {
      type: 'relation',
      relation: 'oneToOne',
      target: TAG_UID,
      pluginOptions: { i18n: { localized: true } },
    },
    sharedLabel: {
      type: 'relation',
      relation: 'oneToOne',
      target: LABEL_UID,
      pluginOptions: { i18n: { localized: false } },
    },
    shared: {
      type: 'component',
      component: SHARED_COMPONENT_UID,
      pluginOptions: { i18n: { localized: false } },
    },
  },
  pluginOptions: { i18n: { localized: true } },
  draftAndPublish: true,
  displayName: 'Page',
  singularName: 'page',
  pluralName: 'pages',
  description: '',
  collectionName: '',
};

const itemComponentModel = {
  collectionName: 'components_default_items',
  attributes: { text: { type: 'string' } },
  displayName: 'item',
};

const sectionComponentModel = {
  collectionName: 'components_default_sections',
  attributes: {
    heading: { type: 'string' },
    items: { type: 'component', component: ITEM_COMPONENT_UID, repeatable: true },
    single: { type: 'component', component: ITEM_COMPONENT_UID },
  },
  displayName: 'section',
};

// Draft & Publish content type without any relation
const plainModel = {
  attributes: {
    title: { type: 'string' },
    sections: { type: 'component', component: SECTION_COMPONENT_UID, repeatable: true },
    blocks: { type: 'dynamiczone', components: [SECTION_COMPONENT_UID, ITEM_COMPONENT_UID] },
  },
  draftAndPublish: true,
  displayName: 'Plain',
  singularName: 'plain',
  pluralName: 'plains',
  description: '',
  collectionName: '',
};

const pending = () => strapi.db.query(PENDING_UID as any);
const countRecords = (where: Record<string, unknown>) => pending().count({ where });
const countRecordsOf = (uid: string, documentId: string, locale?: string) =>
  countRecords({
    rootUid: uid,
    rootDocumentId: documentId,
    ...(locale ? { rootLocale: locale } : {}),
  });
const countRecordsTargeting = (uid: string, documentId: string) =>
  countRecords({ targetUid: uid, targetDocumentId: documentId });

const ids = (entries: { documentId: string }[] | undefined) =>
  (entries ?? []).map((entry) => entry.documentId);

const createLabel = async (publish = false) => {
  const label = await strapi.documents(LABEL_UID).create({ data: { name: 'label' } });
  if (publish) await strapi.documents(LABEL_UID).publish({ documentId: label.documentId });
  return label.documentId;
};
const publishLabel = (documentId: string) => strapi.documents(LABEL_UID).publish({ documentId });

const createTag = async (locale: string, publish = false) => {
  const tag = await strapi.documents(TAG_UID).create({ data: { name: locale }, locale });
  if (publish) await strapi.documents(TAG_UID).publish({ documentId: tag.documentId, locale });
  return tag.documentId;
};

const find = (
  uid: string,
  documentId: string,
  status: 'draft' | 'published',
  populate: any,
  locale?: string
) =>
  strapi.documents(uid as any).findOne({
    documentId,
    status,
    populate,
    ...(locale ? { locale } : {}),
  } as any) as Promise<any>;

describe('Document Service pending relation records: locales and cleanup', () => {
  beforeAll(async () => {
    await builder
      .addContentTypes([labelModel, tagModel])
      .addComponent(itemComponentModel)
      .addComponent(sectionComponentModel)
      .addComponent(sharedComponentModel)
      .addContentTypes([galleryModel, pageModel, plainModel])
      .addFixtures('plugin::i18n.locale', [{ name: 'Fr', code: 'fr' }])
      .build();

    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  beforeEach(async () => {
    await pending().deleteMany({ where: { id: { $notNull: true } } });
  });

  describe('cross-locale neighbour ordering', () => {
    it('restores a link of another locale between neighbours of the source locale', async () => {
      const x = await createTag('en', true);
      const y = await createTag('en', true);
      // Only has a French version, so a neighbour search in the restored link's locale finds nothing
      const c = await createTag('fr');

      const gallery = await strapi.documents(GALLERY_UID).create({
        data: {
          title: 'g',
          tags: [
            { documentId: x, locale: 'en' },
            { documentId: c, locale: 'fr' },
            { documentId: y, locale: 'en' },
          ],
        },
      } as any);
      const g = gallery.documentId;

      expect(ids((await find(GALLERY_UID, g, 'draft', { tags: true })).tags)).toEqual([x, c, y]);

      await strapi.documents(GALLERY_UID).publish({ documentId: g });
      expect(ids((await find(GALLERY_UID, g, 'published', { tags: true })).tags)).toEqual([x, y]);
      expect(await countRecordsOf(GALLERY_UID, g)).toBe(1);

      await strapi.documents(TAG_UID).publish({ documentId: c, locale: 'fr' });

      expect(ids((await find(GALLERY_UID, g, 'published', { tags: true })).tags)).toEqual([
        x,
        c,
        y,
      ]);
      expect(await countRecordsOf(GALLERY_UID, g)).toBe(0);
    });

    it('restores a first-position link of another locale before its neighbour', async () => {
      const x = await createTag('en', true);
      const c = await createTag('fr');
      const y = await createTag('en', true);

      const gallery = await strapi.documents(GALLERY_UID).create({
        data: {
          title: 'g',
          tags: [
            { documentId: c, locale: 'fr' },
            { documentId: x, locale: 'en' },
            { documentId: y, locale: 'en' },
          ],
        },
      } as any);
      const g = gallery.documentId;
      await strapi.documents(GALLERY_UID).publish({ documentId: g });
      expect(ids((await find(GALLERY_UID, g, 'published', { tags: true })).tags)).toEqual([x, y]);

      await strapi.documents(TAG_UID).publish({ documentId: c, locale: 'fr' });

      expect(ids((await find(GALLERY_UID, g, 'published', { tags: true })).tags)).toEqual([
        c,
        x,
        y,
      ]);
    });
  });

  describe('non-localized fields inherited from the published version of another locale', () => {
    it('does not restore a link in a component inherited from another locale, but restores the locale own links', async () => {
      const b = await createLabel();
      const populate = { label: true, sharedLabel: true, shared: { populate: { label: true } } };

      const page = await strapi
        .documents(PAGE_UID)
        .create({ data: { title: 'en', shared: { marker: 'en' } }, locale: 'en' } as any);
      const p = page.documentId;
      await strapi.documents(PAGE_UID).publish({ documentId: p, locale: 'en' });

      // fr draft links B in the non-localized component, on a relation marked non-localized
      // (still per locale for i18n) and on a localized relation
      await strapi.documents(PAGE_UID).update({
        documentId: p,
        locale: 'fr',
        data: {
          title: 'fr',
          shared: { marker: 'fr', label: { documentId: b } },
          sharedLabel: { documentId: b },
          label: { documentId: b },
        },
      } as any);

      // Preconditions: en published never had the component link, fr draft has all three links
      const enBefore = await find(PAGE_UID, p, 'published', populate, 'en');
      expect(enBefore.shared).toMatchObject({ marker: 'en' });
      expect(enBefore.shared.label).toBeNull();
      const frDraft = await find(PAGE_UID, p, 'draft', populate, 'fr');
      expect(frDraft.shared.label).toMatchObject({ documentId: b });
      expect(frDraft.sharedLabel).toMatchObject({ documentId: b });
      expect(frDraft.label).toMatchObject({ documentId: b });

      // First publish of fr inherits the non-localized component from published en
      await strapi.documents(PAGE_UID).publish({ documentId: p, locale: 'fr' });

      const frLive = await find(PAGE_UID, p, 'published', populate, 'fr');
      expect(frLive.shared).toMatchObject({ marker: 'en' });
      expect(frLive.shared.label).toBeNull();
      expect(frLive.sharedLabel).toBeNull();
      expect(frLive.label).toBeNull();

      await publishLabel(b);

      const fr = await find(PAGE_UID, p, 'published', populate, 'fr');
      const en = await find(PAGE_UID, p, 'published', populate, 'en');
      // The inherited component never had the link in a published version
      expect(fr.shared).toMatchObject({ marker: 'en' });
      expect(fr.shared.label).toBeNull();
      expect(en.shared.label).toBeNull();
      // Relations belong to the fr row, which dropped them: both are restored
      expect(fr.label).toMatchObject({ documentId: b });
      expect(fr.sharedLabel).toMatchObject({ documentId: b });
      expect(en.label).toBeNull();
      expect(en.sharedLabel).toBeNull();
      expect(await countRecordsOf(PAGE_UID, p)).toBe(0);
    });
  });

  describe('cleanup of the records', () => {
    it('does not record links of content types without relations', async () => {
      const section = (n: number) => ({
        heading: `h${n}`,
        single: { text: `s${n}` },
        items: [{ text: `a${n}` }, { text: `b${n}` }],
      });
      const entry = await strapi.documents(PLAIN_UID).create({
        data: {
          title: 'p',
          sections: [section(1), section(2)],
          blocks: [
            { __component: SECTION_COMPONENT_UID, ...section(3) },
            { __component: ITEM_COMPONENT_UID, text: 'i' },
          ],
        },
      } as any);
      const p = entry.documentId;
      const populate = {
        sections: { populate: { items: true, single: true } },
        blocks: {
          on: {
            [SECTION_COMPONENT_UID]: { populate: { items: true } },
            [ITEM_COMPONENT_UID]: true,
          },
        },
      };

      await strapi.documents(PLAIN_UID).publish({ documentId: p });
      const published = await find(PLAIN_UID, p, 'published', populate);
      expect(published.sections).toHaveLength(2);
      expect(published.sections[0].items).toHaveLength(2);
      expect(published.blocks).toHaveLength(2);

      await strapi.documents(PLAIN_UID).update({
        documentId: p,
        data: { title: 'edited', sections: [section(4)] },
      } as any);
      await strapi.documents(PLAIN_UID).publish({ documentId: p });
      const republished = await find(PLAIN_UID, p, 'published', populate);
      expect(republished.title).toBe('edited');
      expect(republished.sections).toHaveLength(1);
      expect(republished.sections[0].heading).toBe('h4');

      await strapi.documents(PLAIN_UID).unpublish({ documentId: p });
      expect(await find(PLAIN_UID, p, 'published', populate)).toBeNull();
      expect(await find(PLAIN_UID, p, 'draft', populate)).not.toBeNull();

      expect(await countRecords({ rootUid: PLAIN_UID })).toBe(0);
      expect(await pending().count({})).toBe(0);
    });

    it('handles a plain Draft & Publish source and target end to end', async () => {
      const b = await createLabel();
      const gallery = await strapi
        .documents(GALLERY_UID)
        .create({ data: { title: 'g', label: { documentId: b } } } as any);
      const g = gallery.documentId;
      const populate = { label: true };

      await strapi.documents(GALLERY_UID).publish({ documentId: g });
      expect((await find(GALLERY_UID, g, 'published', populate)).label).toBeNull();
      expect(await countRecordsOf(GALLERY_UID, g)).toBe(1);
      expect(await countRecordsTargeting(LABEL_UID, b)).toBe(1);

      await publishLabel(b);
      expect((await find(GALLERY_UID, g, 'published', populate)).label).toMatchObject({
        documentId: b,
      });
      expect(await countRecordsOf(GALLERY_UID, g)).toBe(0);

      await strapi.documents(LABEL_UID).unpublish({ documentId: b });
      expect((await find(GALLERY_UID, g, 'published', populate)).label).toBeNull();

      await publishLabel(b);
      expect((await find(GALLERY_UID, g, 'published', populate)).label).toMatchObject({
        documentId: b,
      });
      expect(await countRecordsOf(GALLERY_UID, g)).toBe(0);

      // Delete a source that still has a record
      const b2 = await createLabel();
      const g2 = (
        await strapi
          .documents(GALLERY_UID)
          .create({ data: { title: 'g2', label: { documentId: b2 } } } as any)
      ).documentId;
      await strapi.documents(GALLERY_UID).publish({ documentId: g2 });
      expect(await countRecordsOf(GALLERY_UID, g2)).toBe(1);

      await strapi.documents(GALLERY_UID).delete({ documentId: g2 });
      expect(await countRecordsOf(GALLERY_UID, g2)).toBe(0);
    });

    it('clears the records of a deleted source and of a deleted target, keeping others', async () => {
      const b1 = await createLabel();
      const b2 = await createLabel();
      const keep = await createLabel();
      const make = async (label: string) =>
        (
          await strapi
            .documents(GALLERY_UID)
            .create({ data: { title: 'g', label: { documentId: label } } } as any)
        ).documentId;
      const a1 = await make(b1);
      const a2 = await make(b2);
      const a3 = await make(keep);
      for (const a of [a1, a2, a3]) {
        await strapi.documents(GALLERY_UID).publish({ documentId: a });
      }
      expect(await countRecords({})).toBe(3);

      // Delete the source
      await strapi.documents(GALLERY_UID).delete({ documentId: a1 });
      expect(await countRecordsOf(GALLERY_UID, a1)).toBe(0);
      expect(await countRecordsTargeting(LABEL_UID, b1)).toBe(0);

      // Delete the target that was never published
      await strapi.documents(LABEL_UID).delete({ documentId: b2 });
      expect(await countRecordsTargeting(LABEL_UID, b2)).toBe(0);
      expect(await countRecordsOf(GALLERY_UID, a2)).toBe(0);

      // Unrelated record is kept and still restored
      expect(await countRecordsOf(GALLERY_UID, a3)).toBe(1);
      await publishLabel(keep);
      expect((await find(GALLERY_UID, a3, 'published', { label: true })).label).toMatchObject({
        documentId: keep,
      });
    });

    it('clears the records of an unpublished locale and keeps those of the locale that stays', async () => {
      const b = await createLabel();
      const page = await strapi.documents(PAGE_UID).create({
        data: { title: 'en', label: { documentId: b } },
        locale: 'en',
      } as any);
      const p = page.documentId;
      await strapi.documents(PAGE_UID).update({
        documentId: p,
        locale: 'fr',
        data: { title: 'fr', label: { documentId: b } },
      } as any);
      await strapi.documents(PAGE_UID).publish({ documentId: p, locale: 'en' });
      await strapi.documents(PAGE_UID).publish({ documentId: p, locale: 'fr' });
      expect(await countRecordsOf(PAGE_UID, p, 'en')).toBe(1);
      expect(await countRecordsOf(PAGE_UID, p, 'fr')).toBe(1);

      await strapi.documents(PAGE_UID).unpublish({ documentId: p, locale: 'fr' });

      expect(await countRecordsOf(PAGE_UID, p, 'fr')).toBe(0);
      expect(await countRecordsOf(PAGE_UID, p, 'en')).toBe(1);

      await publishLabel(b);

      const populate = { label: true };
      expect((await find(PAGE_UID, p, 'published', populate, 'en')).label).toMatchObject({
        documentId: b,
      });
      expect(await find(PAGE_UID, p, 'published', populate, 'fr')).toBeNull();
      expect(await countRecordsOf(PAGE_UID, p)).toBe(0);
    });

    // Keep last: removes the fr locale and its entries
    it('clears the records of a deleted locale, as root and as target', async () => {
      const locales = strapi.plugin('i18n').service('locales');
      const tag = await createTag('en');
      await strapi.documents(TAG_UID).update({
        documentId: tag,
        locale: 'fr',
        data: { name: 'fr' },
      } as any);

      const page = await strapi.documents(PAGE_UID).create({
        data: { title: 'en', tag: { documentId: tag, locale: 'en' } },
        locale: 'en',
      } as any);
      const p = page.documentId;
      await strapi.documents(PAGE_UID).update({
        documentId: p,
        locale: 'fr',
        data: { title: 'fr', tag: { documentId: tag, locale: 'fr' } },
      } as any);
      await strapi.documents(PAGE_UID).publish({ documentId: p, locale: 'en' });
      await strapi.documents(PAGE_UID).publish({ documentId: p, locale: 'fr' });

      // Preconditions: one record per locale, the fr one targets the fr tag
      expect(await countRecords({ rootLocale: 'fr', targetLocale: 'fr' })).toBe(1);
      expect(await countRecords({ rootLocale: 'en', targetLocale: 'en' })).toBe(1);

      const fr = await locales.findByCode('fr');
      try {
        await locales.delete({ id: fr.id });

        expect(await countRecords({ rootLocale: 'fr' })).toBe(0);
        expect(await countRecords({ targetLocale: 'fr' })).toBe(0);
        // The other locale keeps its record
        expect(await countRecords({ rootLocale: 'en', targetLocale: 'en' })).toBe(1);
      } finally {
        if (!(await locales.findByCode('fr'))) {
          await locales.create({ name: 'Fr', code: 'fr' });
        }
      }
    });
  });
});
