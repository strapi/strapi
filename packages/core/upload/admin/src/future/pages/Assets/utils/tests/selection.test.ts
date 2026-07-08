import {
  clearSelection,
  createEmptySelection,
  getSelectAllState,
  selectAll,
  selectOnly,
  selectRange,
  toggleSelection,
  type SelectionState,
} from '../selection';

const stateFrom = (ids: number[], anchorId: number | null = null): SelectionState => ({
  selectedIds: new Set(ids),
  anchorId,
});

const ORDER = [10, 20, 30, 40, 50];

describe('selection logic', () => {
  describe('toggleSelection', () => {
    it('adds an id when absent and sets it as the anchor', () => {
      const next = toggleSelection(createEmptySelection(), 20);

      expect([...next.selectedIds]).toEqual([20]);
      expect(next.anchorId).toBe(20);
    });

    it('removes an id when already present without clearing the rest', () => {
      const next = toggleSelection(stateFrom([10, 20, 30]), 20);

      expect([...next.selectedIds]).toEqual([10, 30]);
      expect(next.anchorId).toBe(20);
    });

    it('does not mutate the input state', () => {
      const prev = stateFrom([10]);
      toggleSelection(prev, 20);

      expect([...prev.selectedIds]).toEqual([10]);
    });
  });

  describe('selectOnly', () => {
    it('replaces the whole selection with a single id', () => {
      const next = selectOnly(stateFrom([10, 20, 30], 30), 40);

      expect([...next.selectedIds]).toEqual([40]);
      expect(next.anchorId).toBe(40);
    });
  });

  describe('selectRange', () => {
    it('selects the range when the anchor is before the target', () => {
      const next = selectRange(stateFrom([20], 20), ORDER, 40);

      expect([...next.selectedIds]).toEqual([20, 30, 40]);
      expect(next.anchorId).toBe(20);
    });

    it('selects the range when the anchor is after the target', () => {
      const next = selectRange(stateFrom([40], 40), ORDER, 20);

      expect([...next.selectedIds]).toEqual([20, 30, 40]);
      expect(next.anchorId).toBe(40);
    });

    it('replaces the previous selection with the new range', () => {
      const next = selectRange(stateFrom([10, 20], 20), ORDER, 30);

      expect([...next.selectedIds]).toEqual([20, 30]);
    });

    it('selects a single item when anchor equals target', () => {
      const next = selectRange(stateFrom([30], 30), ORDER, 30);

      expect([...next.selectedIds]).toEqual([30]);
      expect(next.anchorId).toBe(30);
    });

    it('falls back to selecting only the target when there is no anchor', () => {
      const next = selectRange(createEmptySelection(), ORDER, 30);

      expect([...next.selectedIds]).toEqual([30]);
      expect(next.anchorId).toBe(30);
    });

    it('falls back to selecting only the target when the anchor is no longer in the list', () => {
      const next = selectRange(stateFrom([999], 999), ORDER, 30);

      expect([...next.selectedIds]).toEqual([30]);
      expect(next.anchorId).toBe(30);
    });

    it('returns the previous state when the target is not in the list', () => {
      const prev = stateFrom([20], 20);
      const next = selectRange(prev, ORDER, 999);

      expect(next).toBe(prev);
    });
  });

  describe('selectAll', () => {
    it('selects every id in render order', () => {
      const next = selectAll(ORDER);

      expect([...next.selectedIds]).toEqual(ORDER);
      expect(next.anchorId).toBe(50);
    });

    it('yields an empty selection for an empty list', () => {
      const next = selectAll([]);

      expect(next.selectedIds.size).toBe(0);
      expect(next.anchorId).toBeNull();
    });
  });

  describe('clearSelection', () => {
    it('returns an empty selection', () => {
      const next = clearSelection();

      expect(next.selectedIds.size).toBe(0);
      expect(next.anchorId).toBeNull();
    });
  });

  describe('getSelectAllState', () => {
    it('reports none selected', () => {
      expect(getSelectAllState(new Set(), ORDER)).toEqual({
        allSelected: false,
        isIndeterminate: false,
      });
    });

    it('reports indeterminate when some are selected', () => {
      expect(getSelectAllState(new Set([10, 30]), ORDER)).toEqual({
        allSelected: false,
        isIndeterminate: true,
      });
    });

    it('reports all selected', () => {
      expect(getSelectAllState(new Set(ORDER), ORDER)).toEqual({
        allSelected: true,
        isIndeterminate: false,
      });
    });

    it('ignores selected ids that are not in render order', () => {
      expect(getSelectAllState(new Set([10, 20, 30, 40, 50, 999]), ORDER)).toEqual({
        allSelected: true,
        isIndeterminate: false,
      });
    });

    it('reports nothing for an empty list', () => {
      expect(getSelectAllState(new Set([10]), [])).toEqual({
        allSelected: false,
        isIndeterminate: false,
      });
    });
  });
});
