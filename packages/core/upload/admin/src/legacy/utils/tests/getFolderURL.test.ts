import { getFolderURL } from '../getFolderURL';

const FIXTURE_PATHNAME = '/media-library';
const FIXTURE_QUERY = {};
const FIXTURE_FOLDER = '1';
const FIXTURE_FOLDER_PATH = '/1/2/3';

describe('getFolderURL', () => {
  test('returns a path for the root of the media library', () => {
    expect(getFolderURL(FIXTURE_PATHNAME, FIXTURE_QUERY)).toBe('/media-library');
  });

  test('returns a path for a folder', () => {
    expect(getFolderURL(FIXTURE_PATHNAME, FIXTURE_QUERY, { folder: FIXTURE_FOLDER })).toBe(
      '/media-library?folder=1'
    );
  });

  test('removes _q query parameter', () => {
    expect(
      getFolderURL(FIXTURE_PATHNAME, { ...FIXTURE_QUERY, _q: 'search' }, { folder: FIXTURE_FOLDER })
    ).toBe('/media-library?folder=1');
  });

  test('keeps and stringifies query parameter', () => {
    expect(getFolderURL(FIXTURE_PATHNAME, { ...FIXTURE_QUERY }, { folder: FIXTURE_FOLDER })).toBe(
      '/media-library?folder=1'
    );
  });

  test('includes folderPath if provided', () => {
    expect(
      getFolderURL(FIXTURE_PATHNAME, FIXTURE_QUERY, {
        folder: FIXTURE_FOLDER,
        folderPath: FIXTURE_FOLDER_PATH,
      })
    ).toBe('/media-library?folder=1&folderPath=/1/2/3');
  });

  test.each([
    ['a percent sign', '100%', '100%25'],
    ['an ampersand', 'a&b', 'a%26b'],
    ['a hash', 'a#b', 'a%23b'],
  ])('re-encodes %s in a carried-over filter', (_label, raw, encoded) => {
    expect(
      getFolderURL(
        FIXTURE_PATHNAME,
        { filters: { $and: [{ name: { $eq: raw } }] } },
        { folder: FIXTURE_FOLDER }
      )
    ).toBe(`/media-library?filters[$and][0][name][$eq]=${encoded}&folder=1`);
  });

  test('includes folderPath if provided and folder is undefined', () => {
    expect(getFolderURL(FIXTURE_PATHNAME, FIXTURE_QUERY, { folderPath: FIXTURE_FOLDER_PATH })).toBe(
      '/media-library?folderPath=/1/2/3'
    );
  });
});
