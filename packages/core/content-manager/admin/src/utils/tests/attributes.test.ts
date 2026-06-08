import { checkIfAttributeIsDisplayable, getMainField } from '../attributes';

import type { Schema } from '../../hooks/useDocument';

describe('attributes', () => {
  describe('getMainField (missing schema/config falls back to string)', () => {
    it('falls back to string when a component attribute references an absent component schema', () => {
      const attribute = {
        type: 'component',
        component: 'basic.missing',
        repeatable: false,
      } as const;

      expect(getMainField(attribute, 'name', { schemas: [], components: {} })).toEqual({
        name: 'name',
        type: 'string',
      });
    });

    it('falls back to string when the relation target schema is missing the mainField attribute', () => {
      const attribute = {
        type: 'relation',
        relation: 'oneToOne',
        target: 'api::cat.cat',
        targetModel: 'api::cat.cat',
      } as const;
      const schemas = [{ uid: 'api::cat.cat', attributes: {} }] as unknown as Schema[];

      expect(getMainField(attribute, 'name', { schemas, components: {} })).toEqual({
        name: 'name',
        type: 'string',
      });
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
});
