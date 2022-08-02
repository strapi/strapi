import findRecursiveFolderMetadatas from '../findRecursiveFolderMetadatas';

const FIXTURE_STRUCTURE = {
  value: null,
  label: 'Media Library',
  children: [
    {
      value: 1,
      label: 'Cats',
      children: [
        {
          value: 2,
          label: 'Michka',
          children: [],
        },
      ],
    },
  ],
};

describe('ML || utils || findRecursiveFolderMetadatas', () => {
  test('should return parent folder id and label', () => {
    const result = findRecursiveFolderMetadatas(FIXTURE_STRUCTURE, 2);

    expect(result).toEqual({
      parentId: 1,
      currentFolderLabel: 'Michka',
    });
  });

  test('should return parent id null if parent is root ML', () => {
    const result = findRecursiveFolderMetadatas(FIXTURE_STRUCTURE, 1);

    expect(result).toEqual({
      currentFolderLabel: 'Cats',
      parentId: null,
    });
  });

  test('should return null if searched id does not exist', () => {
    const result = findRecursiveFolderMetadatas(FIXTURE_STRUCTURE, 10);

    expect(result).toEqual(null);
  });

  test('should return null if searched id does not exist (nullish)', () => {
    const result = findRecursiveFolderMetadatas(FIXTURE_STRUCTURE, null);

    expect(result).toEqual(null);
  });
});
