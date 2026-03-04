import { renderHook } from '@testing-library/react';

import { useWarnIfUnsavedChanges } from '../useWarnIfUnsavedChanges';

const dispatchBeforeUnload = () => {
  const event = new Event('beforeunload', { cancelable: true }) as any;
  Object.defineProperty(event, 'returnValue', {
    value: undefined,
    writable: true,
  });
  window.dispatchEvent(event);
  return event;
};

describe('useWarnIfUnsavedChanges', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('does nothing when disabled', () => {
    renderHook(() => useWarnIfUnsavedChanges(false));

    const event = dispatchBeforeUnload();

    expect(event.defaultPrevented).toBe(false);
    expect(event.returnValue).toBeUndefined();
  });

  test('prevents unload and sets returnValue when enabled', () => {
    renderHook(() => useWarnIfUnsavedChanges(true));

    const event = dispatchBeforeUnload();

    expect(event.defaultPrevented).toBe(true);
    expect(event.returnValue).toBe('');
  });

  test('adds and removes listener correctly when toggling enabled', () => {
    const { rerender } = renderHook(({ enabled }) => useWarnIfUnsavedChanges(enabled), {
      initialProps: { enabled: true },
    });

    let event = dispatchBeforeUnload();
    expect(event.defaultPrevented).toBe(true);

    rerender({ enabled: false });
    event = dispatchBeforeUnload();
    expect(event.defaultPrevented).toBe(false);

    rerender({ enabled: true });
    event = dispatchBeforeUnload();
    expect(event.defaultPrevented).toBe(true);
  });

  test('cleans up listener on unmount', () => {
    const { unmount } = renderHook(() => useWarnIfUnsavedChanges(true));

    unmount();

    const event = dispatchBeforeUnload();
    expect(event.defaultPrevented).toBe(false);
  });

  test('registers and unregisters event listeners', () => {
    const addSpy = jest.spyOn(window, 'addEventListener');
    const removeSpy = jest.spyOn(window, 'removeEventListener');

    const { unmount } = renderHook(() => useWarnIfUnsavedChanges(true));

    expect(addSpy.mock.calls.filter(([type]) => type === 'beforeunload')).toHaveLength(1);

    unmount();

    expect(removeSpy.mock.calls.filter(([type]) => type === 'beforeunload')).toHaveLength(1);
  });
});
