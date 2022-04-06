import flattenTree from '../flattenTree';

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
    expect(flattenTree(FIXTURE)).toMatchSnapshot();
  });
});
