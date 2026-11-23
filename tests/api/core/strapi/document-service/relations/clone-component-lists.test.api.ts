/**
 * A clone form submits the source values, with the id of each component, after the editor
 * added, removed or moved entries of a repeatable component or of a dynamic zone. What an
 * entry does not submit (a relation left alone, sent as `{ connect: [], disconnect: [] }`, a
 * media, a morph relation) must come from the source entry it is an edit of, not from the
 * source entry that sits at the same position.
 */
import type { Core, UID } from '@strapi/types';

import { testInTransaction } from '../../../../utils';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');

let strapi: Core.Strapi;
const builder = createTestBuilder();

const ENTRY_UID = 'api::clone-list-entry.clone-list-entry' as UID.ContentType;
const LOCALIZED_UID = 'api::clone-list-localized.clone-list-localized' as UID.ContentType;
const BRAND_UID = 'api::clone-list-brand.clone-list-brand' as UID.ContentType;
const ROW_UID = 'default.clone-list-row' as UID.Component;
const SECTION_UID = 'default.clone-list-section' as UID.Component;
const TEXT_UID = 'default.clone-list-text' as UID.Component;

type Named = { id: number; documentId: string; name: string };
type Row = {
  id: number;
  label: string;
  brand?: Named | null;
  brands?: Named[];
  owner?: Named | null;
  file?: Named | null;
};
type Section = { id: number; __component: string; title?: string; text?: string; rows?: Row[] };
type Entry = { documentId: string; rows: Row[]; sections: Section[] };

const brandModel = {
  attributes: {
    name: { type: 'string' },
  },
  draftAndPublish: false,
  displayName: 'Clone list brand',
  singularName: 'clone-list-brand',
  pluralName: 'clone-list-brands',
  description: '',
  collectionName: '',
};

const rowModel = {
  collectionName: 'components_clone_list_rows',
  attributes: {
    label: { type: 'string' },
    brand: { type: 'relation', relation: 'manyToOne', target: BRAND_UID },
    brands: { type: 'relation', relation: 'oneToMany', target: BRAND_UID },
    // Copied from the source row once the clone exists
    owner: { type: 'relation', relation: 'morphToOne' },
    file: { type: 'media', multiple: false },
  },
  displayName: 'clone-list-row',
};

const sectionModel = {
  collectionName: 'components_clone_list_sections',
  attributes: {
    title: { type: 'string' },
    rows: { type: 'component', component: ROW_UID, repeatable: true },
  },
  displayName: 'clone-list-section',
};

const textModel = {
  collectionName: 'components_clone_list_texts',
  attributes: {
    text: { type: 'string' },
    brand: { type: 'relation', relation: 'manyToOne', target: BRAND_UID },
  },
  displayName: 'clone-list-text',
};

const entryModel = {
  attributes: {
    name: { type: 'string' },
    rows: { type: 'component', component: ROW_UID, repeatable: true },
    sections: { type: 'dynamiczone', components: [SECTION_UID, TEXT_UID] },
  },
  draftAndPublish: true,
  displayName: 'Clone list entry',
  singularName: 'clone-list-entry',
  pluralName: 'clone-list-entries',
  description: '',
  collectionName: '',
};

const localizedModel = {
  attributes: {
    name: { type: 'string', pluginOptions: { i18n: { localized: true } } },
    rows: {
      type: 'component',
      component: ROW_UID,
      repeatable: true,
      pluginOptions: { i18n: { localized: true } },
    },
  },
  pluginOptions: { i18n: { localized: true } },
  draftAndPublish: true,
  displayName: 'Clone list localized',
  singularName: 'clone-list-localized',
  pluralName: 'clone-list-localizeds',
  description: '',
  collectionName: '',
};

const rowPopulate = { populate: { brand: true, brands: true, owner: true, file: true } };
const populate = {
  rows: rowPopulate,
  sections: {
    on: {
      [SECTION_UID]: { populate: { rows: rowPopulate } },
      [TEXT_UID]: { populate: { brand: true } },
    },
  },
} as const;

