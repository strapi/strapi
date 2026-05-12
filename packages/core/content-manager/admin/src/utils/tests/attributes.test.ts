import { checkIfAttributeIsDisplayable, getMainField } from '../attributes';

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
    it('falls back to string when the component schema is not in the dictionary yet', () => {
      const attribute = {
        type: 'component' as const,
        component: 'shared.missing',
        repeatable: false,
      };

      const result = getMainField(attribute, 'title', { schemas: [], components: {} });

      expect(result).toEqual({ name: 'title', type: 'string' });
    });

    it('reads the component sub-field type when the component schema is present', () => {
      const attribute = {
        type: 'component' as const,
        component: 'shared.seo',
        repeatable: false,
      };

      const result = getMainField(attribute, 'title', {
        schemas: [],
        components: {
          'shared.seo': {
            uid: 'shared.seo',
            attributes: { title: { type: 'string' } },
          } as any,
        },
      });

      expect(result).toEqual({ name: 'title', type: 'string' });
    });

    it('falls back to string when the relation target schema or sub-field is missing', () => {
      const attribute = {
        type: 'relation' as const,
        relation: 'manyToOne',
        targetModel: 'api::missing.missing',
      } as any;

      const result = getMainField(attribute, 'name', { schemas: [], components: {} });

      expect(result).toEqual({ name: 'name', type: 'string' });
    });
  });
});
