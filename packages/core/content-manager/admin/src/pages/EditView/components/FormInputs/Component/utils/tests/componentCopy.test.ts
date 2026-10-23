import {
  cloneComponentData,
  connectRelations,
  getComponentInstances,
  getComponentPreview,
  getRelationsToCopy,
  isComponentBlank,
} from '../componentCopy';

import type {
  ComponentsDictionary,
  Document,
  Schema,
} from '../../../../../../../hooks/useDocument';

const components = {
  'shared.link': {
    uid: 'shared.link',
    info: { displayName: 'Link' },
    attributes: {
      label: { type: 'string' },
      pages: { type: 'relation', relation: 'oneToMany', target: 'api::page.page' },
    },
  },
  'shared.card': {
    uid: 'shared.card',
    info: { displayName: 'Card' },
    attributes: {
      title: { type: 'string' },
      author: { type: 'relation', relation: 'oneToOne', target: 'api::author.author' },
      links: { type: 'component', component: 'shared.link', repeatable: true },
    },
  },
  'blocks.cards': {
    uid: 'blocks.cards',
    info: { displayName: 'Cards' },
    attributes: {
      heading: { type: 'string' },
      cards: { type: 'component', component: 'shared.card', repeatable: true },
    },
  },
  'blocks.hero': {
    uid: 'blocks.hero',
    info: { displayName: 'Hero' },
    attributes: {
      heading: { type: 'string' },
      // same field name as in `blocks.cards`, to make sure blocks of another kind are left out
      cards: { type: 'component', component: 'shared.card', repeatable: true },
    },
  },
  'shared.seo': {
    uid: 'shared.seo',
    info: { displayName: 'SEO' },
    attributes: {
      title: { type: 'string', default: 'Untitled page' },
      slug: { type: 'uid', targetField: 'title' },
      canonical: { type: 'string', unique: true },
      indexable: { type: 'boolean', default: true },
      links: { type: 'component', component: 'shared.link', repeatable: true },
    },
  },
  'shared.flag': {
    uid: 'shared.flag',
    info: { displayName: 'Flag' },
    attributes: {
      enabled: { type: 'boolean' },
      archived: { type: 'boolean', default: false },
    },
  },
} as unknown as ComponentsDictionary;

const schema = {
  attributes: {
    title: { type: 'string' },
    card: { type: 'component', component: 'shared.card', repeatable: false },
    links: { type: 'component', component: 'shared.link', repeatable: true },
    blocks: { type: 'dynamiczone', components: ['blocks.cards', 'blocks.hero', 'shared.link'] },
  },
} as unknown as Schema;

const MAIN_FIELDS: Record<string, string> = {
  'shared.link': 'label',
  'shared.card': 'title',
  'blocks.cards': 'heading',
};

const getMainField = (uid: string) => MAIN_FIELDS[uid];

const sourceDocument = {
  documentId: 'source',
  title: 'Source',
  card: { id: 1, title: 'Main card', author: { count: 1 }, links: [] },
  links: [
    { id: 10, label: 'First link', pages: { count: 2 } },
    { id: 11, label: '', pages: { count: 0 } },
  ],
  blocks: [
    {
      __component: 'blocks.cards',
      id: 20,
      heading: 'Featured',
      cards: [{ id: 2, title: 'Featured card', author: { count: 0 }, links: [] }],
    },
    { __component: 'shared.link', id: 12, label: 'Block link', pages: { count: 0 } },
    {
      __component: 'blocks.hero',
      id: 30,
      heading: 'Hero',
      cards: [{ id: 3, title: 'Hero card', author: { count: 0 }, links: [] }],
    },
    {
      __component: 'blocks.cards',
      id: 21,
      heading: '',
      cards: [
        { id: 4, title: 'Latest card', author: { count: 1 }, links: [] },
        {
          id: 5,
          title: 'Other card',
          author: { count: 0 },
          links: [{ id: 13, label: 'Nested link', pages: { count: 3 } }],
        },
      ],
    },
    { __component: 'shared.link', id: 14, label: 'Last block link', pages: { count: 1 } },
  ],
} as unknown as Document;

