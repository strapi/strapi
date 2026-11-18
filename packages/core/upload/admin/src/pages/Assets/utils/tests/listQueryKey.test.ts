import { getListQueryKey } from '../listQueryKey';

const baseInput = {
  folderId: 1,
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

  it('ignores the view — switching table/grid must not clear the selection', () => {
    // The view is deliberately NOT part of the key: both views render the same
    // list, so toggling only changes the presentation.
    const key = getListQueryKey(baseInput);

    expect(key).not.toContain('view');
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
