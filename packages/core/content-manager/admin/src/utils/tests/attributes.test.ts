import { checkIfAttributeIsDisplayable, getMainField, getMediaField } from '../attributes';

import type { ComponentsDictionary, Schema as ContentTypeSchema } from '../../hooks/useDocument';
import type { Schema } from '@strapi/types';

type RelationAttributeWithTargetModel = Schema.Attribute.Relation & {
  targetModel: string;
};

type RelationTarget = Schema.Attribute.OneToOne['target'];

describe('attributes', () => {
  describe('getMediaField', () => {
    const schemas = [
      {
        uid: 'api::product.product',
        attributes: {
          name: { type: 'string' },
          coverImage: { type: 'media' },
          description: { type: 'text' },
        },
      },
    ] as unknown as ContentTypeSchema[];

    const components: ComponentsDictionary = {};

    const relationTo = (targetModel: RelationTarget) =>
      ({
        type: 'relation',
        relation: 'oneToOne',
        target: targetModel,
        targetModel,
      }) satisfies RelationAttributeWithTargetModel;

    it('should return undefined when mediaFieldName is undefined', () => {
      const attribute = relationTo('api::product.product');
      expect(getMediaField(attribute, undefined, { schemas, components })).toBeUndefined();
    });

    it('should return MediaField object for valid media attribute', () => {
      const attribute = relationTo('api::product.product');
      const result = getMediaField(attribute, 'coverImage', { schemas, components });
      expect(result).toEqual({ name: 'coverImage' });
    });

    it('should return undefined for non-media attribute', () => {
      const attribute = relationTo('api::product.product');
      expect(getMediaField(attribute, 'name', { schemas, components })).toBeUndefined();
    });

    it('should return undefined for non-existent attribute', () => {
      const attribute = relationTo('api::product.product');
      expect(getMediaField(attribute, 'nonExistent', { schemas, components })).toBeUndefined();
    });

    it('should return undefined when target schema is not found', () => {
      const attribute = relationTo('api::unknown.unknown');
      expect(getMediaField(attribute, 'coverImage', { schemas, components })).toBeUndefined();
    });

    it('should resolve the target schema from `target` when `targetModel` is absent', () => {
      const attribute = {
        type: 'relation',
        relation: 'oneToOne',
        target: 'api::product.product',
      } as Schema.Attribute.AnyAttribute;

      expect(getMediaField(attribute, 'coverImage', { schemas, components })).toEqual({
        name: 'coverImage',
      });
    });

    it('should resolve the media field from the component attributes', () => {
      const componentsWithMedia = {
        'basic.card': {
          uid: 'basic.card',
          attributes: {
            title: { type: 'string' },
            picture: { type: 'media' },
          },
        },
      } as unknown as ComponentsDictionary;

      const attribute = {
        type: 'component',
        component: 'basic.card',
        repeatable: false,
      } satisfies Schema.Attribute.Component;

      expect(
        getMediaField(attribute, 'picture', { schemas, components: componentsWithMedia })
      ).toEqual({ name: 'picture' });

      expect(
        getMediaField(attribute, 'title', { schemas, components: componentsWithMedia })
      ).toBeUndefined();

      expect(getMediaField(attribute, 'picture', { schemas, components })).toBeUndefined();
    });

    it('should return undefined for an attribute that is neither a relation nor a component', () => {
      const attribute = { type: 'string' } satisfies Schema.Attribute.String;

      expect(getMediaField(attribute, 'coverImage', { schemas, components })).toBeUndefined();
    });
  });
  describe('checkIfAttributeIsDisplayable', () => {
    it('should return false if the relation is morph', () => {
      const attribute = {
        type: 'relation',
        relationType: 'manyMorphToMany',
        relation: 'morphMany',
        target: 'admin::user',
      } as const;

      expect(checkIfAttributeIsDisplayable(attribute)).toBeFalsy();
    });

    it('should return false if the type is json', () => {
      const attribute = {
        type: 'json',
      } as const;

      expect(checkIfAttributeIsDisplayable(attribute)).toBeFalsy();
    });

    it('should return false if the type is not provided', () => {
      const attribute = {
        type: '',
      } as const;

      // @ts-expect-error – testing a failing cases
      expect(checkIfAttributeIsDisplayable(attribute)).toBeFalsy();
    });

    it('should return true if the type is a text', () => {
      const attribute = {
        type: 'text',
      } as const;

      expect(checkIfAttributeIsDisplayable(attribute)).toBeTruthy();
    });
  });

  describe('getMainField', () => {
    it('falls back to id when a component main field cannot be resolved', () => {
      expect(
        getMainField(
          {
            type: 'component',
            component: 'missing.component',
            repeatable: false,
          },
          'title',
          { schemas: [], components: {} }
        )
      ).toEqual({
        name: 'id',
        type: 'custom',
      });
    });

    it('keeps the relation main field when the target schema is unavailable', () => {
      const relationAttribute = {
        type: 'relation',
        relation: 'oneToOne',
        target: 'api::missing.missing',
        targetModel: 'api::missing.missing',
      } satisfies RelationAttributeWithTargetModel;

      expect(getMainField(relationAttribute, 'title', { schemas: [], components: {} })).toEqual({
        name: 'title',
        type: 'custom',
      });
    });

    it('falls back to id when a relation target schema exists but the main field cannot be resolved', () => {
      const relationAttribute = {
        type: 'relation',
        relation: 'oneToOne',
        target: 'api::category.category',
        targetModel: 'api::category.category',
      } satisfies RelationAttributeWithTargetModel;

      expect(
        getMainField(relationAttribute, 'deletedTitle', {
          schemas: [
            {
              uid: 'api::category.category',
              isDisplayed: true,
              apiID: 'category',
              modelType: 'contentType',
              kind: 'collectionType',
              modelName: 'category',
              globalId: 'Category',
              info: {
                displayName: 'Category',
                singularName: 'category',
                pluralName: 'categories',
              },
              options: {},
              pluginOptions: {},
              attributes: {
                title: {
                  type: 'string',
                },
              },
            },
          ],
          components: {},
        })
      ).toEqual({
        name: 'id',
        type: 'custom',
      });
    });
  });
});
