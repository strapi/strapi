import { renderHook } from '@tests/utils';

import { useClipboard } from '../useClipboard';

describe('useClipboard', () => {
  it('should return false if the value passed to the function is not a string or number', async () => {
    const { result } = renderHook(() => useClipboard());

    // @ts-expect-error testing invalid, empty input to the hook
    expect(await result.current.copy({})).toBe(false);
  });

  it('should return false if the value passed to copy is an empty string', async () => {
    const { result } = renderHook(() => useClipboard());

    expect(await result.current.copy('')).toBe(false);
  });

  it('should return true if the copy was successful', async () => {
    const { result } = renderHook(() => useClipboard());

    expect(await result.current.copy('test')).toBe(true);
  });
});
