'use strict';

const fieldSizesService = require('../field-sizes');

describe('field sizes service', () => {
  it('should return the correct field sizes', () => {
    const { getAllFieldSizes } = fieldSizesService();
    const fieldSizes = getAllFieldSizes();
    Object.values(fieldSizes).forEach((fieldSize) => {
      expect(typeof fieldSize.isResizable).toBe('boolean');
      expect([4, 6, 8, 12]).toContain(fieldSize.default);
    });
  });

  it('should return the correct field size for a given type', () => {
    const { getFieldSize } = fieldSizesService();
    const fieldSize = getFieldSize('string');
    expect(fieldSize.isResizable).toBe(true);
    expect(fieldSize.default).toBe(6);
  });

  it('should throw an error if the type is not found', () => {
    const { getFieldSize } = fieldSizesService();
    expect(() => getFieldSize('not-found')).toThrowError(
      'Could not find field size for type not-found'
    );
  });

  it('should throw an error if the type is not provided', () => {
    const { getFieldSize } = fieldSizesService();
    expect(() => getFieldSize()).toThrowError('The type is required');
  });
});
