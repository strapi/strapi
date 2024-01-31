import { transformSort } from '../sort';

describe('transformSort', () => {
  it('should transform a single input', () => {
    const input = 'id';
    const expected = 'documentId';
    expect(transformSort(input)).toEqual(expected);
  });

  it('should handle non-array inputs', () => {
    const input = 'createdAt';
    const expected = 'createdAt';
    expect(transformSort(input)).toEqual(expected);
  });

  it('should transform a single input', () => {
    const input = ['id'];
    const expected = ['documentId'];
    expect(transformSort(input)).toEqual(expected);
  });

  it('should transform an array of inputs', () => {
    const input = ['id', 'name'];
    const expected = ['documentId', 'name'];
    expect(transformSort(input)).toEqual(expected);
  });

  it('should transform multiple inputs', () => {
    // TODO what if a key is repeated?
    // Do we handle this?
    const input = ['id', 'name', 'id'];
    const expected = ['documentId', 'name', 'documentId'];
    expect(transformSort(input)).toEqual(expected);
  });

  it('should not modify other inputs', () => {
    const input = ['name', 'description'];
    const expected = ['name', 'description'];
    expect(transformSort(input)).toEqual(expected);
  });

  it('should handle empty array', () => {
    const input: string[] = [];
    const expected: string[] = [];
    expect(transformSort(input)).toEqual(expected);
  });
});
