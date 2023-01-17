import findRecursiveFolderByValue from '../findRecursiveFolderByValue';

const FIXTURE = [
  {
    value: null,
    label: 'root',
    children: [
      {
        value: 1,
        label: '1',
        children: [
          {
            value: 11,
            label: '1.1',
          },
        ],
      },
    ],
  },
];

describe('findRecursiveFolderByValue', () => {
  test('does find folders at the root level', () => {
    expect(findRecursiveFolderByValue(FIXTURE, FIXTURE[0].value)).toStrictEqual(FIXTURE[0]);
  });

  test('does find nested folders', () => {
    const folder = FIXTURE[0].children[0];
    expect(findRecursiveFolderByValue(FIXTURE, folder.value)).toStrictEqual(folder);
  });

  test('does return undefined, when no folder was found', () => {
    expect(findRecursiveFolderByValue(FIXTURE, { value: 3 })).toEqual(undefined);
  });
});
