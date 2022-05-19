import findRecursiveFolderMetadatas from '../findRecursiveFolderMetadatas';

describe('ML || utils || findRecursiveFolderMetadatas', () => {
  test('should return parent folder id and label', () => {
    const folderStructure = {
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

    const result = findRecursiveFolderMetadatas(folderStructure, 2);
    const expected = {
      parentId: 1,
      currentFolderLabel: 'Michka',
    };

    expect(result).toEqual(expected);
  });

  test('should return parent id null if parent is root ML', () => {
    const folderStructure = {
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

    const result = findRecursiveFolderMetadatas(folderStructure, 1);
    const expected = {
      currentFolderLabel: 'Cats',
      parentId: null,
    };

    expect(result).toEqual(expected);
  });

  test('should return null if searched id does not exist', () => {
    const folderStructure = {
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

    const result = findRecursiveFolderMetadatas(folderStructure, 10);
    const expected = null;

    expect(result).toEqual(expected);
  });
});
