import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useNotification } from '@strapi/admin/strapi-admin';
import { Box, VisuallyHidden } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { useBulkMoveMutation, useGetFolderStructureQuery } from '../../../../services/folders';
import { buildBulkMovePayload } from '../../../../utils/buildBulkMovePayload';
import { canDropItemOnFolder } from '../../../../utils/canDropItemOnFolder';
import { formatMoveSuccessMessage } from '../../../../utils/formatMoveSuccessMessage';
import { getBulkMoveErrorMessage } from '../../../../utils/getBulkMoveErrorMessage';
import { getFolderLabel } from '../../../../utils/getFolderLabel';
import { getTranslationKey } from '../../../../utils/translations';
import { useAssetSelectionOptional } from '../../hooks/useAssetSelection';
import { useFolderNavigation } from '../../hooks/useFolderNavigation';

import { buildDragSet } from './buildDragSet';
import { computeValidDropTargets } from './computeValidDropTargets';
import { parseFolderTargetId, parseFolderTreeTargetId } from './dndIds';
import { DragOverlayChip } from './DragOverlayChip';

import type { DragItemData } from '../../../../types/dnd';

/* -------------------------------------------------------------------------------------------------
 * Context — shared with UploadDropZoneProvider for bidirectional drag guard.
 * See UploadDropZoneContext.tsx TODO linking both providers.
 * -----------------------------------------------------------------------------------------------*/

interface AssetsDndContextValue {
  isInternalDragActive: boolean;
  isMovePending: boolean;
  /** O(1) lookup of whether the current drag set may drop on this destination. */
  isValidDropTarget: (targetFolderId: number | null) => boolean;
}

const AssetsDndContext = createContext<AssetsDndContextValue | null>(null);

export const useAssetsDnd = () => {
  const context = useContext(AssetsDndContext);

  if (!context) {
    throw new Error('useAssetsDnd must be used within AssetsDndProvider');
  }

  return context;
};

export const useAssetsDndOptional = () => useContext(AssetsDndContext);

/* -------------------------------------------------------------------------------------------------
 * Provider
 * -----------------------------------------------------------------------------------------------*/

interface AssetsDndProviderProps {
  children: ReactNode;
}

interface DragSession {
  items: DragItemData[];
  fromSelection: boolean;
}

const resolveDestination = (
  overId: string | number
): { destinationFolderId: number | null } | null => {
  const inView = parseFolderTargetId(overId);

  if (inView != null) {
    return { destinationFolderId: inView };
  }

  const tree = parseFolderTreeTargetId(overId);

  if (tree === 'root') {
    return { destinationFolderId: null };
  }

  if (typeof tree === 'number') {
    return { destinationFolderId: tree };
  }

  return null;
};

