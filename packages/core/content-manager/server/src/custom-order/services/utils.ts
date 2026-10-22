import { POSITION_ATTRIBUTE } from '../constants';

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

type Direction = 'asc' | 'desc';

const parseSortEntry = (entry: unknown): { field: string; direction: Direction } | null => {
  if (typeof entry === 'string') {
    const [field, direction] = entry.trim().split(':');

    return field ? { field, direction: toDirection(direction) } : null;
  }

  if (entry && typeof entry === 'object') {
    const fields = Object.keys(entry);
    const field = fields[fields.length - 1];

    return field
      ? { field, direction: toDirection((entry as Record<string, unknown>)[field]) }
      : null;
  }

  return null;
};

const toDirection = (value: unknown): Direction =>
  typeof value === 'string' && value.toLowerCase() === 'desc' ? 'desc' : 'asc';

/**
 * Completes a sort that ends on the position with the `id` of the row.
 *
 * Positions alone don't make a total order: every row of a document shares its position,
 * rows written outside of the Document Service have none, and without a tie-breaker each
 * database would place those rows differently, and not always on the same page. Among
 * equals the most recent row comes first, like new entries do.
 *
 * @returns the same `sort` when it does not end on the position.
 */
const toSortEntries = (sort: unknown): unknown[] => {
  if (typeof sort === 'string') {
    return sort.split(',');
  }

  return Array.isArray(sort) ? sort : [sort];
};

export const withTieBreaker = (sort: unknown): unknown => {
  const entries = toSortEntries(sort);
  const last = parseSortEntry(entries[entries.length - 1]);

  if (!last || last.field !== POSITION_ATTRIBUTE) {
    return sort;
  }

  const tieBreaker: Direction = last.direction === 'asc' ? 'desc' : 'asc';

  if (typeof sort === 'string') {
    return `${sort},id:${tieBreaker}`;
  }

  if (Array.isArray(sort)) {
    return [
      ...sort,
      typeof entries[entries.length - 1] === 'string' ? `id:${tieBreaker}` : { id: tieBreaker },
    ];
  }

  return { ...(sort as Record<string, unknown>), id: tieBreaker };
};
