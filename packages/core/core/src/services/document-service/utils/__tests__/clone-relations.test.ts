import type { Core } from '@strapi/types';

import {
  applyDeferredCloneRelationCopies,
  applyPostCloneRelationUpdates,
  prepareCloneData,
  type PostCloneRelationUpdate,
} from '../clone-relations';

const ARTICLE = 'api::article.article';
const TAG = 'api::tag.tag';
const DETAILS = 'default.details';
const BLOCK = 'default.block';
const OTHER = 'default.other';

const tagModel = {
  uid: TAG,
  modelType: 'contentType',
  options: { draftAndPublish: true },
  pluginOptions: { i18n: { localized: true } },
  attributes: { name: { type: 'string' } },
};

const detailsModel = {
  uid: DETAILS,
  modelType: 'component',
  attributes: {
    label: { type: 'string' },
    tag: {
      type: 'relation',
      relation: 'oneToOne',
      target: TAG,
      inversedBy: 'article',
    },
  },
};

const articleModel = {
  uid: ARTICLE,
  modelType: 'contentType',
  options: { draftAndPublish: false },
  pluginOptions: { i18n: { localized: true } },
  attributes: {
    title: { type: 'string' },
    author: {
      type: 'relation',
      relation: 'oneToOne',
      target: TAG,
      inversedBy: 'article',
    },
    legacyAuthor: {
      type: 'relation',
      relation: 'oneToOne',
      target: TAG,
      inversedBy: 'legacyArticle',
      useJoinTable: false,
    },
    picture: { type: 'relation', relation: 'morphToOne' },
    caption: { type: 'relation', relation: 'morphToOne' },
    kids: {
      type: 'relation',
      relation: 'oneToMany',
      target: TAG,
      mappedBy: 'parent',
    },
    category: { type: 'relation', relation: 'manyToOne', target: TAG },
    note: {
      type: 'relation',
      relation: 'oneToOne',
      target: TAG,
      useJoinTable: false,
    },
    details: { type: 'component', component: DETAILS, repeatable: false },
  },
};

const models: Record<string, unknown> = {
  [ARTICLE]: articleModel,
  [TAG]: tagModel,
  [DETAILS]: detailsModel,
  [BLOCK]: {
    uid: BLOCK,
    modelType: 'component',
    attributes: {
      tag: {
        type: 'relation',
        relation: 'oneToOne',
        target: TAG,
        useJoinTable: false,
      },
    },
  },
  [OTHER]: {
    uid: OTHER,
    modelType: 'component',
    attributes: { tag: { type: 'string' } },
  },
};

const getModel = (uid: string) => models[uid];

type QueryMocks = {
  findOne: jest.Mock;
  update: jest.Mock;
};

const createStrapi = (attributesByUid: Record<string, Record<string, unknown>>) => {
  const findOne = jest.fn(async ({ where }: { where: { documentId?: string } }) => {
    if (where.documentId === 'missing') {
      return undefined;
    }

    if (where.documentId === 'other') {
      return { id: 9 };
    }

    if (where.documentId === 'match') {
      return { id: 5 };
    }

    return { id: 7 };
  });
  const update = jest.fn(async () => ({}));
  const strapi = {
    getModel,
    localization: {
      isLocalizedContentType: (model: { pluginOptions?: { i18n?: { localized?: boolean } } }) =>
        model?.pluginOptions?.i18n?.localized === true,
      getDefaultLocale: () => 'en',
    },
    db: {
      metadata: {
        get: (uid: string) => ({
          tableName: 'entries',
          attributes: attributesByUid[uid] ?? {},
        }),
        identifiers: { ID_COLUMN: 'id' },
      },
      dialect: { getBatchInsertSize: () => 100 },
      transaction: jest.fn(async (run: (ctx: { trx: object }) => Promise<void>) =>
        run({ trx: {} })
      ),
      getConnection: jest.fn(),
      query: jest.fn(() => ({ findOne, update })),
    },
  };

  return { strapi: strapi as unknown as Core.Strapi, findOne, update };
};

const installStrapi = (attributesByUid: Record<string, Record<string, unknown>>): QueryMocks => {
  const created = createStrapi(attributesByUid);
  (global as unknown as { strapi: Core.Strapi }).strapi = created.strapi;
  return { findOne: created.findOne, update: created.update };
};

