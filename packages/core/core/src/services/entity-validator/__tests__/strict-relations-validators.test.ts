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
        // The validator's `relations-test` calls `count()` on the resolved relations to
        // check they exist. Return the number of ids queried so present relations are
        // treated as existing (an empty relation set queries an empty `$in` → 0).
        query: () => ({
          count: async ({ where }: any = {}) => where?.id?.$in?.length ?? 0,
        }),
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

  describe('Update semantics (partial updates)', () => {
    test('strict + non-draft + absent key → passes (media, keep existing)', async () => {
      global.strapi.getModel = () => singleMediaModel;

      const data = await entityValidator.validateEntityUpdate(
        singleMediaModel,
        {},
        { strictRelations: true }
      );
      expect(data).toEqual({});
    });

    test('strict + non-draft + absent key → passes (relation, keep existing)', async () => {
      global.strapi.getModel = () => requiredRelationModel;

      const data = await entityValidator.validateEntityUpdate(
        requiredRelationModel,
        {},
        { strictRelations: true }
      );
      expect(data).toEqual({});
    });

    test('strict + non-draft + explicit null → throws (relation emptied)', async () => {
      global.strapi.getModel = () => requiredRelationModel;
      expect.hasAssertions();

      await expect(
        entityValidator.validateEntityUpdate(
          requiredRelationModel,
          { author: null },
          { strictRelations: true }
        )
      ).rejects.toMatchObject({ name: 'ValidationError' });
    });

    test('strict + non-draft + [] → throws (relation emptied)', async () => {
      global.strapi.getModel = () => requiredManyRelationModel;
      expect.hasAssertions();

      await expect(
        entityValidator.validateEntityUpdate(
          requiredManyRelationModel,
          { authors: [] },
          { strictRelations: true }
        )
      ).rejects.toMatchObject({ name: 'ValidationError' });
    });

    test('strict + non-draft + { set: [] } → throws (relation emptied)', async () => {
      global.strapi.getModel = () => requiredRelationModel;
      expect.hasAssertions();

      await expect(
        entityValidator.validateEntityUpdate(
          requiredRelationModel,
          { author: { set: [] } },
          { strictRelations: true }
        )
      ).rejects.toMatchObject({ name: 'ValidationError' });
    });

    test('strict + non-draft + { connect: [] } → passes (no-op)', async () => {
      global.strapi.getModel = () => requiredRelationModel;

      const data = await entityValidator.validateEntityUpdate(
        requiredRelationModel,
        { author: { connect: [] } },
        { strictRelations: true }
      );
      expect(data).toEqual({ author: { connect: [] } });
    });
  });

  describe('Required relations/media nested in components and dynamic zones', () => {
    const componentUid = 'default.meta';

    // Component with a required relation inside it.
    const metaComponent: Schema.Struct.ComponentSchema = {
      modelType: 'component',
      uid: componentUid as any,
      modelName: 'meta',
      globalId: 'ComponentDefaultMeta',
      category: 'default',
      info: { displayName: 'Meta' },
      attributes: {
        owner: {
          type: 'relation',
          relation: 'oneToOne',
          target: 'api::author.author',
          required: true,
        } as Schema.Attribute.Relation,
      },
    };

    const singleComponentModel: Schema.ContentType = {
      ...modelBase,
      attributes: {
        meta: {
          type: 'component',
          repeatable: false,
          component: componentUid,
          required: true,
        } as Schema.Attribute.Component<any, false>,
      },
    };

    const repeatableComponentModel: Schema.ContentType = {
      ...modelBase,
      attributes: {
        metas: {
          type: 'component',
          repeatable: true,
          component: componentUid,
          required: true,
        } as Schema.Attribute.Component<any, true>,
      },
    };

    const dzModel: Schema.ContentType = {
      ...modelBase,
      attributes: {
        zone: {
          type: 'dynamiczone',
          components: [componentUid],
          required: true,
        } as Schema.Attribute.DynamicZone,
      },
    };

    // Resolve either the outer content type (by uid) or the component (by its uid).
    const getModelFor =
      (outer: Schema.ContentType) =>
      (uid: string): any =>
        uid === componentUid ? metaComponent : outer;

    beforeEach(() => {
      global.strapi.components = { [componentUid]: metaComponent } as any;
    });

    test('single component: required relation empty → throws (strict, non-draft)', async () => {
      global.strapi.getModel = getModelFor(singleComponentModel);
      expect.hasAssertions();

      await expect(
        entityValidator.validateEntityCreation(
          singleComponentModel,
          { meta: { owner: null } },
          { strictRelations: true }
        )
      ).rejects.toMatchObject({ name: 'ValidationError' });
    });

    test('single component: required relation present → passes', async () => {
      global.strapi.getModel = getModelFor(singleComponentModel);

      const data = await entityValidator.validateEntityCreation(
        singleComponentModel,
        { meta: { owner: 1 } },
        { strictRelations: true }
      );
      expect(data).toMatchObject({ meta: { owner: 1 } });
    });

    test('single component: draft → not enforced', async () => {
      global.strapi.getModel = getModelFor(singleComponentModel);

      const data = await entityValidator.validateEntityCreation(
        singleComponentModel,
        { meta: { owner: null } },
        { strictRelations: true, isDraft: true }
      );
      expect(data).toMatchObject({ meta: { owner: null } });
    });

    test('single component: flag off → not enforced', async () => {
      global.strapi.getModel = getModelFor(singleComponentModel);

      const data = await entityValidator.validateEntityCreation(singleComponentModel, {
        meta: { owner: null },
      });
      expect(data).toMatchObject({ meta: { owner: null } });
    });

    test('repeatable component: required relation empty in an item → throws', async () => {
      global.strapi.getModel = getModelFor(repeatableComponentModel);
      expect.hasAssertions();

      await expect(
        entityValidator.validateEntityCreation(
          repeatableComponentModel,
          { metas: [{ owner: 1 }, { owner: null }] },
          { strictRelations: true }
        )
      ).rejects.toMatchObject({ name: 'ValidationError' });
    });

    test('dynamic zone: required relation empty in a component → throws', async () => {
      global.strapi.getModel = getModelFor(dzModel);
      expect.hasAssertions();

      await expect(
        entityValidator.validateEntityCreation(
          dzModel,
          { zone: [{ __component: componentUid, owner: null }] },
          { strictRelations: true }
        )
      ).rejects.toMatchObject({ name: 'ValidationError' });
    });

    test('dynamic zone: draft → not enforced', async () => {
      global.strapi.getModel = getModelFor(dzModel);

      const data = await entityValidator.validateEntityCreation(
        dzModel,
        { zone: [{ __component: componentUid, owner: null }] },
        { strictRelations: true, isDraft: true }
      );
      expect(data).toMatchObject({ zone: [{ __component: componentUid, owner: null }] });
    });
  });
});