const UNTOUCHED = { connect: [], disconnect: [] };

let brands: Record<string, Named>;
let files: Record<string, Named>;

const createNamed = async (names: string[], create: (name: string) => Promise<Named>) => {
  const created = await Promise.all(names.map(create));
  return Object.fromEntries(created.map((item) => [item.name, item]));
};

const createBrand = (name: string) =>
  strapi.db.query(BRAND_UID).create({ data: { name, documentId: `brand-${name}` } });

const createFile = (name: string) =>
  strapi.db.query('plugin::upload.file').create({
    data: {
      name,
      hash: `${name}_hash`,
      ext: '.png',
      mime: 'image/png',
      size: 1,
      provider: 'local',
      url: `/uploads/${name}.png`,
      folderPath: '/',
    },
  });

/** A row in which everything is named after `name`. */
const sourceRow = (name: string) => ({
  label: name,
  brand: { documentId: brands[name].documentId },
  brands: [{ documentId: brands[name].documentId }],
  owner: { id: brands[name].id, __type: BRAND_UID },
  file: files[name].id,
});

/** What a clone form sends for a stored row whose relations and media were left alone. */
const formRow = (row: Row) => ({
  id: row.id,
  label: row.label,
  brand: UNTOUCHED,
  brands: UNTOUCHED,
});

/** What a clone form sends for a row added in the form. */
const newRow = (name: string) => ({
  label: name,
  brand: { connect: [{ documentId: brands[name].documentId }], disconnect: [] },
  brands: { connect: [{ documentId: brands[name].documentId }], disconnect: [] },
  file: files[name].id,
});

const formSection = (section: Section) =>
  section.__component === SECTION_UID
    ? {
        id: section.id,
        __component: section.__component,
        title: section.title,
        rows: section.rows!.map(formRow),
      }
    : {
        id: section.id,
        __component: section.__component,
        text: section.text,
        brand: UNTOUCHED,
      };

/** `label/brand/brands/owner/file`: the names differ when a row took the values of another. */
const describeRow = (row: Row) =>
  [
    row.label,
    row.brand?.name ?? '-',
    (row.brands ?? []).map((brand) => brand.name).join('+') || '-',
    row.owner?.name ?? '-',
    row.file?.name ?? '-',
  ].join('/');

/** A stored row that kept its own values. */
const own = (name: string) => [name, name, name, name, name].join('/');

/** A row added in the form: it has no morph relation. */
const added = (name: string) => [name, name, name, '-', name].join('/');

const describeSection = (section: Section & { brand?: Named | null }) =>
  section.__component === SECTION_UID
    ? { [section.title!]: section.rows!.map(describeRow) }
    : `${section.text}/${section.brand?.name ?? '-'}`;

const findEntry = async (documentId: string, uid = ENTRY_UID, locale?: string) =>
  (await strapi.documents(uid).findOne({
    documentId,
    status: 'draft',
    locale,
    populate: uid === ENTRY_UID ? populate : { rows: rowPopulate },
  } as any)) as unknown as Entry;

const createSource = async () => {
  const source = await strapi.documents(ENTRY_UID).create({
    data: {
      name: 'Source',
      rows: ['a', 'b', 'c', 'd', 'e'].map(sourceRow),
      sections: [
        { __component: SECTION_UID, title: 'first', rows: ['a', 'b', 'c'].map(sourceRow) },
        { __component: TEXT_UID, text: 'text', brand: { documentId: brands.f.documentId } },
        { __component: SECTION_UID, title: 'second', rows: ['d', 'e'].map(sourceRow) },
      ],
    } as any,
  });

  return findEntry(source.documentId);
};

const cloneSource = async (source: Entry, data: Record<string, unknown>) => {
  const result = await strapi.documents(ENTRY_UID).clone({
    documentId: source.documentId,
    data: { name: 'Clone', ...data } as any,
  });

  return findEntry(result!.documentId!);
};

const expectSourceUnchanged = async (source: Entry) => {
  expect(await findEntry(source.documentId)).toEqual(source);
};

