import { renderHook, waitFor } from '@tests/utils';

import { useContentTypes } from '../useContentTypes';

describe('useContentTypes', () => {
  test('fetches models and content-types', async () => {
    const { result } = renderHook(() => useContentTypes());

    expect(result.current.isLoading).toBe(true);

    expect(result.current.singleTypes).toStrictEqual([]);
    expect(result.current.collectionTypes).toStrictEqual([]);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.collectionTypes).toStrictEqual([
      expect.objectContaining({
        uid: 'admin::collectionType',
      }),
    ]);

    expect(result.current.singleTypes).toStrictEqual([
      expect.objectContaining({
        uid: 'admin::singleType',
      }),
    ]);
  });
});
