import { act, renderHook } from '@tests/utils';

import { useInfiniteScrollSentinel } from '../useInfiniteScrollSentinel';

/**
 * jsdom has no IntersectionObserver. This controllable stub lets a test drive
 * the sentinel's visibility by hand.
 *
 * `observe()` re-emits the last known intersection, mirroring the browser's
 * initial notification for a freshly observed target — which is what the hook
 * relies on when it re-observes after a page settles.
 */
class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];

  callback: IntersectionObserverCallback;

  observed: Element[] = [];

  disconnected = false;

  lastIsIntersecting = false;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    MockIntersectionObserver.instances.push(this);
  }

  private fire(isIntersecting: boolean) {
    act(() => {
      this.callback(
        [{ isIntersecting } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver
      );
    });
  }

  observe(el: Element) {
    this.observed.push(el);
    // A freshly observed target gets an initial notification with its current
    // intersection — this is how re-observing on settle produces a fresh read.
    this.fire(this.lastIsIntersecting);
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
    this.lastIsIntersecting = isIntersecting;
    this.fire(isIntersecting);
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

  it('keeps requesting pages while the sentinel is still visible after each fetch settles', () => {
    // The observer never re-fires on its own because the sentinel never
    // transitions off screen. Re-observing on settle re-reads it and keeps
    // loading a viewport a single page didn't fill.
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

    // Page settled, a fresh read still reports visible → next page.
    rerender({ isFetchingMore: false });
    expect(onLoadMore).toHaveBeenCalledTimes(2);
  });

  it('does not fetch an extra page when a settle finds the sentinel no longer visible', () => {
    // The double-fetch: once a page fills the viewport the sentinel is no longer
    // visible, so a settle must NOT pull another page. Loading is gated on the
    // fresh read at settle time, never a stale one.
    const onLoadMore = jest.fn();
    const { result, rerender } = renderHook(
      ({ isFetchingMore }: { isFetchingMore: boolean }) =>
        useInfiniteScrollSentinel({ hasNextPage: true, isFetchingMore, onLoadMore }),
      { initialProps: { isFetchingMore: false } }
    );

    attach(result);
    latestObserver().emit(true); // visible → first fetch
    expect(onLoadMore).toHaveBeenCalledTimes(1);

    rerender({ isFetchingMore: true });
    latestObserver().emit(false); // the loaded page filled the viewport

    rerender({ isFetchingMore: false }); // settle → re-observe → fresh read is "not visible"
    expect(onLoadMore).toHaveBeenCalledTimes(1);
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
    latestObserver().emit(true); // still visible, but nothing more to load
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

  it('an unstable onLoadMore does not turn inert rerenders into extra fetches', () => {
    const spy = jest.fn();
    const { result, rerender } = renderHook(() =>
      // A fresh arrow every render — onLoadMore's identity changes each time.
      // The hook holds it in a ref, and loading only fires from observer reads,
      // so an inert rerender can't become a fetch.
      useInfiniteScrollSentinel({
        hasNextPage: true,
        isFetchingMore: false,
        onLoadMore: () => spy(),
      })
    );

    attach(result);
    latestObserver().emit(true); // visible → exactly one fetch
    expect(spy).toHaveBeenCalledTimes(1);

    rerender();
    rerender();
    expect(spy).toHaveBeenCalledTimes(1);
  });
});
