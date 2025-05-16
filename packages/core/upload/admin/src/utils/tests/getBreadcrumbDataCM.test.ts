import { getBreadcrumbDataCM } from '../getBreadcrumbDataCM';

const FIXTURE_FOLDER = {
  id: 1,
  name: 'first-level',
  path: '/1 ',
  pathId: 1,
};

describe('getBreadcrumbDataCM', () => {
  test('returns one item at the root of the media library', () => {
    expect(getBreadcrumbDataCM(null)).toEqual([
      {
        id: null,
        label: {
          defaultMessage: 'Media Library',
          id: 'upload.plugin.name',
        },
      },
    ]);
  });

  test('returns two items for the first level of the media library', () => {
    expect(getBreadcrumbDataCM(FIXTURE_FOLDER)).toEqual([
      {
        id: null,
        label: {
          defaultMessage: 'Media Library',
          id: 'upload.plugin.name',
        },
      },
      {
        id: 1,
        label: 'first-level',
        path: '/1 ',
      },
    ]);
  });

  test('returns three items for the second level of the media library', () => {
    const input = {
      ...FIXTURE_FOLDER,
      parent: { id: 2, name: 'second-level', path: '/2' },
    };

    expect(getBreadcrumbDataCM(input)).toEqual([
      {
        id: null,
        label: {
          defaultMessage: 'Media Library',
          id: 'upload.plugin.name',
        },
      },
      {
        id: 2,
        label: 'second-level',
        path: '/2',
      },
      {
        id: 1,
        label: 'first-level',
        path: '/1 ',
      },
    ]);
  });

  test('returns four items for the third level of the media library', () => {
    const input = {
      ...FIXTURE_FOLDER,
      parent: {
        id: 2,
        name: 'second-level',
        path: '/2',
        parent: { id: 3, name: 'third-level', path: '/3' },
      },
    };

    expect(getBreadcrumbDataCM(input)).toEqual([
      {
        id: null,
        label: {
          defaultMessage: 'Media Library',
          id: 'upload.plugin.name',
        },
      },
      [],
      {
        id: 2,
        label: 'second-level',
        path: '/2',
      },
      {
        id: 1,
        label: 'first-level',
        path: '/1 ',
      },
    ]);
  });
});
