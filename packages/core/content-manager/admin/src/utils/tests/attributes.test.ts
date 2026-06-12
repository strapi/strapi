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

    it('falls back to id when a relation main field cannot be resolved', () => {
      expect(
        getMainField(
          {
            type: 'relation',
            relation: 'oneToOne',
            target: 'api::missing.missing',
            targetModel: 'api::missing.missing',
          } as any,
          'title',
          { schemas: [], components: {} }
        )
      ).toEqual({
        name: 'id',
        type: 'custom',
      });
    });
  });
});
