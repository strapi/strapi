import { transformFields } from '../fields';

describe('transformFields', () => {
  it('should transform a single input', () => {
    const input = ['id'];
    const expected = ['documentId'];
    expect(transformFields(input)).toEqual(expected);
  });

  it('should transform an array of inputs', () => {
    const input = ['id', 'name'];
    const expected = ['documentId', 'name'];
    expect(transformFields(input)).toEqual(expected);
  });

  it('should transform multiple inputs', () => {
    // TODO what if a key is repeated?
    // Do we handle this?
    const input = ['id', 'name', 'id'];
    const expected = ['documentId', 'name', 'documentId'];
    expect(transformFields(input)).toEqual(expected);
  });

  it('should not modify other inputs', () => {
    const input = ['name', 'description'];
    const expected = ['name', 'description'];
    expect(transformFields(input)).toEqual(expected);
  });

  it('should handle empty array', () => {
    const input: string[] = [];
    const expected: string[] = [];
    expect(transformFields(input)).toEqual(expected);
  });
});
