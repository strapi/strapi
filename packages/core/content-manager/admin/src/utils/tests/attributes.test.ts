import { checkIfAttributeIsDisplayable, getMediaField } from '../attributes';

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
    ] as any;

    const components = {} as any;

    it('should return undefined when mediaFieldName is undefined', () => {
      const attribute = { type: 'relation', targetModel: 'api::product.product' } as any;
      expect(getMediaField(attribute, undefined, { schemas, components })).toBeUndefined();
    });

    it('should return MediaField object for valid media attribute', () => {
      const attribute = { type: 'relation', targetModel: 'api::product.product' } as any;
      const result = getMediaField(attribute, 'coverImage', { schemas, components });
      expect(result).toEqual({ name: 'coverImage' });
    });

    it('should return undefined for non-media attribute', () => {
      const attribute = { type: 'relation', targetModel: 'api::product.product' } as any;
      expect(getMediaField(attribute, 'name', { schemas, components })).toBeUndefined();
    });

    it('should return undefined for non-existent attribute', () => {
      const attribute = { type: 'relation', targetModel: 'api::product.product' } as any;
      expect(getMediaField(attribute, 'nonExistent', { schemas, components })).toBeUndefined();
    });

    it('should return undefined when target schema is not found', () => {
      const attribute = { type: 'relation', targetModel: 'api::unknown.unknown' } as any;
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
});
