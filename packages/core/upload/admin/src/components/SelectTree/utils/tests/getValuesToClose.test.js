import flattenTree from '../flattenTree';
import getValuesToClose from '../getValuesToClose';

const FIXTURE = flattenTree([
  {
    value: null,
    label: 'Media Library',
    children: [
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
    ],
  },
]);

describe('getValuesToClose', () => {
  test('returns all value for depth = 1', () => {
    expect(getValuesToClose(FIXTURE, null)).toStrictEqual([
      null,
      'f-1',
      'f-2',
      'f-2-1',
      'f-2-2',
      'f-2-2-1',
    ]);
  });

  test('returns some values for depth = 2', () => {
    expect(getValuesToClose(FIXTURE, 'f-1')).toStrictEqual([
      'f-1',
      'f-2',
      'f-2-1',
      'f-2-2',
      'f-2-2-1',
    ]);
  });

  test('returns some values for depth = 3', () => {
    expect(getValuesToClose(FIXTURE, 'f-2-1')).toStrictEqual(['f-2-1', 'f-2-2', 'f-2-2-1']);
  });
});
