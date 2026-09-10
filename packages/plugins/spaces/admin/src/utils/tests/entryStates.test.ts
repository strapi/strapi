import { getFetchClient } from '@strapi/admin/strapi-admin';

import { clearEntryStateCache, fetchEntryState, fetchEntryStates } from '../entryStates';

jest.mock('@strapi/admin/strapi-admin', () => ({
  getFetchClient: jest.fn(),
}));

jest.mock('../currentSpace', () => ({
  getCurrentSpaceSlug: jest.fn(() => 'acme'),
  DEFAULT_SPACE_SLUG: 'default',
}));

const { getCurrentSpaceSlug } = jest.requireMock('../currentSpace');

const ARTICLE = 'api::article.article';

const state = (editable: boolean) => ({ space: null, editable, reason: 'shared-entry' as const });

/** Records every call and answers with a state for each requested id. */
const mockGet = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  clearEntryStateCache();
  getCurrentSpaceSlug.mockReturnValue('acme');
  mockGet.mockImplementation((_url: string, options: { params: { documentIds: string } }) => {
    const ids = options.params.documentIds.split(',');
    return Promise.resolve({
      data: { data: Object.fromEntries(ids.map((id) => [id, state(false)])) },
    });
  });
  jest.mocked(getFetchClient).mockReturnValue({ get: mockGet } as never);
});

describe('fetchEntryStates', () => {
  it('answers every requested document', async () => {
    const states = await fetchEntryStates(ARTICLE, ['a', 'b']);

    expect(states).toEqual({ a: state(false), b: state(false) });
  });

  /**
   * The whole point of the module: a list view asks once per row, from several
   * components each, and that must stay one request.
   */
  it('collapses concurrent lookups into a single request', async () => {
    await Promise.all([
      fetchEntryStates(ARTICLE, ['a']),
      fetchEntryStates(ARTICLE, ['b']),
      fetchEntryStates(ARTICLE, ['c', 'd']),
      fetchEntryState(ARTICLE, 'e'),
    ]);

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(mockGet.mock.calls[0][1].params.documentIds.split(',').sort()).toEqual([
      'a',
      'b',
      'c',
      'd',
      'e',
    ]);
  });

  it('serves a second lookup from the cache', async () => {
    await fetchEntryStates(ARTICLE, ['a']);
    const again = await fetchEntryStates(ARTICLE, ['a']);

    expect(mockGet).toHaveBeenCalledTimes(1);
    expect(again).toEqual({ a: state(false) });
  });

  it('asks again after the cache is cleared', async () => {
    await fetchEntryStates(ARTICLE, ['a']);
    clearEntryStateCache();
    await fetchEntryStates(ARTICLE, ['a']);

    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  /**
   * The same entry is editable in one workspace and read-only in another, so a
   * cached answer must never cross workspaces.
   */
  it('caches per workspace', async () => {
    await fetchEntryStates(ARTICLE, ['a']);
    getCurrentSpaceSlug.mockReturnValue('beta');
    await fetchEntryStates(ARTICLE, ['a']);

    expect(mockGet).toHaveBeenCalledTimes(2);
  });

  it('answers null for a document the workspace cannot see, without retrying', async () => {
    mockGet.mockResolvedValue({ data: { data: {} } });

    const states = await fetchEntryStates(ARTICLE, ['ghost']);
    await fetchEntryStates(ARTICLE, ['ghost']);

    expect(states).toEqual({ ghost: null });
    expect(mockGet).toHaveBeenCalledTimes(1);
  });

  it('never locks on a failed request', async () => {
    mockGet.mockRejectedValue(new Error('offline'));

    await expect(fetchEntryStates(ARTICLE, ['a'])).resolves.toEqual({ a: null });
  });

  it('asks nothing when there is no model or no document', async () => {
    await expect(fetchEntryStates('', ['a'])).resolves.toEqual({});
    await expect(fetchEntryStates(ARTICLE, [])).resolves.toEqual({});
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('splits a request that exceeds the endpoint cap', async () => {
    const ids = Array.from({ length: 201 }, (_, index) => `id-${index}`);

    await fetchEntryStates(ARTICLE, ids);

    expect(mockGet).toHaveBeenCalledTimes(2);
    const sent = mockGet.mock.calls.flatMap((call) => call[1].params.documentIds.split(','));
    expect(sent).toHaveLength(201);
  });
});
