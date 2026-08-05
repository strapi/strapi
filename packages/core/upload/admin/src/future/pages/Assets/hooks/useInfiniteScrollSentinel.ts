import { useCallback, useEffect, useRef, useState } from 'react';

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
 * row. Two deliberate choices fix the "page 2 never loads" bug:
 *
 * 1. **Fetching is driven by state, not by the observer's events.** An
 *    `IntersectionObserver` only fires on a *transition*. Once the sentinel is
 *    visible and stays visible (a page that doesn't push it off screen — tall
 *    viewport, a short final page, grid view fitting the whole page), it never
 *    fires again, so a callback-per-event approach loads one page and stalls.
 *    Here the observer only maintains `isVisible`; an effect reacts to
 *    `isFetchingMore` settling and keeps pulling pages while the sentinel is
 *    still on screen — until the viewport fills or `hasNextPage` is false.
 *
 * 2. **A callback ref, not a stable object ref.** The sentinel only mounts once
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
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Both read through refs so the callback ref and the load effect stay stable:
  // `options` is read once at attach time (see its JSDoc), and `onLoadMore` need
  // not be stable — an inline arrow from the caller can't turn the effect into a
  // fetch-per-render loop.
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  const sentinelRef = useCallback((node: HTMLElement | null) => {
    observerRef.current?.disconnect();

    if (!node) {
      setIsVisible(false);
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, optionsRef.current);

    observer.observe(node);
    observerRef.current = observer;
  }, []);

  useEffect(() => () => observerRef.current?.disconnect(), []);

  useEffect(() => {
    if (isVisible && hasNextPage && !isFetchingMore) {
      onLoadMoreRef.current();
    }
  }, [isVisible, hasNextPage, isFetchingMore]);

  return sentinelRef;
};
