import { getFolderURL } from '..';

const FIXTURE_PATHNAME = '/media-library';
const FIXTURE_QUERY = {};
const FIXTURE_FOLDER = {
  id: 1,
};

describe('getFolderURL', () => {
  test('returns a path for the root of the media library', () => {
    expect(getFolderURL(FIXTURE_PATHNAME, FIXTURE_QUERY)).toStrictEqual(FIXTURE_PATHNAME);
  });

  test('returns a path for a folder', () => {
    expect(getFolderURL(FIXTURE_PATHNAME, FIXTURE_QUERY, FIXTURE_FOLDER)).toStrictEqual(
      `${FIXTURE_PATHNAME}?folder=${FIXTURE_FOLDER.id}`
    );
  });

  test('removes _q query parameter', () => {
    expect(
      getFolderURL(FIXTURE_PATHNAME, { ...FIXTURE_QUERY, _q: 'search' }, FIXTURE_FOLDER)
    ).toStrictEqual(`${FIXTURE_PATHNAME}?folder=${FIXTURE_FOLDER.id}`);
  });

  test('keeps and stringifies query parameter', () => {
    expect(
      getFolderURL(FIXTURE_PATHNAME, { ...FIXTURE_QUERY, some: 'thing' }, FIXTURE_FOLDER)
    ).toStrictEqual(`${FIXTURE_PATHNAME}?some=thing&folder=${FIXTURE_FOLDER.id}`);
  });
});
