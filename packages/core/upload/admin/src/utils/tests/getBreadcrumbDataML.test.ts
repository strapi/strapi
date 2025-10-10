import { getBreadcrumbDataML } from '../getBreadcrumbDataML';

const FIXTURE_PATHNAME = '/media-library';
const FIXTURE_QUERY = {
  _q: 'search',
  some: 'thing',
};
const FIXTURE_FOLDER = {
  id: 1,
  name: 'first-level',
};

describe('getBreadcrumbDataML', () => {
  test('return one item at the root of the media library', () => {
    expect(
      getBreadcrumbDataML(null, { pathname: FIXTURE_PATHNAME, query: FIXTURE_QUERY })
    ).toStrictEqual([
      {
        href: undefined,
        id: null,
        label: {
          id: 'upload.plugin.name',
          defaultMessage: 'Media Library',
        },
      },
    ]);
  });

  test('returns two items for the first level of the media library', () => {
    expect(
      getBreadcrumbDataML(FIXTURE_FOLDER, { pathname: FIXTURE_PATHNAME, query: FIXTURE_QUERY })
    ).toStrictEqual([
      {
        href: '/media-library?some=thing',
        id: null,
        label: {
          id: 'upload.plugin.name',
          defaultMessage: 'Media Library',
        },
      },

      {
        id: 1,
        label: 'first-level',
      },
    ]);
  });

  test('returns three items for the second level of the media library', () => {
    expect(
      getBreadcrumbDataML(
        { ...FIXTURE_FOLDER, parent: { id: 2, name: 'second-level' } },
        { pathname: FIXTURE_PATHNAME, query: FIXTURE_QUERY }
      )
    ).toStrictEqual([
      {
        id: null,
        label: {
          id: 'upload.plugin.name',
          defaultMessage: 'Media Library',
        },
        href: '/media-library?some=thing',
      },

      {
        id: 2,
        label: 'second-level',
        href: '/media-library?some=thing&folder=2',
      },

      {
        id: 1,
        label: 'first-level',
      },
    ]);
  });

  test('returns four items for the third level of the media library', () => {
    expect(
      getBreadcrumbDataML(
        {
          ...FIXTURE_FOLDER,
          parent: { id: 2, name: 'second-level', parent: { id: 3, name: 'third-level' } },
        },
        { pathname: FIXTURE_PATHNAME, query: FIXTURE_QUERY }
      )
    ).toStrictEqual([
      {
        id: null,
        label: {
          id: 'upload.plugin.name',
          defaultMessage: 'Media Library',
        },
        href: '/media-library?some=thing',
      },

      [],

      {
        id: 2,
        label: 'second-level',
        href: '/media-library?some=thing&folder=2',
      },

      {
        id: 1,
        label: 'first-level',
      },
    ]);
  });
});
