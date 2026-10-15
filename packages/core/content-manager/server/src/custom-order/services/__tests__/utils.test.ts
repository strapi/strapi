import { computeMove, isEmptySort, type Placement } from '../utils';

/**
 * Applies a move the way the service does, on a list of positions indexed by document.
 */
const applyMove = (
  positions: Record<string, number>,
  documentId: string,
  anchorId: string,
  placement: Placement
) => {
  const plan = computeMove({
    from: positions[documentId],
    anchor: positions[anchorId],
    placement,
  });

  if (!plan) {
    return positions;
  }

  const next = { ...positions };

  if (plan.shift) {
    const { from, to, by } = plan.shift;

    for (const [id, position] of Object.entries(positions)) {
      if (position >= from && (to === null || position <= to)) {
        next[id] = position + by;
      }
    }
  }

  next[documentId] = plan.position;

  return next;
};

const order = (positions: Record<string, number>) =>
  Object.keys(positions).sort((a, b) => positions[a] - positions[b]);

describe('Custom order | utils', () => {
  describe('computeMove', () => {
    const positions = { a: 1, b: 2, c: 3, d: 4, e: 5 };

    test.each([
      // moving up
      ['d', 'b', 'before', ['a', 'd', 'b', 'c', 'e']],
      ['d', 'b', 'after', ['a', 'b', 'd', 'c', 'e']],
      ['e', 'a', 'before', ['e', 'a', 'b', 'c', 'd']],
      // moving down
      ['b', 'd', 'before', ['a', 'c', 'b', 'd', 'e']],
      ['b', 'd', 'after', ['a', 'c', 'd', 'b', 'e']],
      ['a', 'e', 'after', ['b', 'c', 'd', 'e', 'a']],
    ] as const)('moves %s %s %s', (documentId, anchorId, placement, expected) => {
      const next = applyMove(positions, documentId, anchorId, placement);

      expect(order(next)).toEqual(expected);
      // Positions stay unique
      expect(new Set(Object.values(next)).size).toBe(Object.keys(next).length);
    });

    test('only shifts the documents between the moved document and the anchor', () => {
      const next = applyMove(positions, 'd', 'b', 'before');

      expect(next.a).toBe(positions.a);
      expect(next.e).toBe(positions.e);
    });

    test('does nothing when the document is already in place', () => {
      expect(computeMove({ from: 2, anchor: 3, placement: 'before' })).toBeNull();
      expect(computeMove({ from: 3, anchor: 2, placement: 'after' })).toBeNull();
    });

    test('works with gaps and negative positions', () => {
      const withGaps = { a: -7, b: -2, c: 10, d: 40, e: 41 };

      expect(order(applyMove(withGaps, 'e', 'b', 'before'))).toEqual(['a', 'e', 'b', 'c', 'd']);
      expect(order(applyMove(withGaps, 'a', 'c', 'after'))).toEqual(['b', 'c', 'a', 'd', 'e']);
      expect(order(applyMove(withGaps, 'a', 'd', 'before'))).toEqual(['b', 'c', 'a', 'd', 'e']);
    });

    test('opens a slot next to the anchor when two documents share a position', () => {
      const withTie = { a: 1, b: 2, c: 2, d: 3 };

      const before = applyMove(withTie, 'c', 'b', 'before');
      expect(before.c).toBeLessThan(before.b);
      expect(before.a).toBeLessThan(before.c);
      expect(before.b).toBeLessThan(before.d);

      const after = applyMove(withTie, 'c', 'b', 'after');
      expect(after.c).toBeGreaterThan(after.b);
      expect(after.c).toBeLessThan(after.d);
    });
  });

  describe('isEmptySort', () => {
    test.each([undefined, null, '', [], {}])('%p is empty', (sort) => {
      expect(isEmptySort(sort)).toBe(true);
    });

    test.each(['title:asc', ['title'], { title: 'asc' }])('%p is not empty', (sort) => {
      expect(isEmptySort(sort)).toBe(false);
    });
  });
});
