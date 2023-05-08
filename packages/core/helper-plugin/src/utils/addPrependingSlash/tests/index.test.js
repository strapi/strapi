import addPrependingSlash from '../index';

describe('isAbsoluteUrl', () => {
  test('can check is a provided url is changed or not', () => {
    expect(addPrependingSlash('//example.com')).toBe('//example.com');
    expect(addPrependingSlash('test')).toBe('/test');
    expect(addPrependingSlash(1)).toBe(1);
  });
});