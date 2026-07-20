import { act, render, screen, waitFor } from '@tests/utils';

import { AssetSelectionProvider, useAssetSelection } from '../../../hooks/useAssetSelection';
import { assetKey, folderKey } from '../../../utils/selection';
import { AssetsDndProvider, useAssetsDnd } from '../AssetsDndProvider';

import type { FolderNode } from '../../../../../../../../shared/contracts/folders';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';

const mockToggleNotification = jest.fn();
const mockBulkMoveUnwrap = jest.fn().mockResolvedValue({});
const mockBulkMove = jest.fn().mockReturnValue({ unwrap: mockBulkMoveUnwrap });

let mockIsMovePending = false;

const folderStructure: FolderNode[] = [
  {
    id: 1,
    name: 'Marketing',
    children: [{ id: 2, name: '2023', children: [] }],
  },
  { id: 5, name: 'Sibling', children: [] },
];

jest.mock('../../../../../services/folders', () => ({
  useBulkMoveMutation: () => [mockBulkMove, { isLoading: mockIsMovePending }],
  useGetFolderStructureQuery: () => ({ data: folderStructure }),
}));

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useNotification: () => ({ toggleNotification: mockToggleNotification }),
}));

let triggerDragStart: ((event: DragStartEvent) => void) | undefined;
let triggerDragEnd: ((event: DragEndEvent) => void) | undefined;
let triggerDragCancel: (() => void) | undefined;

jest.mock('@dnd-kit/core', () => {
  const actual = jest.requireActual('@dnd-kit/core');

  return {
    ...actual,
    DndContext: ({
      onDragStart,
      onDragEnd,
      onDragCancel,
      ...props
    }: React.ComponentProps<typeof actual.DndContext>) => {
      triggerDragStart = onDragStart;
      triggerDragEnd = onDragEnd;
      triggerDragCancel = onDragCancel;

      return (
        <actual.DndContext
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
          {...props}
        />
      );
    },
  };
});

const MovePendingProbe = () => {
  const { isMovePending } = useAssetsDnd();

  return <div data-testid="move-pending">{String(isMovePending)}</div>;
};

const ValidityProbe = ({ targetId }: { targetId: number | null }) => {
  const { isValidDropTarget } = useAssetsDnd();

  return <div data-testid="valid-target">{String(isValidDropTarget(targetId))}</div>;
};

const SelectionProbe = () => {
  const { selectedKeys } = useAssetSelection();

  return <div data-testid="selection-size">{selectedKeys.size}</div>;
};

const SeedSelection = ({ keys }: { keys: string[] }) => {
  const { toggle, selectedKeys } = useAssetSelection();

  return (
    <button
      type="button"
      data-testid="seed-selection"
      onClick={() => {
        keys.forEach((key) => {
          if (!selectedKeys.has(key as never)) {
            toggle(key as never);
          }
        });
      }}
    >
      seed
    </button>
  );
};

const validDragEndEvent: DragEndEvent = {
  activatorEvent: new Event('pointerup'),
  active: {
    id: 'file:10',
    data: {
      current: {
        kind: 'file',
        id: 10,
        name: 'hero.png',
        folderId: 5,
      },
    },
    rect: { current: { initial: null, translated: null } },
  },
  collisions: null,
  delta: { x: 0, y: 0 },
  over: {
    id: 'folder-target:2',
    data: {
      current: {
        kind: 'folder-target',
        id: 2,
        name: '2023',
      },
    },
    rect: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 },
    disabled: false,
  },
};

const fileDragStartEvent: DragStartEvent = {
  activatorEvent: new Event('pointerdown'),
  active: validDragEndEvent.active,
};

const setup = (ui?: React.ReactNode) =>
  render(
    <AssetSelectionProvider>
      <AssetsDndProvider>
        <MovePendingProbe />
        <ValidityProbe targetId={2} />
        <SelectionProbe />
        {ui}
      </AssetsDndProvider>
    </AssetSelectionProvider>
  );

