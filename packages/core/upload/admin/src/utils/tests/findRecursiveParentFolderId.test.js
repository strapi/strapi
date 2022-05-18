import findRecursiveParentFolderId from '../findRecursiveParentFolderId';

describe('ML || utils || findRecursiveParentFolderId', () => {
  test('should return parent folder id', () => {
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

    const result = findRecursiveParentFolderId(folderStructure, 2);
    const expected = 1;

    expect(result).toEqual(expected);
  });

  test('should return null if parent is root ML', () => {
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

    const result = findRecursiveParentFolderId(folderStructure, 1);
    const expected = null;

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

    const result = findRecursiveParentFolderId(folderStructure, 10);
    const expected = null;

    expect(result).toEqual(expected);
  });
});
