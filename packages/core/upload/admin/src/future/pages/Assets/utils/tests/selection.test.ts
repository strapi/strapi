import {
  assetKey,
  clearSelection,
  createEmptySelection,
  folderKey,
  getIdsOfKind,
  getSelectAllState,
  selectAll,
  selectOnly,
  selectRange,
  toggleSelection,
  type ItemKey,
  type SelectionState,
} from '../selection';

const stateFrom = (keys: ItemKey[], anchorKey: ItemKey | null = null): SelectionState => ({
  selectedKeys: new Set(keys),
  anchorKey,
});

// Mixed render order: folders first, then assets — like the views build it.
const ORDER: ItemKey[] = [folderKey(1), folderKey(2), assetKey(10), assetKey(20), assetKey(30)];

describe('selection logic', () => {
  describe('item keys', () => {
    it('namespaces asset and folder ids so they cannot collide', () => {
      expect(assetKey(1)).toBe('asset:1');
      expect(folderKey(1)).toBe('folder:1');
      expect(assetKey(1)).not.toBe(folderKey(1));
    });
  });

  describe('getIdsOfKind', () => {
    it('extracts numeric ids of one kind from a mixed key set', () => {
      const keys = new Set<ItemKey>([folderKey(1), assetKey(10), assetKey(20)]);

      expect([...getIdsOfKind(keys, 'asset')]).toEqual([10, 20]);
      expect([...getIdsOfKind(keys, 'folder')]).toEqual([1]);
    });
  });

  describe('toggleSelection', () => {
    it('adds a key when absent and sets it as the anchor', () => {
      const next = toggleSelection(createEmptySelection(), assetKey(20));

      expect([...next.selectedKeys]).toEqual([assetKey(20)]);
      expect(next.anchorKey).toBe(assetKey(20));
    });

    it('removes a key when already present without clearing the rest', () => {
      const next = toggleSelection(
        stateFrom([folderKey(1), assetKey(10), assetKey(20)]),
        assetKey(10)
      );

      expect([...next.selectedKeys]).toEqual([folderKey(1), assetKey(20)]);
      expect(next.anchorKey).toBe(assetKey(10));
    });

    it('does not mutate the input state', () => {
      const prev = stateFrom([assetKey(10)]);
      toggleSelection(prev, assetKey(20));

      expect([...prev.selectedKeys]).toEqual([assetKey(10)]);
    });
  });

  describe('selectOnly', () => {
    it('replaces the whole selection with a single key', () => {
      const next = selectOnly(
        stateFrom([folderKey(1), assetKey(10), assetKey(20)], assetKey(20)),
        assetKey(30)
      );

      expect([...next.selectedKeys]).toEqual([assetKey(30)]);
      expect(next.anchorKey).toBe(assetKey(30));
    });
  });

  describe('selectRange', () => {
    it('selects the range when the anchor is before the target', () => {
      const next = selectRange(stateFrom([folderKey(2)], folderKey(2)), ORDER, assetKey(20));

      expect([...next.selectedKeys]).toEqual([folderKey(2), assetKey(10), assetKey(20)]);
      expect(next.anchorKey).toBe(folderKey(2));
    });

    it('selects the range when the anchor is after the target', () => {
      const next = selectRange(stateFrom([assetKey(20)], assetKey(20)), ORDER, folderKey(2));

      expect([...next.selectedKeys]).toEqual([folderKey(2), assetKey(10), assetKey(20)]);
      expect(next.anchorKey).toBe(assetKey(20));
    });

    it('spans the folder and asset sections in one contiguous range', () => {
      const next = selectRange(stateFrom([folderKey(1)], folderKey(1)), ORDER, assetKey(30));

      expect([...next.selectedKeys]).toEqual(ORDER);
    });

    it('replaces the previous selection with the new range', () => {
      const next = selectRange(
        stateFrom([folderKey(1), assetKey(10)], assetKey(10)),
        ORDER,
        assetKey(20)
      );

      expect([...next.selectedKeys]).toEqual([assetKey(10), assetKey(20)]);
    });

    it('selects a single item when anchor equals target', () => {
      const next = selectRange(stateFrom([assetKey(20)], assetKey(20)), ORDER, assetKey(20));

      expect([...next.selectedKeys]).toEqual([assetKey(20)]);
      expect(next.anchorKey).toBe(assetKey(20));
    });

    it('falls back to selecting only the target when there is no anchor', () => {
      const next = selectRange(createEmptySelection(), ORDER, assetKey(20));

      expect([...next.selectedKeys]).toEqual([assetKey(20)]);
      expect(next.anchorKey).toBe(assetKey(20));
    });

    it('falls back to selecting only the target when the anchor is no longer in the list', () => {
      const next = selectRange(stateFrom([assetKey(999)], assetKey(999)), ORDER, assetKey(20));

      expect([...next.selectedKeys]).toEqual([assetKey(20)]);
      expect(next.anchorKey).toBe(assetKey(20));
    });

    it('returns the previous state when the target is not in the list', () => {
      const prev = stateFrom([assetKey(20)], assetKey(20));
      const next = selectRange(prev, ORDER, assetKey(999));

      expect(next).toBe(prev);
    });
  });

  describe('selectAll', () => {
    it('selects every key (folders and assets) in render order', () => {
      const next = selectAll(ORDER);

      expect([...next.selectedKeys]).toEqual(ORDER);
      expect(next.anchorKey).toBe(assetKey(30));
    });

    it('yields an empty selection for an empty list', () => {
      const next = selectAll([]);

      expect(next.selectedKeys.size).toBe(0);
      expect(next.anchorKey).toBeNull();
    });
  });

  describe('clearSelection', () => {
    it('returns an empty selection', () => {
      const next = clearSelection();

      expect(next.selectedKeys.size).toBe(0);
      expect(next.anchorKey).toBeNull();
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
      expect(getSelectAllState(new Set([folderKey(1), assetKey(20)]), ORDER)).toEqual({
        allSelected: false,
        isIndeterminate: true,
      });
    });

    it('reports indeterminate when only folders are selected', () => {
      expect(getSelectAllState(new Set([folderKey(1), folderKey(2)]), ORDER)).toEqual({
        allSelected: false,
        isIndeterminate: true,
      });
    });

    it('reports all selected only when folders and assets are all selected', () => {
      expect(getSelectAllState(new Set(ORDER), ORDER)).toEqual({
        allSelected: true,
        isIndeterminate: false,
      });
    });

    it('ignores selected keys that are not in render order', () => {
      expect(getSelectAllState(new Set([...ORDER, assetKey(999)]), ORDER)).toEqual({
        allSelected: true,
        isIndeterminate: false,
      });
    });

    it('reports nothing for an empty list', () => {
      expect(getSelectAllState(new Set([assetKey(10)]), [])).toEqual({
        allSelected: false,
        isIndeterminate: false,
      });
    });
  });
});
