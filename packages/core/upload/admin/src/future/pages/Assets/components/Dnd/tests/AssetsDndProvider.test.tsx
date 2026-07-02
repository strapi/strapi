import { act, render, screen, waitFor } from '@tests/utils';

import { AssetsDndProvider, useAssetsDnd } from '../AssetsDndProvider';

import type { FolderNode } from '../../../../../../../../shared/contracts/folders';
import type { DragEndEvent } from '@dnd-kit/core';

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

let triggerDragEnd: ((event: DragEndEvent) => void) | undefined;

jest.mock('@dnd-kit/core', () => {
  const actual = jest.requireActual('@dnd-kit/core');

  return {
    ...actual,
    DndContext: ({ onDragEnd, ...props }: React.ComponentProps<typeof actual.DndContext>) => {
      triggerDragEnd = onDragEnd;

      return <actual.DndContext onDragEnd={onDragEnd} {...props} />;
    },
  };
});

const MovePendingProbe = () => {
  const { isMovePending } = useAssetsDnd();

  return <div data-testid="move-pending">{String(isMovePending)}</div>;
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

const setup = () =>
  render(
    <AssetsDndProvider>
      <MovePendingProbe />
    </AssetsDndProvider>
  );

describe('AssetsDndProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockIsMovePending = false;
    mockBulkMoveUnwrap.mockResolvedValue({});
    triggerDragEnd = undefined;
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
        triggerDragEnd?.(validDragEndEvent);
      });

      expect(mockBulkMove).not.toHaveBeenCalled();
      expect(mockToggleNotification).not.toHaveBeenCalled();
    });

    it('calls bulkMove when no move is pending and the drop is valid', async () => {
      mockIsMovePending = false;
      setup();

      await act(async () => {
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

  describe('Invalid drop guard', () => {
    it('does not call bulkMove when dropping a folder onto a descendant', async () => {
      setup();

      await act(async () => {
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
});
