import { renderHook, act } from '@testing-library/react-hooks';
import useNavigatorOnLine from '../index';

describe('useNavigatorOnLine', () => {
  it('returns the online state', () => {
    jest.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
    const { result } = renderHook(() => useNavigatorOnLine());

    expect(result.current).toEqual(true);
  });

  it('returns the offline state', () => {
    jest.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    const { result } = renderHook(() => useNavigatorOnLine());

    expect(result.current).toEqual(false);
  });

  it('listens for network change online', async () => {
    // Initialize an offline state
    jest.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    const { result, waitForNextUpdate } = renderHook(() => useNavigatorOnLine());

    await act(async () => {
      // Simulate a change from offline to online
      window.dispatchEvent(new window.Event('online'));

      await waitForNextUpdate();
    });

    expect(result.current).toEqual(true);
  });

  it('listens for network change offline', async () => {
    // Initialize an online state
    jest.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(true);
    const { result, waitForNextUpdate } = renderHook(() => useNavigatorOnLine());

    await act(async () => {
      // Simulate a change from online to offline
      window.dispatchEvent(new window.Event('offline'));

      await waitForNextUpdate();
    });

    expect(result.current).toEqual(false);
  });
});
