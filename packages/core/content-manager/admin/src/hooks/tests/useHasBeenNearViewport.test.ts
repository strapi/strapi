import { act, renderHook } from '@testing-library/react';

import { useHasBeenNearViewport } from '../useHasBeenNearViewport';

describe('useHasBeenNearViewport', () => {
  const { IntersectionObserver } = window;
  const ref = { current: document.createElement('div') };
  let reportIntersection: (isIntersecting: boolean) => void;
  let disconnect: jest.Mock;

  beforeEach(() => {
    disconnect = jest.fn();

    window.IntersectionObserver = class {
      constructor(callback: IntersectionObserverCallback) {
        reportIntersection = (isIntersecting) =>
          callback(
            [{ isIntersecting } as IntersectionObserverEntry],
            this as unknown as globalThis.IntersectionObserver
          );
      }

      observe() {}

      disconnect = disconnect;

      unobserve() {}
    } as unknown as typeof globalThis.IntersectionObserver;
  });

  afterEach(() => {
    window.IntersectionObserver = IntersectionObserver;
  });

  it('becomes true once the element gets close to the viewport, then stays true', () => {
    const { result } = renderHook(() => useHasBeenNearViewport(ref));

    expect(result.current).toBe(false);

    act(() => reportIntersection(false));
    expect(result.current).toBe(false);

    act(() => reportIntersection(true));
    expect(result.current).toBe(true);
    expect(disconnect).toHaveBeenCalled();
  });

  it('is true without IntersectionObserver', () => {
    // @ts-expect-error – JSDOM doesn't implement it
    delete window.IntersectionObserver;

    const { result } = renderHook(() => useHasBeenNearViewport(ref));

    expect(result.current).toBe(true);
  });
});
