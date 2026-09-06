import { useCallback, useEffect, useRef } from 'react';

interface UseInfiniteScrollSentinelArgs {
  /** Whether there is a further page to request. */
  hasNextPage: boolean;
  /** Whether a subsequent page is already in flight. */
  isFetchingMore: boolean;
  /** Called to request the next page. Held in a ref, so it need not be stable. */
  onLoadMore: () => void;
  /**
   * Passed to the `IntersectionObserver`. Read once, when the sentinel node
   * attaches — changing it afterwards does NOT rebuild the observer, so a
   * later `threshold`/`rootMargin` is silently ignored. Pass a stable, ideally
   * module-level, object.
   */
  options?: IntersectionObserverInit;
}

/**
 * Infinite-scroll trigger for the media library list.
 *
 * Returns a callback ref to place on a sentinel element rendered after the last
 * row. Three deliberate choices:
 *
 * 1. **Loading is driven only by fresh observer readings.** A fetch fires from
 *    the `IntersectionObserver` callback — never from a state/prop change — so
 *    it can't react to a stale `isIntersecting` from before newly loaded rows
 *    rendered (which fetched an extra page on every trigger).
 *
 * 2. **Each settled page re-observes the sentinel.** An `IntersectionObserver`
 *    only fires on a *transition*. When the sentinel stays on screen (a page
 *    that doesn't fill the viewport — tall viewport, short page, grid fitting
 *    the whole page) it would never fire again and loading would stall. So when
 *    `isFetchingMore` settles back to false we re-observe, forcing a fresh
 *    reading against the new layout: still on screen → load the next page;
 *    viewport now filled → stop.
 *
 * 3. **A callback ref, not a stable object ref.** The sentinel only mounts once
 *    the first page has rendered (the list shows a loader before that). A
 *    callback ref (re)binds the observer exactly when the node mounts/unmounts,
 *    so the observer can't miss a sentinel that appears after the hook first ran.
 */
export const useInfiniteScrollSentinel = ({
  hasNextPage,
  isFetchingMore,
  onLoadMore,
  options,
}: UseInfiniteScrollSentinelArgs) => {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const nodeRef = useRef<HTMLElement | null>(null);

  // Read through refs so the callback ref stays stable and the observer callback
  // always sees the latest values. `options` is read once at attach time (see
  // its JSDoc); `onLoadMore` need not be stable.
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;
  const hasNextPageRef = useRef(hasNextPage);
  hasNextPageRef.current = hasNextPage;
  const isFetchingMoreRef = useRef(isFetchingMore);
  isFetchingMoreRef.current = isFetchingMore;

  const sentinelRef = useCallback((node: HTMLElement | null) => {
    observerRef.current?.disconnect();
    nodeRef.current = node;

    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && hasNextPageRef.current && !isFetchingMoreRef.current) {
        onLoadMoreRef.current();
      }
    }, optionsRef.current);

    observer.observe(node);
    observerRef.current = observer;
  }, []);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  // Once a page settles, re-observe so a *fresh* reading against the new layout
  // decides whether to keep loading — rather than a stale `isIntersecting` from
  // before the rows rendered. Re-observing re-emits the current intersection
  // even without a transition, which is what keeps loading a viewport that a
  // single page didn't fill.
  useEffect(() => {
    if (isFetchingMore || !observerRef.current || !nodeRef.current) {
      return;
    }

    observerRef.current.unobserve(nodeRef.current);
    observerRef.current.observe(nodeRef.current);
  }, [isFetchingMore]);

  return sentinelRef;
};
