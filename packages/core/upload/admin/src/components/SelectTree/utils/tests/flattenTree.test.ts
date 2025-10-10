import { flattenTree } from '../flattenTree';

const FIXTURE = [
  {
    value: 'f-1',
    label: 'Folder 1',
  },
  {
    value: 'f-2',
    label: 'Folder 2',
    children: [
      {
        value: 'f-2-1',
        label: 'Folder 2-1',
      },
      {
        value: 'f-2-2',
        label: 'Folder 2-2',
        children: [
          {
            value: 'f-2-2-1',
            label: 'Folder 2-2-1',
          },
        ],
      },
    ],
  },
];

describe('flattenTree', () => {
  test('flattens the passed tree structure properly', () => {
    const result = flattenTree(FIXTURE);

    expect(result).toEqual([
      {
        depth: 0,
        label: 'Folder 1',
        parent: undefined,
        value: 'f-1',
      },
      {
        children: [
          {
            label: 'Folder 2-1',
            value: 'f-2-1',
          },
          {
            children: [
              {
                label: 'Folder 2-2-1',
                value: 'f-2-2-1',
              },
            ],
            label: 'Folder 2-2',
            value: 'f-2-2',
          },
        ],
        depth: 0,
        label: 'Folder 2',
        parent: undefined,
        value: 'f-2',
      },
      {
        depth: 1,
        label: 'Folder 2-1',
        parent: 'f-2',
        value: 'f-2-1',
      },
      {
        children: [
          {
            label: 'Folder 2-2-1',
            value: 'f-2-2-1',
          },
        ],
        depth: 1,
        label: 'Folder 2-2',
        parent: 'f-2',
        value: 'f-2-2',
      },
      {
        depth: 2,
        label: 'Folder 2-2-1',
        parent: 'f-2-2',
        value: 'f-2-2-1',
      },
    ]);
  });
});
