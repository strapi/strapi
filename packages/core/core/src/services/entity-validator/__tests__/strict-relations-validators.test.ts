import type { Schema } from '@strapi/types';
import entityValidator from '..';

/**
 * Unit coverage for the `strictRelations` flag added for issue #24927.
 *
 * When `strictRelations` is on and the write is not a draft, required media and
 * required relations must be enforced (rejected when empty). Drafts stay lenient,
 * and legacy projects (flag off/unset) see no change.
 *
 * These cases only exercise EMPTY values, so the validator's `relations-test`
 * (which would hit `strapi.db.query().count()`) short-circuits on an empty
 * relations store — no db mock is required.
 */
describe('Entity validator - strictRelations', () => {
  const modelBase: Schema.ContentType = {
    modelType: 'contentType',
    uid: 'api::test.test',
    kind: 'collectionType',
    modelName: 'test',
    globalId: 'test',
    info: {
      displayName: 'Test',
      singularName: 'test',
      pluralName: 'tests',
    },
    options: {},
    attributes: {},
  };

  beforeEach(() => {
    global.strapi = {
      errors: {
        badRequest: jest.fn(),
      },
      getModel: () => modelBase,
      db: {
        // The validator's `relations-test` calls `count()` on the resolved relations.
        // An empty relation set queries with an empty `$in` and legitimately returns 0.
        query: () => ({ count: async () => 0 }),
      },
    } as any;
  });

  const singleMediaModel: Schema.ContentType = {
    ...modelBase,
    attributes: {
      cover: {
        type: 'media',
        multiple: false,
        required: true,
      } as Schema.Attribute.Media,
    },
  };

  const multipleMediaModel: Schema.ContentType = {
    ...modelBase,
    attributes: {
      gallery: {
        type: 'media',
        multiple: true,
        required: true,
      } as Schema.Attribute.Media,
    },
  };

  const requiredRelationModel: Schema.ContentType = {
    ...modelBase,
    attributes: {
      author: {
        type: 'relation',
        relation: 'oneToOne',
        target: 'api::author.author',
        required: true,
      } as Schema.Attribute.Relation,
    },
  };

  const requiredManyRelationModel: Schema.ContentType = {
    ...modelBase,
    attributes: {
      authors: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::author.author',
        required: true,
      } as Schema.Attribute.Relation,
    },
  };

  describe('Required single media', () => {
    test('strict + non-draft + empty → throws', async () => {
      global.strapi.getModel = () => singleMediaModel;
      expect.hasAssertions();

      await expect(
        entityValidator.validateEntityCreation(singleMediaModel, {}, { strictRelations: true })
      ).rejects.toMatchObject({ name: 'ValidationError' });
    });

    test('strict + non-draft + explicit null → throws', async () => {
      global.strapi.getModel = () => singleMediaModel;
      expect.hasAssertions();

      await expect(
        entityValidator.validateEntityCreation(
          singleMediaModel,
          { cover: null },
          { strictRelations: true }
        )
      ).rejects.toMatchObject({ name: 'ValidationError' });
    });

    test('strict + draft + empty → passes (drafts lenient)', async () => {
      global.strapi.getModel = () => singleMediaModel;

      const data = await entityValidator.validateEntityCreation(
        singleMediaModel,
        {},
        { strictRelations: true, isDraft: true }
      );
      expect(data).toEqual({});
    });

    test('flag off/unset + empty → passes (legacy)', async () => {
      global.strapi.getModel = () => singleMediaModel;

      const data = await entityValidator.validateEntityCreation(singleMediaModel, {});
      expect(data).toEqual({});
    });
  });

  describe('Required multiple media', () => {
    test('strict + non-draft + empty array → throws (min 1)', async () => {
      global.strapi.getModel = () => multipleMediaModel;
      expect.hasAssertions();

      await expect(
        entityValidator.validateEntityCreation(
          multipleMediaModel,
          { gallery: [] },
          { strictRelations: true }
        )
      ).rejects.toMatchObject({ name: 'ValidationError' });
    });

    test('strict + non-draft + absent → throws', async () => {
      global.strapi.getModel = () => multipleMediaModel;
      expect.hasAssertions();

      await expect(
        entityValidator.validateEntityCreation(multipleMediaModel, {}, { strictRelations: true })
      ).rejects.toMatchObject({ name: 'ValidationError' });
    });
  });

  describe('Required relation', () => {
    test('strict + non-draft + empty → throws', async () => {
      global.strapi.getModel = () => requiredRelationModel;
      expect.hasAssertions();

      await expect(
        entityValidator.validateEntityCreation(requiredRelationModel, {}, { strictRelations: true })
      ).rejects.toMatchObject({ name: 'ValidationError' });
    });

    test('strict + non-draft + empty to-many array → throws (min 1)', async () => {
      global.strapi.getModel = () => requiredManyRelationModel;
      expect.hasAssertions();

      await expect(
        entityValidator.validateEntityCreation(
          requiredManyRelationModel,
          { authors: [] },
          { strictRelations: true }
        )
      ).rejects.toMatchObject({ name: 'ValidationError' });
    });

    test('strict + draft + empty → passes (drafts lenient)', async () => {
      global.strapi.getModel = () => requiredRelationModel;

      const data = await entityValidator.validateEntityCreation(
        requiredRelationModel,
        {},
        { strictRelations: true, isDraft: true }
      );
      expect(data).toEqual({});
    });

    test('flag off/unset + empty → passes (legacy)', async () => {
      global.strapi.getModel = () => requiredRelationModel;

      const data = await entityValidator.validateEntityCreation(requiredRelationModel, {});
      expect(data).toEqual({});
    });
  });
});
