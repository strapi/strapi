import { useMemo, type ReactNode } from 'react';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragCancelEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useIntl } from 'react-intl';

import {
  AssetSortableContext,
  type AssetSortable,
} from '../../pages/Assets/components/Dnd/assetSortable';
import { getTranslationKey } from '../../utils/translations';

import { usePickerSelection } from './PickerSelectionProvider';

/** Module scope, so every item of the list gets the same hook (see `AssetSortableContext`). */
const usePickerSortableAsset = (assetId: number): AssetSortable => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: assetId });

  return {
    setNodeRef,
    isDragging,
    style: { transform: CSS.Transform.toString(transform), transition },
    // The item drags with the pointer from anywhere; the keyboard starts from the grip.
    listeners: listeners?.onPointerDown ? { onPointerDown: listeners.onPointerDown } : undefined,
    handle: {
      ...attributes,
      ref: setActivatorNodeRef,
      onKeyDown: (event) => listeners?.onKeyDown?.(event),
    },
  };
};

/**
 * A pointer release over the item it was dragging would also count as a click,
 * which on a selected item un-picks it. Swallow that one click.
 */
const swallowNextClick = () => {
  const swallow = (event: MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
  };

  window.addEventListener('click', swallow, { capture: true, once: true });
  // No click follows a keyboard drop: don't leave the listener behind.
  setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
};

interface SortableSelectionProps {
  children: ReactNode;
  /**
   * Called with `true` when a drag starts and `false` when it ends or is
   * cancelled, so the dialog can keep Escape for cancelling the drag.
   */
  onReorderingChange?: (reordering: boolean) => void;
}

/** Makes the picker's selected assets reorderable (the Selected tab is always a grid). */
export const SortableSelection = ({ children, onReorderingChange }: SortableSelectionProps) => {
  const { formatMessage } = useIntl();
  const { selection, moveFile } = usePickerSelection();

  const sensors = useSensors(
    // A few pixels of travel before it counts as a drag, so clicks still pick.
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const ids = useMemo(() => selection.map(({ id }) => id), [selection]);

  const announcements = useMemo<Announcements>(() => {
    const describe = (id: string | number) => {
      const index = ids.indexOf(Number(id));

      return {
        name: selection[index]?.name ?? '',
        position: index + 1,
        count: ids.length,
      };
    };

    return {
      onDragStart: ({ active }) =>
        formatMessage(
          {
            id: getTranslationKey('list.reorder.picked-up'),
            defaultMessage: 'Picked up {name}. Position {position} of {count}.',
          },
          describe(active.id)
        ),
      onDragOver: ({ active, over }) =>
        over
          ? formatMessage(
              {
                id: getTranslationKey('list.reorder.moved'),
                defaultMessage: '{name} moved to position {position} of {count}.',
              },
              { ...describe(active.id), position: describe(over.id).position }
            )
          : undefined,
      onDragEnd: ({ active, over }) =>
        formatMessage(
          {
            id: getTranslationKey('list.reorder.dropped'),
            defaultMessage: '{name} dropped at position {position} of {count}.',
          },
          { ...describe(active.id), position: describe((over ?? active).id).position }
        ),
      onDragCancel: ({ active }) =>
        formatMessage(
          {
            id: getTranslationKey('list.reorder.cancelled'),
            defaultMessage:
              'Reordering cancelled. {name} is back at position {position} of {count}.',
          },
          describe(active.id)
        ),
    };
  }, [formatMessage, ids, selection]);

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (active.data.current?.sortable && over) {
      moveFile(Number(active.id), Number(over.id));
    }

    onReorderingChange?.(false);
    swallowNextClick();
  };

  // Escape cancels a pointer drag while the button is still down, so the click
  // that would un-pick the item comes with the release, possibly much later.
  const handleDragCancel = ({ activatorEvent }: DragCancelEvent) => {
    onReorderingChange?.(false);

    if (activatorEvent.type === 'pointerdown') {
      window.addEventListener('pointerup', swallowNextClick, { capture: true, once: true });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={() => onReorderingChange?.(true)}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      accessibility={{ announcements }}
    >
      <SortableContext items={ids} strategy={rectSortingStrategy}>
        <AssetSortableContext.Provider value={usePickerSortableAsset}>
          {children}
        </AssetSortableContext.Provider>
      </SortableContext>
    </DndContext>
  );
};