export const AssetsDndProvider = ({ children }: AssetsDndProviderProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const selection = useAssetSelectionOptional();
  const { currentFolderId } = useFolderNavigation();
  const { data: folderStructure = [] } = useGetFolderStructureQuery();
  const rootLabel = formatMessage({
    id: getTranslationKey('plugin.name'),
    defaultMessage: 'Media Library',
  });
  const [bulkMove, { isLoading: isMovePending }] = useBulkMoveMutation();
  const [dragItems, setDragItems] = useState<DragItemData[]>([]);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  // Sync session for drag-end — state alone can lag one render behind dragStart.
  const dragSessionRef = useRef<DragSession>({ items: [], fromSelection: false });

  const announceToLiveRegion = useCallback((message: string) => {
    setLiveAnnouncement('');
    requestAnimationFrame(() => setLiveAnnouncement(message));
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const validDropTargets = useMemo(
    () => computeValidDropTargets(dragItems, folderStructure),
    [dragItems, folderStructure]
  );

  const isValidDropTarget = useCallback(
    (targetFolderId: number | null) => validDropTargets.has(targetFolderId),
    [validDropTargets]
  );

  const contextValue = useMemo<AssetsDndContextValue>(
    () => ({
      isInternalDragActive: dragItems.length > 0,
      isMovePending,
      isValidDropTarget,
    }),
    [dragItems.length, isMovePending, isValidDropTarget]
  );

  const clearDragState = useCallback(() => {
    dragSessionRef.current = { items: [], fromSelection: false };
    setDragItems([]);
  }, []);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const data = event.active.data.current as DragItemData | undefined;

      if (!data) {
        clearDragState();
        return;
      }

      const { items, fromSelection } = buildDragSet(data, selection?.selectedKeys, currentFolderId);
      dragSessionRef.current = { items, fromSelection };
      setDragItems(items);
    },
    [clearDragState, currentFolderId, selection?.selectedKeys]
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { over } = event;
      const { items, fromSelection } = dragSessionRef.current;
      clearDragState();

      if (isMovePending || !over || items.length === 0) {
        return;
      }

      const destination = resolveDestination(over.id);

      if (!destination) {
        return;
      }

      const { destinationFolderId: targetFolderId } = destination;

      if (
        !canDropItemOnFolder({
          items,
          targetFolderId,
          folderStructure,
        })
      ) {
        return;
      }

      const payload = buildBulkMovePayload(items);
      // Source is always the current folder — dragged items are, by definition,
      // visible in the current view. Destination is the drop target. Both use
      // leaf names so the DnD toast reads identically to the dialog's.
      const successMessage = formatMoveSuccessMessage({
        formatMessage,
        count: items.length,
        source: getFolderLabel(folderStructure, currentFolderId, rootLabel),
        destination: getFolderLabel(folderStructure, targetFolderId, rootLabel),
      });
      const errorFallback = formatMessage({
        id: getTranslationKey('list.bulk-actions.move.error'),
        defaultMessage: 'An error occurred while moving the items.',
      });

      try {
        await bulkMove({ ...payload, destinationFolderId: targetFolderId }).unwrap();

        if (fromSelection) {
          selection?.clear();
        }

        announceToLiveRegion(successMessage);

        toggleNotification({
          type: 'success',
          message: successMessage,
        });
      } catch (error) {
        const errorMessage = getBulkMoveErrorMessage(error, errorFallback);

        announceToLiveRegion(
          formatMessage(
            {
              id: getTranslationKey('dnd.announce.move-failure'),
              defaultMessage: 'Move failed. {message}',
            },
            { message: errorMessage }
          )
        );

        toggleNotification({
          type: 'danger',
          message: errorMessage,
        });
      }
    },
    [
      announceToLiveRegion,
      bulkMove,
      clearDragState,
      currentFolderId,
      folderStructure,
      formatMessage,
      isMovePending,
      rootLabel,
      selection,
      toggleNotification,
    ]
  );

  const handleDragCancel = useCallback(() => {
    clearDragState();
  }, [clearDragState]);

  const announcements = useMemo(
    () => ({
      onDragStart: ({ active }: DragStartEvent) => {
        const data = active.data.current as DragItemData | undefined;
        return data
          ? formatMessage(
              {
                id: getTranslationKey('dnd.announce.drag-start'),
                defaultMessage: 'Picked up {name}. Drop on a folder to move.',
              },
              { name: data.name }
            )
          : '';
      },
      onDragOver: () => '',
      onDragEnd: ({ active, over }: DragEndEvent) => {
        if (!over) {
          return formatMessage({
            id: getTranslationKey('dnd.announce.cancel'),
            defaultMessage: 'Drag cancelled.',
          });
        }

        const destination = resolveDestination(over.id);
        const activeData = active.data.current as DragItemData | undefined;

        if (!destination || !activeData) {
          return '';
        }

        const { items } = buildDragSet(activeData, selection?.selectedKeys, currentFolderId);

        if (
          !canDropItemOnFolder({
            items,
            targetFolderId: destination.destinationFolderId,
            folderStructure,
          })
        ) {
          return formatMessage({
            id: getTranslationKey('dnd.announce.invalid-drop'),
            defaultMessage: 'Cannot move item to this folder.',
          });
        }

        return '';
      },
      onDragCancel: () =>
        formatMessage({
          id: getTranslationKey('dnd.announce.cancel'),
          defaultMessage: 'Drag cancelled.',
        }),
    }),
    [currentFolderId, folderStructure, formatMessage, selection?.selectedKeys]
  );

  return (
    <AssetsDndContext.Provider value={contextValue}>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        accessibility={{ announcements }}
      >
        <VisuallyHidden aria-live="polite" aria-atomic="true">
          {liveAnnouncement}
        </VisuallyHidden>
        <Box position="relative">{children}</Box>
        <DragOverlay dropAnimation={null}>
          {dragItems.length > 0 ? <DragOverlayChip items={dragItems} /> : null}
        </DragOverlay>
      </DndContext>
    </AssetsDndContext.Provider>
  );
};

// Keyboard-accessible moves are handled by `BulkMoveDialog` (reachable from the
// bulk-actions bar): pointer drag is a mouse-only enhancement, the dialog is the
// a11y path. No `KeyboardSensor` by design.
