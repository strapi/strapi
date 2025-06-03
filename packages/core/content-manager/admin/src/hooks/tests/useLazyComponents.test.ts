import { act, renderHook, waitFor } from '@tests/utils';

import { useLazyComponents } from '../useLazyComponents';

describe('useLazyComponents', () => {
  test('lazy loads the components', async () => {
    const { result } = renderHook(() => useLazyComponents(['plugin::test.test']));

    expect(result.current.isLazyLoading).toEqual(true);
    expect(result.current.lazyComponentStore).toEqual({});

    await waitFor(() => expect(result.current.isLazyLoading).toEqual(false));

    expect(result.current.lazyComponentStore['plugin::test.test']).toBeDefined();
  });

  test('assuming the store has been initialized before hand, other hooks called should be able to access the global cache', async () => {
    const { result: initialResult } = renderHook(() => useLazyComponents(['plugin::test.test']));

    await waitFor(() =>
      expect(initialResult.current.lazyComponentStore['plugin::test.test']).toBeDefined()
    );

    const { result: actualResult } = renderHook(() => useLazyComponents());

    await waitFor(() => expect(actualResult.current.isLazyLoading).toBe(false));

    expect(actualResult.current.lazyComponentStore['plugin::test.test']).toBeDefined();

    act(() => actualResult.current.cleanup());

    expect(actualResult.current.lazyComponentStore).toEqual({});
  });

  test('given there are no components to load it should not be loading and the store should be empty', async () => {
    const { result } = renderHook(() => useLazyComponents([]));

    expect(result.current.isLazyLoading).toEqual(false);
    expect(result.current.lazyComponentStore).toEqual({});
  });

  test('assuming the store has been initialized before hand, other hooks called should be able to modify the global cache and access it', async () => {
    const { result: initialResult } = renderHook(() => useLazyComponents(['plugin::test.color']));

    await waitFor(() =>
      expect(initialResult.current.lazyComponentStore['plugin::test.color']).toBeDefined()
    );

    const { result: actualResult } = renderHook(() => useLazyComponents(['plugin::test.hex']));

    await waitFor(() => expect(actualResult.current.isLazyLoading).toBe(false));

    expect(actualResult.current.lazyComponentStore['plugin::test.hex']).toBeDefined();
    expect(actualResult.current.lazyComponentStore['plugin::test.color']).toBeDefined();
  });

  test('if the argument for component uids change and it contains new ones, these should be added to the store', async () => {
    const { result: initialResult, rerender } = renderHook(
      (components) => useLazyComponents(components),
      {
        initialProps: ['plugin::test.color'],
      }
    );

    await waitFor(() =>
      expect(initialResult.current.lazyComponentStore['plugin::test.color']).toBeDefined()
    );

    rerender(['plugin::test.hex']);

    await waitFor(() => expect(initialResult.current.isLazyLoading).toBe(false));

    await waitFor(() =>
      expect(initialResult.current.lazyComponentStore['plugin::test.hex']).toBeDefined()
    );
    expect(initialResult.current.lazyComponentStore['plugin::test.color']).toBeDefined();
  });
});
