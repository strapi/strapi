import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

/**
 * The admin layout marks the element that scrolls the main column (see
 * `Layouts.Root`). The media library has no scroll container of its own, so the
 * offset to save and restore belongs to that ancestor.
 */
const SCROLL_ROOT_SELECTOR = '[data-strapi-main-content]';

/**
 * How long a restore keeps retrying after the list key changes.
 *
 * A returning list usually comes back from memory in one commit, so the first
 * attempt lands. When it doesn't — pages still loading, so the content isn't yet
 * tall enough to scroll that far — later commits retry. Past this window the
 * offset is dropped rather than yanked out from under someone already reading.
 */
const RESTORE_WINDOW_MS = 2000;

/**
 * How many list offsets to keep. Matches `MAX_REMEMBERED_LISTS` in
 * `useInfiniteAssets`: the two are keyed identically, so they should forget on
 * the same terms.
 */
const MAX_REMEMBERED_OFFSETS = 10;

interface PendingRestore {
  top: number;
  deadline: number;
}

/**
 * Remembers where each list was scrolled to and puts it back on return.
 *
 * `key` fingerprints the list on screen (folder, search, sort, filters). While
 * it holds steady the current offset is recorded; when it changes the incoming
 * key's saved offset is restored, or the list is sent to the top if it has none
 * — a first visit, or one whose entry has been dropped.
 *
 * Returns a callback ref to place on any element inside the scrolling column;
 * it only locates that column, it is never scrolled itself.
 *
 * Restoring a *position* only helps if the rows that filled it come back too —
 * that is `useInfiniteAssets`' job.
 */
export const useListScrollRestoration = (key: string) => {
  const offsetsRef = useRef(new Map<string, number>());
  const containerRef = useRef<HTMLElement | null>(null);
  const detachRef = useRef<(() => void) | null>(null);
  // The key offsets are currently filed under. In a ref because the scroll
  // listener is attached once and must read the current value.
  const keyRef = useRef(key);
  const pendingRef = useRef<PendingRestore | null>(null);

  const anchorRef = useCallback((node: HTMLElement | null) => {
    detachRef.current?.();
    detachRef.current = null;
    containerRef.current = null;

    const container = node?.closest<HTMLElement>(SCROLL_ROOT_SELECTOR);

    if (!container) {
      return;
    }

    const handleScroll = () => {
      const offsets = offsetsRef.current;

      // Delete before set so the entry moves to the end. Map iterates in
      // insertion order, so the first key is the least recently scrolled.
      offsets.delete(keyRef.current);
      offsets.set(keyRef.current, container.scrollTop);

      while (offsets.size > MAX_REMEMBERED_OFFSETS) {
        const oldest = offsets.keys().next().value;

        if (oldest === undefined) {
          break;
        }

        offsets.delete(oldest);
      }
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    containerRef.current = container;
    detachRef.current = () => container.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => () => detachRef.current?.(), []);

  // Runs on every commit, not just when `key` changes: a restore the first
  // commit was too short to satisfy must be retried as the rows arrive, and
  // there is no state to key that off. Layout phase so the list is never
  // painted at the wrong offset.
  useLayoutEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    if (keyRef.current !== key) {
      keyRef.current = key;
      pendingRef.current = {
        top: offsetsRef.current.get(key) ?? 0,
        deadline: Date.now() + RESTORE_WINDOW_MS,
      };
    }

    const pending = pendingRef.current;

    if (!pending) {
      return;
    }

    // Before the assignment, not alongside it: past the window the offset has to
    // be dropped rather than applied one final time to a list the user has since
    // scrolled themselves.
    if (Date.now() > pending.deadline) {
      pendingRef.current = null;
      return;
    }

    container.scrollTop = pending.top;

    // The browser clamps to the content that exists now, so a target the list
    // isn't tall enough for yet stays pending for the next commit.
    if (container.scrollTop >= pending.top) {
      pendingRef.current = null;
    }
  });

  return anchorRef;
};