describe('AssetsDndProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsMovePending = false;
    mockBulkMoveUnwrap.mockResolvedValue({});
    triggerDragStart = undefined;
    triggerDragEnd = undefined;
    triggerDragCancel = undefined;
  });

  describe('isMovePending', () => {
    it('exposes isMovePending as false while bulk move is idle', () => {
      mockIsMovePending = false;
      setup();

      expect(screen.getByTestId('move-pending')).toHaveTextContent('false');
    });

    it('exposes isMovePending as true while bulk move is in flight', () => {
      mockIsMovePending = true;
      setup();

      expect(screen.getByTestId('move-pending')).toHaveTextContent('true');
    });
  });

  describe('Concurrent drag guard', () => {
    it('does not call bulkMove when a move is already pending', async () => {
      mockIsMovePending = true;
      setup();

      await act(async () => {
        triggerDragStart?.(fileDragStartEvent);
        triggerDragEnd?.(validDragEndEvent);
      });

      expect(mockBulkMove).not.toHaveBeenCalled();
      expect(mockToggleNotification).not.toHaveBeenCalled();
    });

    it('calls bulkMove when no move is pending and the drop is valid', async () => {
      mockIsMovePending = false;
      setup();

      await act(async () => {
        triggerDragStart?.(fileDragStartEvent);
        triggerDragEnd?.(validDragEndEvent);
      });

      await waitFor(() => {
        expect(mockBulkMove).toHaveBeenCalledWith({
          fileIds: [10],
          folderIds: [],
          destinationFolderId: 2,
        });
      });
    });
  });

  describe('Success messaging', () => {
    it('announces the rich move message with source and destination leaf names', async () => {
      setup();

      await act(async () => {
        triggerDragStart?.(fileDragStartEvent);
        triggerDragEnd?.(validDragEndEvent);
      });

      // currentFolderId defaults to root → "Media Library"; destination folder 2
      // resolves to its leaf name "2023".
      await waitFor(() => {
        expect(mockToggleNotification).toHaveBeenCalledWith({
          type: 'success',
          message: '1 element has been moved from Media Library to 2023',
        });
      });
    });

    it('falls back to the shared move error message when the server sends no message', async () => {
      mockBulkMoveUnwrap.mockRejectedValueOnce({});
      setup();

      await act(async () => {
        triggerDragStart?.(fileDragStartEvent);
        triggerDragEnd?.(validDragEndEvent);
      });

      await waitFor(() => {
        expect(mockToggleNotification).toHaveBeenCalledWith({
          type: 'danger',
          message: 'An error occurred while moving the items.',
        });
      });
    });
  });

  describe('Selection-aware multi-drag', () => {
    it('moves the full selection when dragging a selected item', async () => {
      const { user } = setup(<SeedSelection keys={[assetKey(10), assetKey(20), folderKey(3)]} />);

      await user.click(screen.getByTestId('seed-selection'));
      expect(screen.getByTestId('selection-size')).toHaveTextContent('3');

      await act(async () => {
        triggerDragStart?.(fileDragStartEvent);
        triggerDragEnd?.(validDragEndEvent);
      });

      await waitFor(() => {
        expect(mockBulkMove).toHaveBeenCalledWith({
          fileIds: expect.arrayContaining([10, 20]),
          folderIds: [3],
          destinationFolderId: 2,
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('selection-size')).toHaveTextContent('0');
      });
    });

    it('moves only the unselected item and preserves the unrelated selection', async () => {
      const { user } = setup(<SeedSelection keys={[assetKey(20), folderKey(3)]} />);

      await user.click(screen.getByTestId('seed-selection'));
      expect(screen.getByTestId('selection-size')).toHaveTextContent('2');

      await act(async () => {
        triggerDragStart?.(fileDragStartEvent);
        triggerDragEnd?.(validDragEndEvent);
      });

      await waitFor(() => {
        expect(mockBulkMove).toHaveBeenCalledWith({
          fileIds: [10],
          folderIds: [],
          destinationFolderId: 2,
        });
      });

      expect(screen.getByTestId('selection-size')).toHaveTextContent('2');
    });

    it('preserves selection when the drag is cancelled', async () => {
      const { user } = setup(<SeedSelection keys={[assetKey(10), assetKey(20)]} />);

      await user.click(screen.getByTestId('seed-selection'));

      await act(async () => {
        triggerDragStart?.(fileDragStartEvent);
        triggerDragCancel?.();
      });

      expect(mockBulkMove).not.toHaveBeenCalled();
      expect(screen.getByTestId('selection-size')).toHaveTextContent('2');
    });

    it('preserves selection when the move fails', async () => {
      mockBulkMoveUnwrap.mockRejectedValueOnce(new Error('boom'));
      const { user } = setup(<SeedSelection keys={[assetKey(10), assetKey(20)]} />);

      await user.click(screen.getByTestId('seed-selection'));

      await act(async () => {
        triggerDragStart?.(fileDragStartEvent);
        triggerDragEnd?.(validDragEndEvent);
      });

      await waitFor(() => {
        expect(mockToggleNotification).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'danger' })
        );
      });

      expect(screen.getByTestId('selection-size')).toHaveTextContent('2');
    });
  });

  describe('Centralized target validity', () => {
    it('exposes O(1) validity for the active drag set', async () => {
      setup();

      expect(screen.getByTestId('valid-target')).toHaveTextContent('false');

      await act(async () => {
        triggerDragStart?.(fileDragStartEvent);
      });

      await waitFor(() => {
        expect(screen.getByTestId('valid-target')).toHaveTextContent('true');
      });
    });
  });

  describe('Invalid drop guard', () => {
    it('does not call bulkMove when dropping a folder onto a descendant', async () => {
      setup();

      await act(async () => {
        triggerDragStart?.({
          activatorEvent: new Event('pointerdown'),
          active: {
            id: 'folder:1',
            data: {
              current: {
                kind: 'folder',
                id: 1,
                name: 'Marketing',
                parentId: null,
              },
            },
            rect: { current: { initial: null, translated: null } },
          },
        });
        triggerDragEnd?.({
          ...validDragEndEvent,
          active: {
            ...validDragEndEvent.active,
            id: 'folder:1',
            data: {
              current: {
                kind: 'folder',
                id: 1,
                name: 'Marketing',
                parentId: null,
              },
            },
          },
          over: {
            id: 'folder-target:2',
            data: {
              current: {
                kind: 'folder-target',
                id: 2,
                name: '2023',
              },
            },
            rect: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 },
            disabled: false,
          },
        });
      });

      expect(mockBulkMove).not.toHaveBeenCalled();
      expect(mockToggleNotification).not.toHaveBeenCalled();
    });

    it('does not call bulkMove when dropping a file onto its current folder', async () => {
      setup();

      await act(async () => {
        triggerDragStart?.({
          activatorEvent: new Event('pointerdown'),
          active: {
            ...validDragEndEvent.active,
            data: {
              current: {
                kind: 'file',
                id: 10,
                name: 'hero.png',
                folderId: 2,
              },
            },
          },
        });
        triggerDragEnd?.({
          ...validDragEndEvent,
          active: {
            ...validDragEndEvent.active,
            data: {
              current: {
                kind: 'file',
                id: 10,
                name: 'hero.png',
                folderId: 2,
              },
            },
          },
          over: {
            id: 'folder-target:2',
            data: {
              current: {
                kind: 'folder-target',
                id: 2,
                name: '2023',
              },
            },
            rect: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 },
            disabled: false,
          },
        });
      });

      expect(mockBulkMove).not.toHaveBeenCalled();
      expect(mockToggleNotification).not.toHaveBeenCalled();
    });
  });

  describe('Sidebar tree drop targets', () => {
    it('calls bulkMove when dropping onto a sidebar folder row', async () => {
      setup();

      await act(async () => {
        triggerDragStart?.(fileDragStartEvent);
        triggerDragEnd?.({
          ...validDragEndEvent,
          over: {
            id: 'folder-tree-target:2',
            data: {
              current: {
                kind: 'folder-tree-target',
                id: 2,
                name: '2023',
              },
            },
            rect: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 },
            disabled: false,
          },
        });
      });

      await waitFor(() => {
        expect(mockBulkMove).toHaveBeenCalledWith({
          fileIds: [10],
          folderIds: [],
          destinationFolderId: 2,
        });
      });
    });

    it('calls bulkMove with null destination when dropping onto Home', async () => {
      setup();

      await act(async () => {
        triggerDragStart?.(fileDragStartEvent);
        triggerDragEnd?.({
          ...validDragEndEvent,
          over: {
            id: 'folder-tree-target:home',
            data: {
              current: {
                kind: 'folder-tree-target',
                id: null,
                name: 'Home',
              },
            },
            rect: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 },
            disabled: false,
          },
        });
      });

      await waitFor(() => {
        expect(mockBulkMove).toHaveBeenCalledWith({
          fileIds: [10],
          folderIds: [],
          destinationFolderId: null,
        });
      });
    });

    it('does not call bulkMove when dropping a root item onto Home', async () => {
      setup();

      await act(async () => {
        triggerDragStart?.({
          activatorEvent: new Event('pointerdown'),
          active: {
            ...validDragEndEvent.active,
            data: {
              current: {
                kind: 'file',
                id: 10,
                name: 'hero.png',
                folderId: null,
              },
            },
          },
        });
        triggerDragEnd?.({
          ...validDragEndEvent,
          active: {
            ...validDragEndEvent.active,
            data: {
              current: {
                kind: 'file',
                id: 10,
                name: 'hero.png',
                folderId: null,
              },
            },
          },
          over: {
            id: 'folder-tree-target:home',
            data: {
              current: {
                kind: 'folder-tree-target',
                id: null,
                name: 'Home',
              },
            },
            rect: { width: 0, height: 0, top: 0, left: 0, right: 0, bottom: 0 },
            disabled: false,
          },
        });
      });

      expect(mockBulkMove).not.toHaveBeenCalled();
      expect(mockToggleNotification).not.toHaveBeenCalled();
    });
  });
});
