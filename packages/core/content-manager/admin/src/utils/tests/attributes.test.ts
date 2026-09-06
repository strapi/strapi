import { checkIfAttributeIsDisplayable, getMainField } from '../attributes';

import type { Schema } from '@strapi/types';

type RelationAttributeWithTargetModel = Schema.Attribute.Relation & {
  targetModel: string;
};

describe('attributes', () => {
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
