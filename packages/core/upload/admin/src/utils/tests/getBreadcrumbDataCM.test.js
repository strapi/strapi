import { getBreadcrumbDataCM } from '..';

const FIXTURE_FOLDER = {
  id: 1,
  name: 'first-level',
};

describe('getBreadcrumbDataCM', () => {
  test('return one item at the root of the media library', () => {
    expect(getBreadcrumbDataCM(null)).toStrictEqual([
      {
        id: null,
        label: 'Media Library',
      },
    ]);
  });

  test('returns two items for the first level of the media library', () => {
    expect(getBreadcrumbDataCM(FIXTURE_FOLDER)).toStrictEqual([
      {
        id: null,
        label: 'Media Library',
      },
      {
        id: 1,
        label: 'first-level',
      },
    ]);
  });

  test('returns three items for the second level of the media library', () => {
    expect(
      getBreadcrumbDataCM({ ...FIXTURE_FOLDER, parent: { id: 2, name: 'second-level' } })
    ).toStrictEqual([
      {
        id: null,
        label: 'Media Library',
      },

      {
        id: 2,
        label: 'second-level',
      },

      {
        id: 1,
        label: 'first-level',
      },
    ]);
  });

  test('returns four items for the third level of the media library', () => {
    expect(
      getBreadcrumbDataCM({
        ...FIXTURE_FOLDER,
        parent: { id: 2, name: 'second-level', parent: { id: 3, name: 'third-level' } },
      })
    ).toStrictEqual([
      {
        id: null,
        label: 'Media Library',
      },
      [],
      {
        id: 2,
        label: 'second-level',
      },
      {
        id: 1,
        label: 'first-level',
      },
    ]);
  });
});
