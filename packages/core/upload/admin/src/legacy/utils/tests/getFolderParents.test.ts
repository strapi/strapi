import { getFolderParents } from '../getFolderParents';

const FIXTURE_FOLDER_STRUCTURE = [
  {
    value: null,
    label: 'Media Library',
    children: [
      {
        value: 1,
        label: 'First folder',
        children: [
          {
            value: 2,
            label: 'Second folder',
            children: [
              {
                value: 3,
                label: 'Third folder',
                children: [
                  {
                    value: 5,
                    label: 'Fourth folder',
                    children: [],
                  },
                ],
              },
              {
                value: 4,
                label: 'Second folder sibling',
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
];

describe('getFolderParents', () => {
  test('should return ascendants', () => {
    const result = getFolderParents(FIXTURE_FOLDER_STRUCTURE, 3);
    const expected = [
      { id: null, label: 'Media Library', path: '' },
      { id: 1, label: 'First folder', path: '/1' },
      { id: 2, label: 'Second folder', path: '/1/2' },
    ];

    expect(result).toEqual(expected);
  });

  test('should not return parent siblings', () => {
    const result = getFolderParents(FIXTURE_FOLDER_STRUCTURE, 5);
    const expected = [
      { id: null, label: 'Media Library', path: '' },
      { id: 1, label: 'First folder', path: '/1' },
      { id: 2, label: 'Second folder', path: '/1/2' },
      { id: 3, label: 'Third folder', path: '/1/2/3' },
    ];

    expect(result).toEqual(expected);
  });

  test('should return array if current folder id not found', () => {
    const result = getFolderParents(FIXTURE_FOLDER_STRUCTURE, 8);

    expect(result).toEqual([]);
  });
});
