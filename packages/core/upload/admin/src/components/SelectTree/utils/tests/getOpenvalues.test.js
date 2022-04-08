import flattenTree from '../flattenTree';
import getOpenValues from '../getOpenValues';

const FIXTURE = flattenTree([
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
]);

describe('getOpenValues', () => {
  test('returns 1 value for depth = 1', () => {
    expect(getOpenValues(FIXTURE, { value: 'f-1' })).toStrictEqual(['f-1']);
  });

  test('returns 2 values for depth = 2', () => {
    expect(getOpenValues(FIXTURE, { value: 'f-2-1' })).toStrictEqual(['f-2-1', 'f-2']);
  });

  test('returns 3 values for depth = 3', () => {
    expect(getOpenValues(FIXTURE, { value: 'f-2-2-1' })).toStrictEqual(['f-2-2-1', 'f-2-2', 'f-2']);
  });
});