const getInstances = (
  args: Pick<
    Parameters<typeof getComponentInstances>[0],
    'componentUid' | 'mode' | 'sourceFieldName'
  > & { targetValues?: unknown }
) =>
  getComponentInstances({
    components,
    getMainField,
    schema,
    sourceDocument,
    targetValues: {},
    ...args,
  });

describe('componentCopy', () => {
  describe('getComponentInstances', () => {
    it('should return the component of a non-repeatable field', () => {
      const instances = getInstances({
        componentUid: 'shared.card',
        mode: 'component',
        sourceFieldName: 'card',
      });

      expect(instances).toEqual([
        {
          source: sourceDocument.card,
          label: 'Main card',
          parentLabel: undefined,
          sourcePath: 'card',
        },
      ]);
    });

    it('should return every component of a repeatable field', () => {
      const instances = getInstances({
        componentUid: 'shared.link',
        mode: 'component',
        sourceFieldName: 'links',
      });

      expect(instances.map(({ label, sourcePath }) => ({ label, sourcePath }))).toEqual([
        { label: 'First link', sourcePath: 'links.0' },
        // falls back to the display name when the main field is empty
        { label: 'Link 2', sourcePath: 'links.1' },
      ]);
    });

    it('should not label the components after their id when it is their main field', () => {
      const instances = getComponentInstances({
        componentUid: 'shared.link',
        components,
        // the main field of a component without any string attribute
        getMainField: () => 'id',
        mode: 'component',
        schema,
        sourceDocument,
        sourceFieldName: 'links',
        targetValues: {},
      });

      expect(instances.map(({ label }) => label)).toEqual(['Link 1', 'Link 2']);
    });

    it('should only return the components of the given kind from a dynamic zone', () => {
      const instances = getInstances({
        componentUid: 'shared.link',
        mode: 'dynamiczone',
        sourceFieldName: 'blocks',
      });

      expect(instances.map(({ label, sourcePath }) => ({ label, sourcePath }))).toEqual([
        { label: 'Block link', sourcePath: 'blocks.1' },
        { label: 'Last block link', sourcePath: 'blocks.4' },
      ]);
    });

    it('should search every block of the same kind when the field is nested in a dynamic zone', () => {
      const instances = getInstances({
        componentUid: 'shared.card',
        mode: 'component',
        // the block is the second one of the entry being edited, the first one of the source entry
        sourceFieldName: 'blocks.1.cards',
        targetValues: {
          blocks: [
            { __component: 'shared.link' },
            { __component: 'blocks.cards', heading: 'Being edited', cards: [] },
          ],
        },
      });

      expect(
        instances.map(({ label, parentLabel, sourcePath }) => ({ label, parentLabel, sourcePath }))
      ).toEqual([
        { label: 'Featured card', parentLabel: 'Featured', sourcePath: 'blocks.0.cards.0' },
        // the block has no heading, it's labelled after its component
        { label: 'Latest card', parentLabel: 'Cards 2', sourcePath: 'blocks.3.cards.0' },
        { label: 'Other card', parentLabel: 'Cards 2', sourcePath: 'blocks.3.cards.1' },
      ]);
    });

    it('should search every block when the field is nested in a repeatable component', () => {
      const instances = getInstances({
        componentUid: 'shared.link',
        mode: 'component',
        sourceFieldName: 'blocks.0.cards.5.links',
        targetValues: {
          blocks: [{ __component: 'blocks.cards', cards: [{}, {}, {}, {}, {}, { links: [] }] }],
        },
      });

      expect(
        instances.map(({ label, parentLabel, sourcePath }) => ({ label, parentLabel, sourcePath }))
      ).toEqual([
        { label: 'Nested link', parentLabel: 'Other card', sourcePath: 'blocks.3.cards.1.links.0' },
      ]);
    });

    it('should return nothing when the source entry does not have the component', () => {
      expect(
        getComponentInstances({
          componentUid: 'shared.card',
          components,
          getMainField,
          mode: 'component',
          schema,
          sourceDocument: { documentId: 'empty', card: null } as unknown as Document,
          sourceFieldName: 'card',
          targetValues: {},
        })
      ).toEqual([]);
    });
  });

  describe('getComponentPreview', () => {
    it('should list the filled scalar fields in the order of the given fields', () => {
      const [, , , block] = sourceDocument.blocks;

      expect(
        getComponentPreview(block.cards[0], 'shared.card', components, [
          { name: 'links', label: 'Links' },
          { name: 'author', label: 'Author' },
          { name: 'title', label: 'Title' },
        ])
      ).toEqual([{ name: 'title', label: 'Title', type: 'string', value: 'Latest card' }]);
    });

    it('should leave out the fields whose value is not copied', () => {
      const seo = {
        title: 'Home',
        slug: 'home',
        canonical: 'https://example.com',
        indexable: true,
      };

      expect(getComponentPreview(seo, 'shared.seo', components)).toEqual([
        { name: 'title', label: 'title', type: 'string', value: 'Home' },
        { name: 'indexable', label: 'indexable', type: 'boolean', value: true },
      ]);
    });

    it('should fall back to the schema and leave out empty values', () => {
      expect(
        getComponentPreview({ title: '', label: 'ignored' }, 'shared.card', components)
      ).toEqual([]);
      expect(getComponentPreview({ label: 'Docs' }, 'shared.link', components)).toEqual([
        { name: 'label', label: 'label', type: 'string', value: 'Docs' },
      ]);
    });
  });

  describe('isComponentBlank', () => {
    it('should be blank without any value', () => {
      expect(isComponentBlank(null, 'shared.card', components)).toBe(true);
      expect(isComponentBlank({ __temp_key__: 'a0' }, 'shared.card', components)).toBe(true);
      // the schema of a component served to the admin lists its ids among its attributes
      expect(
        isComponentBlank({ id: 8, documentId: 'abc', title: '' }, 'shared.card', {
          ...components,
          'shared.card': {
            ...components['shared.card'],
            attributes: {
              id: { type: 'integer' },
              documentId: { type: 'string' },
              ...components['shared.card'].attributes,
            },
          },
        } as unknown as ComponentsDictionary)
      ).toBe(true);
      expect(
        isComponentBlank(
          { title: '', author: { connect: [], disconnect: [] }, links: [] },
          'shared.card',
          components
        )
      ).toBe(true);
    });

    it('should hold content with a scalar, a relation or a filled nested component', () => {
      expect(isComponentBlank({ title: 'Hello' }, 'shared.card', components)).toBe(false);
      expect(
        isComponentBlank(
          { author: { connect: [{ id: 1 }], disconnect: [] } },
          'shared.card',
          components
        )
      ).toBe(false);
      expect(isComponentBlank({ author: { count: 1 } }, 'shared.card', components)).toBe(false);
      expect(isComponentBlank({ links: [{ label: '' }] }, 'shared.card', components)).toBe(true);
      expect(isComponentBlank({ links: [{ label: 'Docs' }] }, 'shared.card', components)).toBe(
        false
      );
    });

    it('should be blank while the values are the defaults of the schema', () => {
      // what a component holds right after it's added
      expect(
        isComponentBlank(
          { title: 'Untitled page', indexable: true, links: [] },
          'shared.seo',
          components
        )
      ).toBe(true);
      // `false` is content when the attribute defaults to `true`
      expect(isComponentBlank({ indexable: false }, 'shared.seo', components)).toBe(false);
      expect(isComponentBlank({ enabled: false, archived: false }, 'shared.flag', components)).toBe(
        true
      );
      expect(isComponentBlank({ enabled: true }, 'shared.flag', components)).toBe(false);
      expect(isComponentBlank({ title: 'Home', indexable: true }, 'shared.seo', components)).toBe(
        false
      );
      expect(isComponentBlank({ slug: 'home' }, 'shared.seo', components)).toBe(false);
    });
  });

  describe('getRelationsToCopy', () => {
    it('should list the relations of the component and of the ones nested in it', () => {
      const [, , , block] = sourceDocument.blocks;

      expect(getRelationsToCopy(block, 'blocks.cards', components)).toEqual([
        { model: 'shared.card', id: 4, targetField: 'author', path: ['cards', '0', 'author'] },
        {
          model: 'shared.link',
          id: 13,
          targetField: 'pages',
          path: ['cards', '1', 'links', '0', 'pages'],
        },
      ]);
    });

    it('should leave out empty relations', () => {
      expect(getRelationsToCopy(sourceDocument.links[1], 'shared.link', components)).toEqual([]);
    });

    it('should leave out the relation fields that are not part of the source', () => {
      // A role without read permission on a field does not get it back with the entry.
      const link = { id: 10, label: 'First link' };

      expect(getRelationsToCopy(link, 'shared.link', components)).toEqual([]);
      expect(getRelationsToCopy({ ...link, pages: null }, 'shared.link', components)).toEqual([]);
    });

    it('should leave out the relations of a component that was never saved', () => {
      expect(
        getRelationsToCopy({ label: 'New link', pages: { count: 1 } }, 'shared.link', components)
      ).toEqual([]);
    });
  });

  describe('connectRelations', () => {
    it('should connect the relations in order, without mutating the copy', () => {
      const copy = cloneComponentData(sourceDocument.blocks[3], 'blocks.cards', components);
      const relations = [
        { id: 1, documentId: 'page-1', locale: 'en', status: 'draft' as const, title: 'Home' },
        { id: 2, documentId: 'page-2', locale: 'en', status: 'draft' as const, title: 'About' },
      ];

      const path = ['cards', '1', 'links', '0', 'pages'];
      const connected = connectRelations(copy, path, relations);

      expect(copy.cards[1].links[0].pages).toEqual({ connect: [], disconnect: [] });
      expect(connected.cards[1].links[0].pages).toEqual({
        connect: [
          {
            ...relations[0],
            apiData: { id: 1, documentId: 'page-1', locale: 'en' },
            __temp_key__: 'a0',
          },
          {
            ...relations[1],
            apiData: { id: 2, documentId: 'page-2', locale: 'en' },
            __temp_key__: 'a1',
          },
        ],
        disconnect: [],
      });
    });
  });

  describe('cloneComponentData', () => {
    it('should remove the ids of the component and of the ones nested in it', () => {
      const copy = cloneComponentData(sourceDocument.blocks[3], 'blocks.cards', components);

      expect(copy).toEqual({
        heading: '',
        cards: [
          {
            __temp_key__: expect.any(String),
            title: 'Latest card',
            author: { connect: [], disconnect: [] },
            links: [],
          },
          {
            __temp_key__: expect.any(String),
            title: 'Other card',
            author: { connect: [], disconnect: [] },
            links: [
              {
                __temp_key__: expect.any(String),
                label: 'Nested link',
                pages: { connect: [], disconnect: [] },
              },
            ],
          },
        ],
      });
    });

    it('should not alter the source', () => {
      const [link] = sourceDocument.links;

      cloneComponentData(link, 'shared.link', components);

      expect(link).toEqual({ id: 10, label: 'First link', pages: { count: 2 } });
    });

    it('should blank the uid and unique values, including in nested components', () => {
      const seo = {
        id: 40,
        title: 'Home',
        slug: 'home',
        canonical: 'https://example.com',
        indexable: false,
        links: [{ id: 41, label: 'Docs', pages: { count: 0 } }],
      };
      const copy = cloneComponentData(seo, 'shared.seo', {
        ...components,
        'shared.link': {
          ...components['shared.link'],
          attributes: {
            ...components['shared.link'].attributes,
            label: { type: 'string', unique: true },
          },
        },
      } as unknown as ComponentsDictionary);

      expect(copy).toEqual({
        title: 'Home',
        slug: null,
        canonical: null,
        indexable: false,
        links: [
          {
            __temp_key__: expect.any(String),
            label: null,
            pages: { connect: [], disconnect: [] },
          },
        ],
      });
      // a value that was already empty stays as it is
      expect(cloneComponentData({ title: 'Home' }, 'shared.seo', components)).toEqual({
        title: 'Home',
      });
    });
  });
});
