import { difference } from '../difference';

describe('difference', () => {
  it('should return an empty object when comparing identical objects', () => {
    const obj = { a: 1, b: 2, c: { d: 3 } };
    expect(difference(obj, obj)).toEqual({});
  });

  it('should return the difference between two objects', () => {
    const obj1 = { a: 1, b: 2, c: { d: 3 } };
    const obj2 = { a: 1, b: 3, c: { d: 4 } };
    expect(difference(obj1, obj2)).toEqual({ b: 2, c: { d: 3 } });
  });

  it('should handle nested objects', () => {
    const obj1 = { a: 1, b: { c: 2, d: { e: 3 } } };
    const obj2 = { a: 1, b: { c: 2, d: { e: 4 } } };
    expect(difference(obj1, obj2)).toEqual({ b: { d: { e: 3 } } });
  });
});
