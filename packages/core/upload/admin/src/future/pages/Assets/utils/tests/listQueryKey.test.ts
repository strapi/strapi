import { getListQueryKey } from '../listQueryKey';

const baseInput = {
  folderId: 1,
  view: 0,
  search: '',
  sort: null,
  filter: null,
};

// Infinite-scroll persistence is not key-tested here — load-more does not change
// any segment, so the key stays the same and selection is left to integration QA.
describe('getListQueryKey', () => {
  it('returns equal keys for the same inputs', () => {
    const keyA = getListQueryKey(baseInput);
    const keyB = getListQueryKey(baseInput);

    expect(keyA).toBe(keyB);
  });

  it('returns different keys for different folderId', () => {
    const keyA = getListQueryKey(baseInput);
    const keyB = getListQueryKey({ ...baseInput, folderId: 2 });

    expect(keyA).not.toBe(keyB);
  });

  it('returns different keys for different view', () => {
    const keyA = getListQueryKey(baseInput);
    const keyB = getListQueryKey({ ...baseInput, view: 1 });

    expect(keyA).not.toBe(keyB);
  });

  it('returns different keys for different search', () => {
    const keyA = getListQueryKey(baseInput);
    const keyB = getListQueryKey({ ...baseInput, search: 'logo' });

    expect(keyA).not.toBe(keyB);
  });

  it('returns different keys for different sort', () => {
    const keyA = getListQueryKey(baseInput);
    const keyB = getListQueryKey({ ...baseInput, sort: 'name:asc' });

    expect(keyA).not.toBe(keyB);
  });

  it('returns different keys for different filter', () => {
    const keyA = getListQueryKey(baseInput);
    const keyB = getListQueryKey({ ...baseInput, filter: 'image' });

    expect(keyA).not.toBe(keyB);
  });
});
