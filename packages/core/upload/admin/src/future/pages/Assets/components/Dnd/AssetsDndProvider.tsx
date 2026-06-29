import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

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
import { getBulkMoveErrorMessage } from '../../../../utils/getBulkMoveErrorMessage';
import { getTranslationKey } from '../../../../utils/translations';

import { parseFolderTargetId } from './dndIds';
import { DragOverlayChip } from './DragOverlayChip';

import type { DragItemData } from '../../../../types/dnd';

/* -------------------------------------------------------------------------------------------------
 * Context — shared with UploadDropZoneProvider for bidirectional drag guard.
 * See UploadDropZoneContext.tsx TODO linking both providers.
 * -----------------------------------------------------------------------------------------------*/

interface AssetsDndContextValue {
  isInternalDragActive: boolean;
  isMovePending: boolean;
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

const getDragItems = (activeData: DragItemData | undefined): DragItemData[] => {
  if (!activeData) {
    return [];
  }

  // TODO(CMS-433): include selectedItems from active data for multi-drag payload members.
  return [activeData];
};

export const AssetsDndProvider = ({ children }: AssetsDndProviderProps) => {
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
  const { data: folderStructure = [] } = useGetFolderStructureQuery();
  const [bulkMove, { isLoading: isMovePending }] = useBulkMoveMutation();
  const [activeItem, setActiveItem] = useState<DragItemData | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  const announceToLiveRegion = useCallback((message: string) => {
    setLiveAnnouncement('');
    requestAnimationFrame(() => setLiveAnnouncement(message));
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const contextValue = useMemo<AssetsDndContextValue>(
    () => ({
      isInternalDragActive: activeItem !== null,
      isMovePending,
    }),
    [activeItem, isMovePending]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as DragItemData | undefined;
    setActiveItem(data ?? null);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveItem(null);

      if (isMovePending || !over) {
        return;
      }

      const targetFolderId = parseFolderTargetId(over.id);
      const activeData = active.data.current as DragItemData | undefined;

      if (targetFolderId == null || !activeData) {
        return;
      }

      const items = getDragItems(activeData);

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
      const successMessage = formatMessage({
        id: getTranslationKey('modal.move.success-label'),
        defaultMessage: 'Elements have been moved successfully.',
      });
      const errorFallback = formatMessage({
        id: getTranslationKey('modal.move.error-label'),
        defaultMessage: 'An error occurred while moving the elements.',
      });

      try {
        await bulkMove({ ...payload, destinationFolderId: targetFolderId }).unwrap();

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
      folderStructure,
      formatMessage,
      isMovePending,
      toggleNotification,
    ]
  );

  const handleDragCancel = useCallback(() => {
    setActiveItem(null);
  }, []);

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

        const targetFolderId = parseFolderTargetId(over.id);
        const activeData = active.data.current as DragItemData | undefined;

        if (targetFolderId == null || !activeData) {
          return '';
        }

        const items = getDragItems(activeData);

        if (
          !canDropItemOnFolder({
            items,
            targetFolderId,
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
    [folderStructure, formatMessage]
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
          {activeItem ? <DragOverlayChip item={activeItem} /> : null}
        </DragOverlay>
      </DndContext>
    </AssetsDndContext.Provider>
  );
};

// TODO(CMS-229): FolderTree droppables + keyboard move path.
