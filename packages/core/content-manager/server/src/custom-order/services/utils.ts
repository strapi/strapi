export type Placement = 'before' | 'after';

export interface MovePlan {
  /** New position of the moved document. */
  position: number;
  /**
   * Positions to shift to make room, bounds included. `to: null` means every position
   * from `from` upwards.
   */
  shift: { from: number; to: number | null; by: 1 | -1 } | null;
}

/**
 * Works out how to place a document right before or after an anchor document.
 *
 * Positions are unique integers that may have gaps. Only the documents sitting between
 * the moved document and the anchor are shifted, by one, towards the slot the moved
 * document leaves behind.
 *
 * @returns null when the document is already in place.
 */
export const computeMove = ({
  from,
  anchor,
  placement,
}: {
  from: number;
  anchor: number;
  placement: Placement;
}): MovePlan | null => {
  if (from === anchor) {
    // Two documents should never share a position. If it happens anyway (e.g. concurrent
    // writes), open a slot next to the anchor instead of relying on the slot left behind.
    return placement === 'before'
      ? { position: anchor, shift: { from: anchor, to: null, by: 1 } }
      : { position: anchor + 1, shift: { from: anchor + 1, to: null, by: 1 } };
  }

  const movingDown = from < anchor;

  if (placement === 'before') {
    if (movingDown) {
      const position = anchor - 1;

      return from === position
        ? null
        : { position, shift: { from: from + 1, to: position, by: -1 } };
    }

    return { position: anchor, shift: { from: anchor, to: from - 1, by: 1 } };
  }

  if (movingDown) {
    return { position: anchor, shift: { from: from + 1, to: anchor, by: -1 } };
  }

  const position = anchor + 1;

  return from === position ? null : { position, shift: { from: position, to: from - 1, by: 1 } };
};

/**
 * Whether a Document Service `sort` param is absent or empty.
 */
export const isEmptySort = (sort: unknown): boolean => {
  if (sort === undefined || sort === null || sort === '') {
    return true;
  }

  if (Array.isArray(sort)) {
    return sort.length === 0;
  }

  if (typeof sort === 'object') {
    return Object.keys(sort).length === 0;
  }

  return false;
};
