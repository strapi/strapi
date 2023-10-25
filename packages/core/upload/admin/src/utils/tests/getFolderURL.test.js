import { getFolderURL } from '..';

const FIXTURE_PATHNAME = '/media-library';
const FIXTURE_QUERY = {};
const FIXTURE_FOLDER = 1;
const FIXTURE_FOLDER_PATH = '/1/2/3';

describe('getFolderURL', () => {
  test('returns a path for the root of the media library', () => {
    expect(getFolderURL(FIXTURE_PATHNAME, FIXTURE_QUERY)).toMatchInlineSnapshot(`"/media-library"`);
  });

  test('returns a path for a folder', () => {
    expect(
      getFolderURL(FIXTURE_PATHNAME, FIXTURE_QUERY, { folder: FIXTURE_FOLDER })
    ).toMatchInlineSnapshot(`"/media-library?folder=1"`);
  });

  test('removes _q query parameter', () => {
    expect(
      getFolderURL(FIXTURE_PATHNAME, { ...FIXTURE_QUERY, _q: 'search' }, { folder: FIXTURE_FOLDER })
    ).toMatchInlineSnapshot(`"/media-library?folder=1"`);
  });

  test('keeps and stringifies query parameter', () => {
    expect(
      getFolderURL(
        FIXTURE_PATHNAME,
        { ...FIXTURE_QUERY, some: 'thing' },
        { folder: FIXTURE_FOLDER }
      )
    ).toMatchInlineSnapshot(`"/media-library?some=thing&folder=1"`);
  });

  test('includes folderPath if provided', () => {
    expect(
      getFolderURL(FIXTURE_PATHNAME, FIXTURE_QUERY, {
        folder: FIXTURE_FOLDER,
        folderPath: FIXTURE_FOLDER_PATH,
      })
    ).toMatchInlineSnapshot(`"/media-library?folder=1&folderPath=/1/2/3"`);
  });

  test('includes fodlerPath if provided and folder is undefined', () => {
    expect(
      getFolderURL(FIXTURE_PATHNAME, FIXTURE_QUERY, { folderPath: FIXTURE_FOLDER_PATH })
    ).toMatchInlineSnapshot(`"/media-library?folderPath=/1/2/3"`);
  });
});