describe('clone relations', () => {
  describe('prepareCloneData', () => {
    it('defers unchanged owning relations, omits inverse lists, and keeps explicit edits', async () => {
      const result = await prepareCloneData(
        {
          title: 'Original',
          author: { id: 1, documentId: 'author' },
          legacyAuthor: { id: 3, documentId: 'legacy' },
          picture: null,
          caption: null,
          kids: [{ id: 4, documentId: 'kid' }],
          category: { id: 5, documentId: 'category' },
          details: { id: 11, label: 'Details', tag: { id: 2, documentId: 'nested' } },
        },
        {
          title: 'Clone',
          category: { connect: [] },
          note: { set: 4 },
          picture: { connect: [{ id: 9, __type: TAG }] },
          details: { label: 'Renamed' },
        },
        articleModel as never,
        getModel as never
      );

      expect(result.data.title).toBe('Clone');
      expect(result.data.category).toMatchObject({ id: 5, connect: [] });
      expect(result.data).not.toHaveProperty('author');
      expect(result.data).not.toHaveProperty('legacyAuthor');
      expect(result.data).not.toHaveProperty('picture');
      expect(result.data).not.toHaveProperty('caption');
      expect(result.data).not.toHaveProperty('kids');
      expect(result.data).not.toHaveProperty('note');
      expect(result.data.details).toEqual({ id: 11, label: 'Renamed' });

      expect(result.deferredCopies).toEqual([
        { schemaUid: ARTICLE, attributeName: 'author', kind: 'joinTable', ownerPath: null },
        { schemaUid: ARTICLE, attributeName: 'legacyAuthor', kind: 'fkColumn', ownerPath: null },
        { schemaUid: ARTICLE, attributeName: 'caption', kind: 'morphToOne', ownerPath: null },
        { schemaUid: DETAILS, attributeName: 'tag', kind: 'joinTable', ownerPath: 'details' },
      ]);
      expect(result.postCloneUpdates).toEqual([
        {
          dataPath: 'picture',
          value: { connect: [{ id: 9, __type: TAG }] },
          schemaUid: ARTICLE,
          ownerPath: null,
        },
        {
          dataPath: 'note',
          value: { set: 4 },
          schemaUid: ARTICLE,
          ownerPath: null,
        },
      ]);
    });
  });

  describe('applyDeferredCloneRelationCopies', () => {
    const attributes = {
      [ARTICLE]: { author: { type: 'string' } },
    };

    beforeEach(() => {
      installStrapi(attributes);
    });

    it('does nothing when there is nothing to copy', async () => {
      const { strapi } = createStrapi(attributes);
      await applyDeferredCloneRelationCopies(strapi, ARTICLE as never, 1, 2, {}, {}, []);
      expect(strapi.db.transaction).not.toHaveBeenCalled();
    });

    it('skips identical or replaced owners and copies the other kinds', async () => {
      const { strapi } = createStrapi(attributes);
      const original = {
        same: { id: 8 },
        replaced: { id: 1, __component: BLOCK },
        fkOwner: { id: 3 },
        morphOwner: { id: 5 },
      };
      const cloned = {
        same: { id: 8 },
        replaced: { id: 2, __component: OTHER },
        fkOwner: { id: 4 },
        morphOwner: { id: 6 },
      };

      await applyDeferredCloneRelationCopies(strapi, ARTICLE as never, 10, 20, original, cloned, [
        {
          schemaUid: ARTICLE as never,
          attributeName: 'author',
          kind: 'joinTable',
          ownerPath: null,
        },
        {
          schemaUid: ARTICLE as never,
          attributeName: 'author',
          kind: 'joinTable',
          ownerPath: 'same',
        },
        {
          schemaUid: ARTICLE as never,
          attributeName: 'author',
          kind: 'joinTable',
          ownerPath: 'replaced',
        },
        {
          schemaUid: ARTICLE as never,
          attributeName: 'legacyAuthor',
          kind: 'fkColumn',
          ownerPath: 'fkOwner',
        },
        {
          schemaUid: ARTICLE as never,
          attributeName: 'picture',
          kind: 'morphToOne',
          ownerPath: 'morphOwner',
        },
      ]);

      expect(strapi.db.transaction).not.toHaveBeenCalled();
    });

    it('throws when a nested owner has no id on the source or the clone', async () => {
      const { strapi } = createStrapi(attributes);
      const task = {
        schemaUid: ARTICLE as never,
        attributeName: 'author',
        kind: 'joinTable' as const,
        ownerPath: 'details',
      };

      await expect(
        applyDeferredCloneRelationCopies(
          strapi,
          ARTICLE as never,
          10,
          20,
          { details: {} },
          { details: { id: 2 } },
          [task]
        )
      ).rejects.toThrow('Unable to resolve clone relation owner for "author" at path "details"');

      await expect(
        applyDeferredCloneRelationCopies(
          strapi,
          ARTICLE as never,
          10,
          20,
          { details: { id: 1 } },
          { details: {} },
          [task]
        )
      ).rejects.toThrow('Unable to resolve clone relation owner for "author" at path "details"');
    });
  });

  describe('applyPostCloneRelationUpdates', () => {
    const fkAttribute = {
      type: 'relation',
      relation: 'oneToOne',
      target: TAG,
      useJoinTable: false,
    };
    const morphAttribute = { type: 'relation', relation: 'morphToOne' };
    const attributes = {
      [ARTICLE]: {
        legacyAuthor: fkAttribute,
        picture: morphAttribute,
        title: { type: 'string' },
      },
      [DETAILS]: { tag: fkAttribute },
      [BLOCK]: { tag: fkAttribute },
      [OTHER]: { tag: { type: 'string' } },
      [TAG]: { name: { type: 'string' } },
    };

    const clonedRoot = { locale: 'fr' };

    beforeEach(() => {
      installStrapi(attributes);
    });

    const apply = (
      updates: PostCloneRelationUpdate[],
      data: {
        original?: Record<string, unknown>;
        cloned?: Record<string, unknown>;
      } = {}
    ) => {
      const created = createStrapi(attributes);
      (global as unknown as { strapi: Core.Strapi }).strapi = created.strapi;
      return {
        ...created,
        result: applyPostCloneRelationUpdates(
          created.strapi,
          ARTICLE as never,
          10,
          20,
          { ...clonedRoot, ...data.cloned },
          data.original ?? {},
          updates
        ),
      };
    };

    it('does nothing when there are no updates', async () => {
      const { update, result } = apply([]);
      await result;
      expect(update).not.toHaveBeenCalled();
    });

    it('resolves a documentId set against the target draft and published rows', async () => {
      const { findOne, update, result } = apply([
        {
          dataPath: 'legacyAuthor',
          value: { set: ['doc-1'] },
          schemaUid: ARTICLE as never,
          ownerPath: null,
        },
      ]);

      await result;

      expect(findOne).toHaveBeenCalledWith({
        where: { documentId: 'doc-1', publishedAt: null, locale: 'fr' },
        select: ['id'],
      });
      expect(findOne).toHaveBeenCalledWith({
        where: { documentId: 'doc-1', publishedAt: { $ne: null }, locale: 'fr' },
        select: ['id'],
      });
      expect(update).toHaveBeenCalledWith({
        where: { id: 20 },
        data: { legacyAuthor: 7 },
      });
    });

    it('uses the last connected id and clears an explicit empty set', async () => {
      const connected = apply([
        {
          dataPath: 'legacyAuthor',
          value: { connect: [{ id: 4 }, 6] },
          schemaUid: ARTICLE as never,
          ownerPath: null,
        },
      ]);
      await connected.result;
      expect(connected.update).toHaveBeenCalledWith({
        where: { id: 20 },
        data: { legacyAuthor: 6 },
      });

      const cleared = apply([
        {
          dataPath: 'legacyAuthor',
          value: { set: null },
          schemaUid: ARTICLE as never,
          ownerPath: null,
        },
      ]);
      await cleared.result;
      expect(cleared.update).toHaveBeenCalledWith({
        where: { id: 20 },
        data: { legacyAuthor: null },
      });
    });

    it('keeps the original association when a disconnect does not match it', async () => {
      const { update, result } = apply(
        [
          {
            dataPath: 'legacyAuthor',
            value: { disconnect: [true, 8, 'abc'] },
            schemaUid: ARTICLE as never,
            ownerPath: null,
          },
        ],
        { original: { legacyAuthor: { id: 5 } } }
      );

      await result;
      expect(update).not.toHaveBeenCalled();
    });

    it('stops checking disconnect items after one match', async () => {
      const { update, result } = apply(
        [
          {
            dataPath: 'legacyAuthor',
            value: { disconnect: [{ id: 5 }, true] },
            schemaUid: ARTICLE as never,
            ownerPath: null,
          },
        ],
        { original: { legacyAuthor: { id: 5 } } }
      );

      await result;
      expect(update).toHaveBeenCalledWith({
        where: { id: 20 },
        data: { legacyAuthor: null },
      });
    });

    it('clears a morph association when the disconnected target matches', async () => {
      const { update, result } = apply(
        [
          {
            dataPath: 'picture',
            value: { disconnect: [{ __type: TAG, documentId: 'match' }] },
            schemaUid: ARTICLE as never,
            ownerPath: null,
          },
        ],
        { original: { picture: { id: 5, __type: TAG } } }
      );

      await result;
      expect(update).toHaveBeenCalledWith({
        where: { id: 20 },
        data: { picture: null },
      });
    });

    it('ignores a morph disconnect aimed at a different type or missing a type', async () => {
      const wrongType = apply(
        [
          {
            dataPath: 'picture',
            value: { disconnect: [{ __type: OTHER, id: 5 }] },
            schemaUid: ARTICLE as never,
            ownerPath: null,
          },
        ],
        { original: { picture: { id: 5, __type: TAG } } }
      );
      await wrongType.result;

      const missingType = apply(
        [
          {
            dataPath: 'picture',
            value: { disconnect: [{ id: 5 }] },
            schemaUid: ARTICLE as never,
            ownerPath: null,
          },
        ],
        { original: { picture: { id: 5, __type: TAG } } }
      );
      await missingType.result;

      expect(wrongType.update).not.toHaveBeenCalled();
      expect(missingType.update).not.toHaveBeenCalled();
    });

    it('ignores a disconnect on a relation that has no target', async () => {
      const created = createStrapi({
        [ARTICLE]: {
          legacyAuthor: { type: 'relation', relation: 'oneToOne' },
        },
      });
      (global as unknown as { strapi: Core.Strapi }).strapi = created.strapi;

      await applyPostCloneRelationUpdates(
        created.strapi,
        ARTICLE as never,
        10,
        20,
        clonedRoot,
        { legacyAuthor: { id: 5 } },
        [
          {
            dataPath: 'legacyAuthor',
            value: { disconnect: [{ id: 1 }] },
            schemaUid: ARTICLE as never,
            ownerPath: null,
          },
        ]
      );

      expect(created.update).not.toHaveBeenCalled();
    });

    it('leaves the relation untouched when the disconnect list is empty', async () => {
      const { update, result } = apply([
        {
          dataPath: 'legacyAuthor',
          value: { disconnect: [] },
          schemaUid: ARTICLE as never,
          ownerPath: null,
        },
      ]);

      await result;
      expect(update).not.toHaveBeenCalled();
    });

    it('throws when an unmatched disconnect has no source row to copy from', async () => {
      const { result } = apply(
        [
          {
            dataPath: 'details.tag',
            value: { disconnect: [8] },
            schemaUid: DETAILS as never,
            ownerPath: 'details',
          },
        ],
        {
          original: { details: { tag: { id: 5 } } },
          cloned: { details: { id: 2, tag: { id: 5 } } },
        }
      );

      await expect(result).rejects.toThrow(
        'Unable to restore clone relation "tag" after unmatched disconnect'
      );
    });

    it('throws when the cloned owner cannot be resolved', async () => {
      const { result } = apply(
        [
          {
            dataPath: 'details.tag',
            value: { set: 1 },
            schemaUid: DETAILS as never,
            ownerPath: 'details',
          },
        ],
        { cloned: { details: {} }, original: { details: { id: 1 } } }
      );

      await expect(result).rejects.toThrow(
        'Unable to resolve clone relation owner for "tag" at path "details"'
      );
    });

    it('rejects an inline morph connect that does not name its target type', async () => {
      const { result } = apply([
        {
          dataPath: 'picture',
          value: { connect: { id: 1 } },
          schemaUid: ARTICLE as never,
          ownerPath: null,
        },
      ]);

      await expect(result).rejects.toThrow('Inline morphToOne clone update requires __type');
    });

    it('rejects an update whose attribute is not a relation', async () => {
      const { result } = apply([
        {
          dataPath: 'title',
          value: { set: 1 },
          schemaUid: ARTICLE as never,
          ownerPath: null,
        },
      ]);

      await expect(result).rejects.toThrow(
        `Unable to resolve clone relation attribute "title" on "${ARTICLE}"`
      );
    });

    it('skips an update when the replacement component no longer has that relation', async () => {
      const { update, result } = apply(
        [
          {
            dataPath: 'sections.0.tag',
            value: { set: 1 },
            schemaUid: BLOCK as never,
            ownerPath: 'sections.0',
          },
        ],
        {
          original: { sections: [{ id: 1, __component: BLOCK }] },
          cloned: { sections: [{ id: 2, __component: OTHER }] },
        }
      );

      await result;
      expect(update).not.toHaveBeenCalled();
    });

    it('applies the update on the replacement component when that component has the relation', async () => {
      const { update, result } = apply(
        [
          {
            dataPath: 'sections.0.tag',
            value: { set: null },
            schemaUid: OTHER as never,
            ownerPath: 'sections.0',
          },
        ],
        {
          original: { sections: [{ id: 1, __component: OTHER, tag: { id: 5 } }] },
          cloned: { sections: [{ id: 2, __component: BLOCK }] },
        }
      );

      await result;
      expect(update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { tag: null },
      });
    });
  });
});
