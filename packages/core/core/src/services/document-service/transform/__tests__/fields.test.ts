import { transformFields } from '../fields';

describe('transformFields', () => {
  it('should add documentId if it is not present in the fields', () => {
    const input = [] as string[];
    const expected = ['documentId'];
    expect(transformFields(input)).toEqual(expected);
  });

  it('should keep rest of fields', () => {
    const input = ['id', 'name'];
    const expected = ['id', 'name', 'documentId'];
    expect(transformFields(input)).toEqual(expected);
  });

  it('should add documentId if it is not present in the fields', () => {
    const input = ['name', 'description'];
    const expected = ['name', 'description', 'documentId'];
    expect(transformFields(input)).toEqual(expected);
  });

  it('should handle empty field arrays', () => {
    const input: string[] = [];
    expect(transformFields(input)).toEqual(input);
  });

  describe('string fields', () => {
    it('should handle * fields', () => {
      const input = '*';
      expect(transformFields(input)).toEqual(input);
    });

    it('should include document id', () => {
      const input = 'name,description';
      const expected = 'name,description,documentId';
      expect(transformFields(input)).toEqual(expected);

      const input2 = '';
      const expected2 = 'documentId';
      expect(transformFields(input2)).toEqual(expected2);
    });

    it('should not include documentId if it is already present', () => {
      const input = 'name,description,documentId';
      expect(transformFields(input)).toEqual(input);

      const input2 = 'documentId';
      expect(transformFields(input2)).toEqual(input2);
    });
  });
});