describe('Document Service clone of edited component lists', () => {
  beforeAll(async () => {
    await builder
      .addContentType(brandModel)
      .addComponent(rowModel)
      .addComponent(sectionModel)
      .addComponent(textModel)
      .addContentTypes([entryModel, localizedModel])
      .addFixtures('plugin::i18n.locale', [{ name: 'Fr', code: 'fr' }])
      .build();

    strapi = await createStrapiInstance();

    const names = ['a', 'b', 'c', 'd', 'e', 'f', 'n'];
    brands = await createNamed(names, createBrand);
    files = await createNamed(names, createFile);
  });

  afterAll(async () => {
    await strapi.db.query(BRAND_UID).deleteMany({});
    await strapi.db
      .query('plugin::upload.file')
      .deleteMany({ where: { id: { $in: Object.values(files).map((file) => file.id) } } });
    await strapi.db.query('plugin::i18n.locale').deleteMany({ where: { code: { $ne: 'en' } } });
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('repeatable component', () => {
    type Edit = (rows: ReturnType<typeof formRow>[]) => unknown[];

    const cases: Array<[string, Edit, string[]]> = [
      ['unchanged', (rows) => rows, ['a', 'b', 'c', 'd', 'e'].map(own)],
      ['with an entry removed', ([a, , c, d, e]) => [a, c, d, e], ['a', 'c', 'd', 'e'].map(own)],
      ['with the last entry removed', (rows) => rows.slice(0, -1), ['a', 'b', 'c', 'd'].map(own)],
      [
        'with an entry added at the top',
        (rows) => [newRow('n'), ...rows],
        [added('n'), ...['a', 'b', 'c', 'd', 'e'].map(own)],
      ],
      [
        'with an entry added in the middle',
        ([a, b, ...rest]) => [a, b, newRow('n'), ...rest],
        [own('a'), own('b'), added('n'), own('c'), own('d'), own('e')],
      ],
      [
        'with the last entry moved to the top',
        ([a, b, c, d, e]) => [e, a, b, c, d],
        ['e', 'a', 'b', 'c', 'd'].map(own),
      ],
      [
        'with entries removed, added and moved at once',
        ([a, , c, , e]) => [e, newRow('n'), a, c],
        [own('e'), added('n'), own('a'), own('c')],
      ],
      ['with every entry removed', () => [], []],
    ];

    describe.each(cases)('%s', (_, edit, expected) => {
      testInTransaction('keeps each entry with its own relations and media', async () => {
        const source = await createSource();

        const clone = await cloneSource(source, { rows: edit(source.rows.map(formRow)) });

        expect(clone.rows.map(describeRow)).toEqual(expected);
        // The dynamic zone was not submitted: it is cloned as it is
        expect(clone.sections.map(describeSection)).toEqual(source.sections.map(describeSection));
        await expectSourceUnchanged(source);
      });
    });

    testInTransaction(
      'applies a relation and a media edit to the entry they were made on',
      async () => {
        const source = await createSource();
        const [a, b, c, d, e] = source.rows.map(formRow);

        const clone = await cloneSource(source, {
          rows: [
            {
              ...e,
              brand: {
                connect: [{ documentId: brands.n.documentId }],
                disconnect: [{ documentId: brands.e.documentId }],
              },
            },
            { ...a, file: { disconnect: [{ id: files.a.id }] } },
            { ...b, file: { connect: [{ id: files.n.id }] } },
            c,
            d,
          ],
        });

        expect(clone.rows.map(describeRow)).toEqual([
          'e/n/e/e/e',
          'a/a/a/a/-',
          'b/b/b/b/n',
          own('c'),
          own('d'),
        ]);
        await expectSourceUnchanged(source);
      }
    );

    testInTransaction('overlays by position a list submitted without ids', async () => {
      const source = await createSource();

      const clone = await cloneSource(source, { rows: [{ label: 'renamed' }] });

      expect(clone.rows.map(describeRow)).toEqual([
        'renamed/a/a/a/a',
        ...['b', 'c', 'd', 'e'].map(own),
      ]);
    });
  });

  describe('dynamic zone', () => {
    const first = (rows: string[]) => ({ first: rows });
    const second = (rows: string[]) => ({ second: rows });

    testInTransaction('keeps each entry with its own values when one is removed', async () => {
      const source = await createSource();
      const [, text, secondSection] = source.sections.map(formSection);

      const clone = await cloneSource(source, { sections: [text, secondSection] });

      expect(clone.sections.map(describeSection)).toEqual(['text/f', second(['d', 'e'].map(own))]);
      // The repeatable component was not submitted: it is cloned as it is
      expect(clone.rows.map(describeRow)).toEqual(['a', 'b', 'c', 'd', 'e'].map(own));
      await expectSourceUnchanged(source);
    });

    testInTransaction('keeps each entry with its own values when one is added', async () => {
      const source = await createSource();
      const newText = {
        __component: TEXT_UID,
        text: 'new',
        brand: { connect: [{ documentId: brands.n.documentId }], disconnect: [] },
      };

      const clone = await cloneSource(source, {
        sections: [newText, ...source.sections.map(formSection)],
      });

      expect(clone.sections.map(describeSection)).toEqual([
        'new/n',
        first(['a', 'b', 'c'].map(own)),
        'text/f',
        second(['d', 'e'].map(own)),
      ]);
      await expectSourceUnchanged(source);
    });

    testInTransaction('keeps each entry with its own values when they are moved', async () => {
      const source = await createSource();
      const [firstSection, text, secondSection] = source.sections.map(formSection);

      const clone = await cloneSource(source, { sections: [secondSection, firstSection, text] });

      expect(clone.sections.map(describeSection)).toEqual([
        second(['d', 'e'].map(own)),
        first(['a', 'b', 'c'].map(own)),
        'text/f',
      ]);
      await expectSourceUnchanged(source);
    });

    testInTransaction('keeps the entries of a nested list with their own values', async () => {
      const source = await createSource();
      const [firstSection, text, secondSection] = source.sections.map(formSection);
      const [a, , c] = firstSection.rows!;
      const [d, e] = secondSection.rows!;

      const clone = await cloneSource(source, {
        sections: [
          { ...secondSection, rows: [newRow('n'), e, d] },
          text,
          { ...firstSection, rows: [c, a] },
        ],
      });

      expect(clone.sections.map(describeSection)).toEqual([
        second([added('n'), own('e'), own('d')]),
        'text/f',
        first([own('c'), own('a')]),
      ]);
      await expectSourceUnchanged(source);
    });
  });

  describe('localized document', () => {
    testInTransaction(
      'lines up the locale the ids come from and overlays the others by position',
      async () => {
        const created = await strapi.documents(LOCALIZED_UID).create({
          locale: 'en',
          data: { name: 'Source', rows: ['a', 'b', 'c'].map(sourceRow) } as any,
        });
        await strapi.documents(LOCALIZED_UID).update({
          documentId: created.documentId,
          locale: 'fr',
          data: { name: 'Source fr', rows: ['d', 'e', 'f'].map(sourceRow) } as any,
        });
        const source = await findEntry(created.documentId, LOCALIZED_UID, 'en');
        const [a, b, c] = source.rows.map(formRow);

        const result = await strapi.documents(LOCALIZED_UID).clone({
          documentId: source.documentId,
          locale: '*',
          data: { rows: [c, a, b] } as any,
        });

        const english = await findEntry(result!.documentId!, LOCALIZED_UID, 'en');
        const french = await findEntry(result!.documentId!, LOCALIZED_UID, 'fr');

        expect(english.rows.map(describeRow)).toEqual(['c', 'a', 'b'].map(own));
        // The rows of a locale are other rows, with other ids: nothing tells which of them a
        // submitted row is an edit of, so the submitted values are laid over them in order.
        expect(french.rows.map(describeRow)).toEqual(['c/d/d/d/d', 'a/e/e/e/e', 'b/f/f/f/f']);
      }
    );
  });
});
