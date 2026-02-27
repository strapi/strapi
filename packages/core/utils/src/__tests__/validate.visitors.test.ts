import * as visitors from '../validate/visitors';
import * as contentTypeUtils from '../content-types';
import { ValidationError } from '../errors';
import { validators } from '../validate';
import { traverseQueryFilters } from '../traverse';
import traverseEntity from '../traverse-entity';
import { adminUserModel, articleModel, getModel } from './test-fixtures';

const { CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE } = contentTypeUtils.constants;

describe('Validate visitors util', () => {
  describe('throwPrivate - blocks private fields in relational filters', () => {
    const ctx = { schema: articleModel, getModel };

    test('throws ValidationError when filtering on private resetPasswordToken field', async () => {
      const filters = {
        updatedBy: {
          resetPasswordToken: { $startsWith: 'abc' },
        },
      };

      await expect(traverseQueryFilters(visitors.throwPrivate, ctx)(filters)).rejects.toThrow(
        ValidationError
      );
    });

    test('throws ValidationError when filtering on private email field', async () => {
      const filters = {
        updatedBy: {
          email: { $contains: 'admin@' },
        },
      };

      await expect(traverseQueryFilters(visitors.throwPrivate, ctx)(filters)).rejects.toThrow(
        ValidationError
      );
    });

    test('throws ValidationError when filtering on private isActive field', async () => {
      const filters = {
        createdBy: {
          isActive: true,
        },
      };

      await expect(traverseQueryFilters(visitors.throwPrivate, ctx)(filters)).rejects.toThrow(
        ValidationError
      );
    });

    test('allows filtering on public fields', async () => {
      const filters = {
        updatedBy: {
          firstname: 'John',
        },
      };

      await expect(
        traverseQueryFilters(visitors.throwPrivate, ctx)(filters)
      ).resolves.toBeDefined();
    });
  });

  describe('throwPassword - blocks password fields in relational filters', () => {
    const ctx = { schema: articleModel, getModel };

    test('throws ValidationError when filtering on password field', async () => {
      const filters = {
        createdBy: {
          password: { $startsWith: '$2b$' },
        },
      };

      await expect(traverseQueryFilters(visitors.throwPassword, ctx)(filters)).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('validateFilters - integration test', () => {
    const ctx = { schema: articleModel, getModel };

    const filtersValidationsWithPrivate = [
      'nonAttributesOperators',
      'dynamicZones',
      'morphRelations',
      'passwords',
      'private',
    ];

    const filtersValidationsWithoutPrivate = [
      'nonAttributesOperators',
      'dynamicZones',
      'morphRelations',
    ];

    test('blocks filtering on private fields when private validation is enabled', async () => {
      const filters = {
        updatedBy: {
          resetPasswordToken: { $startsWith: 'abc' },
        },
      };

      await expect(
        validators.validateFilters(ctx, filters, filtersValidationsWithPrivate)
      ).rejects.toThrow(ValidationError);
    });

    test('allows filtering on private fields when private validation is disabled', async () => {
      const filters = {
        updatedBy: {
          resetPasswordToken: { $startsWith: 'abc' },
        },
      };

      await expect(
        validators.validateFilters(ctx, filters, filtersValidationsWithoutPrivate)
      ).resolves.not.toThrow();
    });

    test('blocks filtering on password fields when passwords validation is enabled', async () => {
      const filters = {
        createdBy: {
          password: { $startsWith: '$2b$' },
        },
      };

      await expect(
        validators.validateFilters(ctx, filters, filtersValidationsWithPrivate)
      ).rejects.toThrow(ValidationError);
    });

    test('allows filtering on password fields when passwords validation is disabled', async () => {
      const filters = {
        createdBy: {
          password: { $startsWith: '$2b$' },
        },
      };

      await expect(
        validators.validateFilters(ctx, filters, filtersValidationsWithoutPrivate)
      ).resolves.not.toThrow();
    });
  });

  describe('defaultValidatePopulate - nested filters/sort/fields within populate', () => {
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

    test('throws ValidationError for private fields in nested filters within populate', async () => {
      const populate = {
        category: {
          filters: {
            createdBy: {
              email: { $startsWith: 'admin' },
            },
          },
        },
      };

      await expect(validators.defaultValidatePopulate(ctx, populate)).rejects.toThrow(
        ValidationError
      );
    });

    test('throws ValidationError for private fields in nested sort within populate', async () => {
      const populate = {
        category: {
          sort: {
            createdBy: {
              resetPasswordToken: 'asc',
            },
          },
        },
      };

      await expect(validators.defaultValidatePopulate(ctx, populate)).rejects.toThrow(
        ValidationError
      );
    });

    test('allows public fields in nested filters/sort within populate', async () => {
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

      await expect(validators.defaultValidatePopulate(ctx, populate)).resolves.not.toThrow();
    });

    test('throws ValidationError for password fields in nested filters within populate', async () => {
      const populate = {
        category: {
          filters: {
            createdBy: {
              password: { $startsWith: '$2' },
            },
          },
        },
      };

      await expect(validators.defaultValidatePopulate(ctx, populate)).rejects.toThrow(
        ValidationError
      );
    });
  });

  describe('throwRestrictedRelations', () => {
    const auth = {};
    const data = {};
    const creatorKeys = [CREATED_BY_ATTRIBUTE, UPDATED_BY_ATTRIBUTE];
    const throwRestrictedRelationsFn = visitors.throwRestrictedRelations(auth);
    const attribute = {
      type: 'relation',
      relation: 'oneToOne',
      target: 'admin::user',
    };

    test('keeps creator relations with populateCreatorFields true', async () => {
      const remove = jest.fn();
      const set = jest.fn();
      const promises = creatorKeys.map(async (key) => {
        await throwRestrictedRelationsFn(
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
    });

    test('throws on creator relations with populateCreatorFields false', async () => {
      const remove = jest.fn();
      const set = jest.fn();
      expect(async () => {
        const promises = creatorKeys.map(async (key) => {
          await throwRestrictedRelationsFn(
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
      }).rejects.toThrow(ValidationError);
    });
  });

  describe('throwUnrecognizedFields - throws error for fields not in schema', () => {
    const ctx = { schema: articleModel, getModel };

    test('throws error for unrecognized field at root level', async () => {
      const data = {
        title: 'Test Article',
        unrecognizedField: 'should throw error',
      };

      await expect(traverseEntity(visitors.throwUnrecognizedFields, ctx)(data)).rejects.toThrow(
        ValidationError
      );
    });

    test('allows recognized fields', async () => {
      const data = {
        title: 'Test Article',
      };

      await expect(
        traverseEntity(visitors.throwUnrecognizedFields, ctx)(data)
      ).resolves.toBeDefined();
    });

    test('throws error for unrecognized field in relation object with reordering', async () => {
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
          unrecognizedField: 'should throw error',
        },
      };

      const relationCtx = { schema: articleWithRelation, getModel: getModelWithRelation };

      await expect(
        traverseEntity(visitors.throwUnrecognizedFields, relationCtx)(data)
      ).rejects.toThrow(ValidationError);
    });

    test('includes path information in error message for invalid field', async () => {
      const componentModel = {
        uid: 'default.component',
        modelType: 'component' as const,
        info: { singularName: 'component', pluralName: 'components' },
        options: {},
        attributes: {
          name: { type: 'string' },
        },
      };

      const articleWithComponent = {
        ...articleModel,
        attributes: {
          ...articleModel.attributes,
          components: {
            type: 'component',
            component: 'default.component',
            repeatable: true,
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
        components: [
          {
            name: 'Component 1',
            invalidField: 'should throw error',
          },
        ],
      };

      const componentCtx = { schema: articleWithComponent, getModel: getModelWithComponent };

      try {
        await traverseEntity(visitors.throwUnrecognizedFields, componentCtx)(data);
        throw new Error('Expected ValidationError to be thrown');
      } catch (err) {
        const error = err as Error & { details?: { key?: string; path?: string } };

        expect(error.message).toMatch(/Invalid key invalidField at components/);
        expect(error.details?.key).toBe('invalidField');
        expect(error.details?.path).toBe('components');
      }
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
          disconnect: [{ id: 2 }],
        },
      };

      const relationCtx = { schema: articleWithRelation, getModel: getModelWithRelation };

      await expect(
        traverseEntity(visitors.throwUnrecognizedFields, relationCtx)(data)
      ).resolves.toBeDefined();
    });

    test('allows id fields in relation context', async () => {
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

      await expect(
        traverseEntity(visitors.throwUnrecognizedFields, relationCtx)(data)
      ).resolves.toBeDefined();
    });

    test('allows id in component data', async () => {
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

      await expect(
        traverseEntity(visitors.throwUnrecognizedFields, componentCtx)(data)
      ).resolves.toEqual(data);
    });

    test('allows component data without id field', async () => {
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
          name: 'Component Name',
        },
      };

      const componentCtx = { schema: articleWithComponent, getModel: getModelWithComponent };

      await expect(
        traverseEntity(visitors.throwUnrecognizedFields, componentCtx)(data)
      ).resolves.toBeDefined();
    });

    test('allows id in repeatable component data', async () => {
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
          components: {
            type: 'component',
            component: 'default.component',
            repeatable: true,
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
        components: [
          {
            id: 1,
            name: 'Component 1',
          },
          {
            name: 'Component 2',
          },
        ],
      };

      const componentCtx = { schema: articleWithComponent, getModel: getModelWithComponent };

      await expect(
        traverseEntity(visitors.throwUnrecognizedFields, componentCtx)(data)
      ).resolves.toEqual(data);
    });

    test('allows id fields with set operation in relation context', async () => {
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
          set: [{ id: 1 }, { id: 2 }],
        },
      };

      const relationCtx = { schema: articleWithRelation, getModel: getModelWithRelation };

      await expect(
        traverseEntity(visitors.throwUnrecognizedFields, relationCtx)(data)
      ).resolves.toBeDefined();
    });

    test('allows id fields in media attribute context', async () => {
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

      await expect(
        traverseEntity(visitors.throwUnrecognizedFields, mediaCtx)(data)
      ).resolves.toBeDefined();
    });

    test('allows id fields in media array context', async () => {
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
          images: {
            type: 'media',
            multiple: true,
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
        images: [{ id: 1 }, { id: 2 }],
      };

      const mediaCtx = { schema: articleWithMedia, getModel: getModelWithMedia };

      await expect(
        traverseEntity(visitors.throwUnrecognizedFields, mediaCtx)(data)
      ).resolves.toBeDefined();
    });

    test('allows documentId fields in relation context', async () => {
      const relationModel = {
        uid: 'api::relation.relation',
        modelType: 'contentType' as const,
        kind: 'collectionType' as const,
        info: { singularName: 'relation', pluralName: 'relations' },
        options: {},
        attributes: {
          id: { type: 'integer' },
          documentId: { type: 'string' },
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
          documentId: 'doc-123',
        },
      };

      const relationCtx = { schema: articleWithRelation, getModel: getModelWithRelation };

      await expect(
        traverseEntity(visitors.throwUnrecognizedFields, relationCtx)(data)
      ).resolves.toBeDefined();
    });
  });
});
