import { act, renderHook } from '@tests/utils';

import { useInfiniteScrollSentinel } from '../useInfiniteScrollSentinel';

/**
 * jsdom has no IntersectionObserver. This controllable stub lets a test drive
 * the sentinel's visibility by hand and records observe/disconnect calls.
 */
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  callback: IntersectionObserverCallback;

  observed: Element[] = [];

  disconnected = false;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  observe(el: Element) {
    this.observed.push(el);
  }

  disconnect() {
    this.disconnected = true;
  }

  unobserve() {}

  takeRecords() {
    return [];
  }

  /** Simulate the observed element entering/leaving the viewport. */
  emit(isIntersecting: boolean) {
    act(() => {
      this.callback(
        [{ isIntersecting } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver
      );
    });
  }
}

const latestObserver = () =>
  MockIntersectionObserver.instances[MockIntersectionObserver.instances.length - 1];

beforeEach(() => {
  MockIntersectionObserver.instances = [];
  (globalThis as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
    MockIntersectionObserver;
});

describe('useInfiniteScrollSentinel', () => {
  const attach = (result: { current: (node: HTMLElement | null) => void }) => {
    // Mounting the sentinel — the callback ref binds the observer.
    act(() => {
      result.current(document.createElement('div'));
    });
  };

  it('requests the next page when the sentinel becomes visible', () => {
    const onLoadMore = jest.fn();
    const { result } = renderHook(() =>
      useInfiniteScrollSentinel({ hasNextPage: true, isFetchingMore: false, onLoadMore })
    );

    attach(result);
    expect(onLoadMore).not.toHaveBeenCalled();

    latestObserver().emit(true);

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('keeps requesting pages while the sentinel stays visible after each fetch settles (CMS-1562)', () => {
    // The core bug: the observer never re-fires because the sentinel never
    // transitions off screen. Fetching must instead resume when isFetchingMore
    // settles back to false.
    const onLoadMore = jest.fn();
    const { result, rerender } = renderHook(
      ({ isFetchingMore }: { isFetchingMore: boolean }) =>
        useInfiniteScrollSentinel({ hasNextPage: true, isFetchingMore, onLoadMore }),
      { initialProps: { isFetchingMore: false } }
    );

    attach(result);
    latestObserver().emit(true); // sentinel visible → first fetch
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    // Page in flight — no duplicate request while fetching.
    rerender({ isFetchingMore: true });
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    // Page settled, sentinel STILL visible (no transition emitted) → next page.
    rerender({ isFetchingMore: false });
    expect(onLoadMore).toHaveBeenCalledTimes(2);
  });

  it('stops requesting once there is no next page', () => {
    const onLoadMore = jest.fn();
    const { result, rerender } = renderHook(
      ({ hasNextPage }: { hasNextPage: boolean }) =>
        useInfiniteScrollSentinel({ hasNextPage, isFetchingMore: false, onLoadMore }),
      { initialProps: { hasNextPage: true } }
    );

    attach(result);
    latestObserver().emit(true);
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    rerender({ hasNextPage: false });
    // A settle after the last page must not fetch again.
    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('does not fetch while the sentinel is off screen', () => {
    const onLoadMore = jest.fn();
    const { result } = renderHook(() =>
      useInfiniteScrollSentinel({ hasNextPage: true, isFetchingMore: false, onLoadMore })
    );

    attach(result);
    latestObserver().emit(false);

    expect(onLoadMore).not.toHaveBeenCalled();
  });

  it('rebinds the observer when the sentinel remounts and drops it on unmount', () => {
    const onLoadMore = jest.fn();
    const { result } = renderHook(() =>
      useInfiniteScrollSentinel({ hasNextPage: true, isFetchingMore: false, onLoadMore })
    );

    attach(result);
    const first = latestObserver();
    expect(first.observed).toHaveLength(1);

    // Sentinel unmounts (e.g. the list drops back to a loader on folder change).
    act(() => {
      result.current(null);
    });
    expect(first.disconnected).toBe(true);

    // Remounts → a fresh observer binds to the new node.
    attach(result);
    expect(latestObserver()).not.toBe(first);
    expect(latestObserver().observed).toHaveLength(1);
  });
});
