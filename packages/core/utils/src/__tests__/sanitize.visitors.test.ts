import * as visitors from '../sanitize/visitors';
import * as contentTypeUtils from '../content-types';
import { sanitizers } from '../sanitize';
import { traverseQueryFilters } from '../traverse';
import traverseEntity from '../traverse-entity';
import { adminUserModel, articleModel, getModel } from './test-fixtures';

const { CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE } = contentTypeUtils.constants;

describe('Sanitize visitors util', () => {
  describe('removePrivate - removes private fields in relational filters', () => {
    const ctx = { schema: articleModel, getModel };

    test('removes private resetPasswordToken field from filters', async () => {
      const filters = {
        updatedBy: {
          resetPasswordToken: { $startsWith: 'abc' },
        },
      };

      const result = await traverseQueryFilters(visitors.removePrivate, ctx)(filters);

      expect(result).toEqual({ updatedBy: {} });
    });

    test('removes private email field from filters', async () => {
      const filters = {
        updatedBy: {
          email: { $contains: 'admin@' },
        },
      };

      const result = await traverseQueryFilters(visitors.removePrivate, ctx)(filters);

      expect(result).toEqual({ updatedBy: {} });
    });

    test('removes private isActive field from filters', async () => {
      const filters = {
        createdBy: {
          isActive: true,
        },
      };

      const result = await traverseQueryFilters(visitors.removePrivate, ctx)(filters);

      expect(result).toEqual({ createdBy: {} });
    });

    test('keeps public fields in filters', async () => {
      const filters = {
        updatedBy: {
          firstname: 'John',
        },
      };

      const result = await traverseQueryFilters(visitors.removePrivate, ctx)(filters);

      expect(result).toEqual({ updatedBy: { firstname: 'John' } });
    });

    test('removes only private fields, keeps public fields', async () => {
      const filters = {
        updatedBy: {
          firstname: 'John',
          email: { $contains: 'admin@' },
          resetPasswordToken: { $startsWith: 'abc' },
        },
      };

      const result = await traverseQueryFilters(visitors.removePrivate, ctx)(filters);

      expect(result).toEqual({ updatedBy: { firstname: 'John' } });
    });
  });

  describe('removePassword - removes password fields in relational filters', () => {
    const ctx = { schema: articleModel, getModel };

    test('removes password field from filters', async () => {
      const filters = {
        createdBy: {
          password: { $startsWith: '$2b$' },
        },
      };

      const result = await traverseQueryFilters(visitors.removePassword, ctx)(filters);

      expect(result).toEqual({ createdBy: {} });
    });
  });

  describe('defaultSanitizeFilters - integration test', () => {
    const ctx = { schema: articleModel, getModel };

    test('removes private fields from filters', async () => {
      const filters = {
        updatedBy: {
          resetPasswordToken: { $startsWith: 'abc' },
          firstname: 'John',
        },
      };

      const result = await sanitizers.defaultSanitizeFilters(ctx, filters);

      expect(result).toEqual({ updatedBy: { firstname: 'John' } });
    });

    test('removes password fields from filters', async () => {
      const filters = {
        createdBy: {
          password: { $startsWith: '$2b$' },
          lastname: 'Doe',
        },
      };

      const result = await sanitizers.defaultSanitizeFilters(ctx, filters);

      expect(result).toEqual({ createdBy: { lastname: 'Doe' } });
    });

    test('removes all sensitive fields, keeps only public fields', async () => {
      const filters = {
        updatedBy: {
          email: { $contains: 'admin@' },
          password: { $startsWith: '$2b$' },
          resetPasswordToken: { $startsWith: 'abc' },
          isActive: true,
          blocked: false,
          firstname: 'John',
          lastname: 'Doe',
        },
      };

      const result = await sanitizers.defaultSanitizeFilters(ctx, filters);

      expect(result).toEqual({
        updatedBy: {
          firstname: 'John',
          lastname: 'Doe',
        },
      });
    });

    test('handles nested $and/$or operators with sensitive fields', async () => {
      const filters = {
        $or: [
          { updatedBy: { resetPasswordToken: { $startsWith: 'abc' } } },
          { updatedBy: { firstname: 'John' } },
        ],
      };

      const result = await sanitizers.defaultSanitizeFilters(ctx, filters);

      expect(result).toEqual({
        $or: [{ updatedBy: { firstname: 'John' } }],
      });
    });
  });

  describe('defaultSanitizePopulate - nested filters/sort/fields within populate', () => {
    const categoryModel: any = {
      uid: 'api::category.category',
      modelType: 'contentType',
      kind: 'collectionType',
      info: { singularName: 'category', pluralName: 'categories', displayName: 'Category' },
      options: {},
      attributes: {
        id: { type: 'integer' },
        name: { type: 'string' },
        createdBy: { type: 'relation', relation: 'oneToOne', target: 'admin::user' },
        updatedBy: { type: 'relation', relation: 'oneToOne', target: 'admin::user' },
      },
    };

    const productModel: any = {
      uid: 'api::product.product',
      modelType: 'contentType',
      kind: 'collectionType',
      info: { singularName: 'product', pluralName: 'products', displayName: 'Product' },
      options: {},
      attributes: {
        id: { type: 'integer' },
        title: { type: 'string' },
        category: { type: 'relation', relation: 'manyToOne', target: 'api::category.category' },
      },
    };

    const modelsForPopulate: Record<string, any> = {
      'admin::user': adminUserModel,
      'api::category.category': categoryModel,
      'api::product.product': productModel,
    };

    const getModelForPopulate = (uid: string) => modelsForPopulate[uid];
    const ctx: any = { schema: productModel, getModel: getModelForPopulate };

    test('removes private fields from nested filters in populate', async () => {
      const populate = {
        category: {
          filters: {
            createdBy: {
              email: { $startsWith: 'admin' },
            },
          },
        },
      };

      const result = await sanitizers.defaultSanitizePopulate(ctx, populate);

      // The sanitizer removes private fields and also cleans up empty objects
      expect(result).toEqual({
        category: {
          filters: {},
        },
      });
    });

    test('removes private fields from nested sort in populate', async () => {
      const populate = {
        category: {
          sort: {
            createdBy: {
              resetPasswordToken: 'asc',
            },
          },
        },
      };

      const result = await sanitizers.defaultSanitizePopulate(ctx, populate);

      // The sanitizer removes private fields and sets empty relations to undefined
      expect(result).toEqual({
        category: {
          sort: {
            createdBy: undefined,
          },
        },
      });
    });

    test('keeps public fields in nested filters/sort', async () => {
      const populate = {
        category: {
          filters: {
            createdBy: {
              firstname: 'John',
            },
          },
          sort: {
            updatedBy: {
              lastname: 'asc',
            },
          },
        },
      };

      const result = await sanitizers.defaultSanitizePopulate(ctx, populate);

      expect(result).toEqual({
        category: {
          filters: {
            createdBy: {
              firstname: 'John',
            },
          },
          sort: {
            updatedBy: {
              lastname: 'asc',
            },
          },
        },
      });
    });

    test('removes password fields from nested filters in populate', async () => {
      const populate = {
        category: {
          filters: {
            createdBy: {
              password: { $startsWith: '$2' },
            },
          },
        },
      };

      const result = await sanitizers.defaultSanitizePopulate(ctx, populate);

      // The sanitizer removes password fields and also cleans up empty objects
      expect(result).toEqual({
        category: {
          filters: {},
        },
      });
    });
  });

  describe('removeRestrictedRelations', () => {
    const auth = {};
    const data = {};
    const creatorKeys = [CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE];
    const removeRestrictedRelationsFn = visitors.removeRestrictedRelations(auth);
    const attribute = {
      type: 'relation',
      relation: 'oneToOne',
      target: 'admin::user',
    };

    test('keeps creator relations with populateCreatorFields true', async () => {
      const remove = jest.fn();
      const set = jest.fn();
      const promises = creatorKeys.map(async (key) => {
        await removeRestrictedRelationsFn(
          {
            data,
            key,
            attribute,
            schema: {
              kind: 'collectionType',
              info: {
                singularName: 'test',
                pluralName: 'tests',
              },
              options: { populateCreatorFields: true },
              attributes: {},
            },
            value: {},
            path: {
              attribute: null,
              raw: null,
            },
          },
          { remove, set }
        );
      });
      await Promise.all(promises);

      expect(remove).toHaveBeenCalledTimes(0);
      expect(set).toHaveBeenCalledTimes(0);
    });

    test('removes creator relations with populateCreatorFields false', async () => {
      const remove = jest.fn();
      const set = jest.fn();
      const promises = creatorKeys.map(async (key) => {
        await removeRestrictedRelationsFn(
          {
            data,
            key,
            attribute,
            schema: {
              kind: 'collectionType',
              info: {
                singularName: 'test',
                pluralName: 'tests',
              },
              options: { populateCreatorFields: false },
              attributes: {},
            },
            value: {},
            path: {
              attribute: null,
              raw: null,
            },
          },
          { remove, set }
        );
      });
      await Promise.all(promises);

      expect(remove).toHaveBeenCalledTimes(creatorKeys.length);
      creatorKeys.forEach((key) => expect(remove).toHaveBeenCalledWith(key));
      expect(set).toHaveBeenCalledTimes(0);
    });
  });

  describe('strictParams visitor - removes fields not in schema', () => {
    const ctx = { schema: articleModel, getModel };

    test('removes unrecognized field at root level', async () => {
      const data = {
        title: 'Test Article',
        unrecognizedField: 'should be removed',
      };

      const result = await traverseEntity(visitors.removeUnrecognizedFields, ctx)(data);

      expect(result).toStrictEqual({ title: 'Test Article' });
    });

    test('keeps recognized fields', async () => {
      const data = {
        title: 'Test Article',
      };

      const result = await traverseEntity(visitors.removeUnrecognizedFields, ctx)(data);

      expect(result).toStrictEqual({ title: 'Test Article' });
    });

    test('removes multiple unrecognized fields', async () => {
      const data = {
        title: 'Test Article',
        unrecognizedField1: 'should be removed',
        unrecognizedField2: 'should also be removed',
      };

      const result = await traverseEntity(visitors.removeUnrecognizedFields, ctx)(data);

      expect(result).toStrictEqual({ title: 'Test Article' });
    });

    test('allows special relation reordering fields', async () => {
      const relationModel = {
        uid: 'api::relation.relation',
        modelType: 'contentType' as const,
        kind: 'collectionType' as const,
        info: { singularName: 'relation', pluralName: 'relations' },
        options: {},
        attributes: {
          id: { type: 'integer' },
          name: { type: 'string' },
        },
      };

      const articleWithRelation = {
        ...articleModel,
        attributes: {
          ...articleModel.attributes,
          relation: {
            type: 'relation',
            relation: 'manyToMany',
            target: 'api::relation.relation',
          },
        },
      };

      const getModelWithRelation = (uid: string) => {
        if (uid === 'api::relation.relation') {
          return relationModel;
        }
        return getModel(uid);
      };

      const data = {
        title: 'Test Article',
        relation: {
          connect: [{ id: 1 }],
          unrecognizedField: 'should be removed',
        },
      };

      const relationCtx = { schema: articleWithRelation, getModel: getModelWithRelation };
      const result = await traverseEntity(visitors.removeUnrecognizedFields, relationCtx)(data);

      expect(result).toStrictEqual({
        title: 'Test Article',
        relation: {
          connect: [{ id: 1 }],
        },
      });
    });

    test('keeps id fields in relation context', async () => {
      const relationModel = {
        uid: 'api::relation.relation',
        modelType: 'contentType' as const,
        kind: 'collectionType' as const,
        info: { singularName: 'relation', pluralName: 'relations' },
        options: {},
        attributes: {
          id: { type: 'integer' },
          name: { type: 'string' },
        },
      };

      const articleWithRelation = {
        ...articleModel,
        attributes: {
          ...articleModel.attributes,
          relation: {
            type: 'relation',
            relation: 'oneToOne',
            target: 'api::relation.relation',
          },
        },
      };

      const getModelWithRelation = (uid: string) => {
        if (uid === 'api::relation.relation') {
          return relationModel;
        }
        return getModel(uid);
      };

      const data = {
        title: 'Test Article',
        relation: {
          id: 1,
        },
      };

      const relationCtx = { schema: articleWithRelation, getModel: getModelWithRelation };
      const result = await traverseEntity(visitors.removeUnrecognizedFields, relationCtx)(data);

      expect(result).toStrictEqual(data);
    });

    test('keeps id in component data', async () => {
      const componentModel = {
        uid: 'default.component',
        modelType: 'component' as const,
        info: { singularName: 'component', pluralName: 'components' },
        options: {},
        attributes: {
          id: { type: 'integer' },
          name: { type: 'string' },
        },
      };

      const articleWithComponent = {
        ...articleModel,
        attributes: {
          ...articleModel.attributes,
          component: {
            type: 'component',
            component: 'default.component',
          },
        },
      };

      const getModelWithComponent = (uid: string) => {
        if (uid === 'default.component') {
          return componentModel;
        }
        return getModel(uid);
      };

      const data = {
        title: 'Test Article',
        component: {
          id: 1,
          name: 'Component Name',
        },
      };

      const componentCtx = { schema: articleWithComponent, getModel: getModelWithComponent };
      const result = await traverseEntity(visitors.removeUnrecognizedFields, componentCtx)(data);

      expect(result).toStrictEqual(data);
    });

    test('keeps id fields in media attribute context', async () => {
      const mediaModel = {
        uid: 'plugin::upload.file',
        modelType: 'contentType' as const,
        kind: 'collectionType' as const,
        info: { singularName: 'file', pluralName: 'files' },
        options: {},
        attributes: {
          id: { type: 'integer' },
          name: { type: 'string' },
          url: { type: 'string' },
        },
      };

      const articleWithMedia = {
        ...articleModel,
        attributes: {
          ...articleModel.attributes,
          image: {
            type: 'media',
            allowedTypes: ['images'],
          },
        },
      };

      const getModelWithMedia = (uid: string) => {
        if (uid === 'plugin::upload.file') {
          return mediaModel;
        }
        return getModel(uid);
      };

      const data = {
        title: 'Test Article',
        image: {
          id: 1,
        },
      };

      const mediaCtx = { schema: articleWithMedia, getModel: getModelWithMedia };
      const result = await traverseEntity(visitors.removeUnrecognizedFields, mediaCtx)(data);

      expect(result).toStrictEqual(data);
    });
  });
});
