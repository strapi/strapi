import { createContext, createElement, useCallback, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

/**
 * Which assets have a long-running mutation in flight, so the list can show it
 * on the item itself.
 *
 * The mutation stays where it is triggered — the row's "..." menu — but the
 * feedback has to render on the row or card, which is an ancestor of it. The
 * menu sits in a leaf `<td>` (table) / footer `Flex` (grid), so an overlay
 * mounted there would cover the button and nothing else. Rather than hoist the
 * mutation up into both `AssetRow` and `AssetCard` (duplicating it, and moving
 * it away from the control that owns it), the busy flag travels up through
 * context and the ancestor renders the overlay.
 *
 * Scoped per asset id rather than a single boolean: a replace on one row must
 * not blank out every other row. Modelled on `isMovePending` in
 * `AssetsDndProvider`, which does the same thing for drag-moves — that one is
 * list-wide because a move genuinely blocks the whole list.
 */
export interface BusyAssets {
  /** Whether this asset has a mutation in flight. */
  isBusy: (id: number) => boolean;
  /** The message to show while it is, or `null`. */
  getBusyMessage: (id: number) => string | null;
  /**
   * Marks the asset busy and returns the release function. Pair it with
   * `try`/`finally` so the flag clears on failure too.
   */
  markBusy: (id: number, message: string) => () => void;
}

const BusyAssetsContext = createContext<BusyAssets | null>(null);

export const BusyAssetsProvider = ({ children }: { children: ReactNode }) => {
  const [busyById, setBusyById] = useState<Record<number, string>>({});

  const markBusy = useCallback((id: number, message: string) => {
    setBusyById((prev) => ({ ...prev, [id]: message }));

    return () =>
      setBusyById((prev) => {
        // Rebuild without the key rather than mutating — the value is compared
        // by identity downstream.
        const { [id]: _released, ...rest } = prev;
        return rest;
      });
  }, []);

  const isBusy = useCallback((id: number) => busyById[id] !== undefined, [busyById]);

  const getBusyMessage = useCallback((id: number) => busyById[id] ?? null, [busyById]);

  const value = useMemo<BusyAssets>(
    () => ({ isBusy, getBusyMessage, markBusy }),
    [isBusy, getBusyMessage, markBusy]
  );

  return createElement(BusyAssetsContext.Provider, { value }, children);
};

/**
 * Optional by design: `AssetActionsMenu`, `AssetRow` and `AssetCard` are also
 * rendered in tests and in the asset picker, outside this provider. Without it
 * the mutation still runs, it just shows no row-level feedback.
 */
export const useBusyAssetsOptional = () => useContext(BusyAssetsContext);
