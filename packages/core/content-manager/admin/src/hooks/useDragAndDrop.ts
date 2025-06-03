import * as React from 'react';

import {
  useDrag,
  useDrop,
  type HandlerManager,
  type ConnectDragSource,
  type ConnectDropTarget,
  type ConnectDragPreview,
  type DragSourceMonitor,
} from 'react-dnd';

import {
  useKeyboardDragAndDrop,
  type UseKeyboardDragAndDropCallbacks,
} from './useKeyboardDragAndDrop';

import type { Data } from '@strapi/types';

const DIRECTIONS = {
  UPWARD: 'upward',
  DOWNWARD: 'downward',
} as const;

const DROP_SENSITIVITY = {
  REGULAR: 'regular',
  IMMEDIATE: 'immediate',
} as const;

interface UseDragAndDropOptions<
  TIndex extends number | Array<number> = number,
  TItem extends { index: TIndex } = { index: TIndex },
> extends UseKeyboardDragAndDropCallbacks<TIndex> {
  type?: string;
  index: TIndex;
  item?: TItem;
  onStart?: () => void;
  onEnd?: () => void;
  dropSensitivity?: (typeof DROP_SENSITIVITY)[keyof typeof DROP_SENSITIVITY];
}

type Identifier = ReturnType<HandlerManager['getHandlerId']>;

type UseDragAndDropReturn<E extends Element = HTMLElement> = [
  props: {
    handlerId: Identifier;
    isDragging: boolean;
    handleKeyDown: <E extends Element>(event: React.KeyboardEvent<E>) => void;
    isOverDropTarget: boolean;
    direction: (typeof DIRECTIONS)[keyof typeof DIRECTIONS] | null;
  },
  objectRef: React.RefObject<E>,
  dropRef: ConnectDropTarget,
  dragRef: ConnectDragSource,
  dragPreviewRef: ConnectDragPreview,
];

type DropCollectedProps = {
  handlerId: Identifier;
  isOver: boolean;
};

/**
 * A utility hook abstracting the general drag and drop hooks from react-dnd.
 * Centralising the same behaviours and by default offering keyboard support.
 */
const useDragAndDrop = <
  TIndex extends number | Array<number>,
  TItem extends { index: TIndex; id?: Data.ID; [key: string]: unknown } = {
    index: TIndex;
    [key: string]: unknown;
  },
  E extends Element = HTMLElement,
>(
  active: boolean,
  {
    type = 'STRAPI_DND',
    index,
    item,
    onStart,
    onEnd,
    onGrabItem,
    onDropItem,
    onCancel,
    onMoveItem,
    dropSensitivity = DROP_SENSITIVITY.REGULAR,
  }: UseDragAndDropOptions<TIndex, TItem>
): UseDragAndDropReturn<E> => {
  const objectRef = React.useRef<E>(null);

  const [{ handlerId, isOver }, dropRef] = useDrop<TItem, void, DropCollectedProps>({
    accept: type,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
        isOver: monitor.isOver({ shallow: true }),
      };
    },
    drop(item) {
      const draggedIndex = item.index;
      const newIndex = index;

      if (isOver && onDropItem) {
        onDropItem(draggedIndex, newIndex);
      }
    },
    hover(item, monitor) {
      if (!objectRef.current || !onMoveItem) {
        return;
      }

      const dragIndex = item.index;
      const newIndex = index;

      const hoverBoundingRect = objectRef.current?.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      if (!clientOffset) return;

      const hoverClientY = clientOffset && clientOffset.y - hoverBoundingRect.top;
      if (typeof dragIndex === 'number' && typeof newIndex === 'number') {
        if (dragIndex === newIndex) {
          // Don't replace items with themselves
          return;
        }

        if (dropSensitivity === DROP_SENSITIVITY.REGULAR) {
          // Dragging downwards
          if (dragIndex < newIndex && hoverClientY < hoverMiddleY) {
            return;
          }

          // Dragging upwards
          if (dragIndex > newIndex && hoverClientY > hoverMiddleY) {
            return;
          }
        }

        // Time to actually perform the action
        onMoveItem(newIndex, dragIndex);
        item.index = newIndex;
      } else {
        // Using numbers as indices doesn't work for nested list items with path like [1, 1, 0]
        if (Array.isArray(dragIndex) && Array.isArray(newIndex)) {
          // Indices comparison to find item position in nested list
          const minLength = Math.min(dragIndex.length, newIndex.length);
          let areEqual = true;
          let isLessThan = false;
          let isGreaterThan = false;

          for (let i = 0; i < minLength; i++) {
            if (dragIndex[i] < newIndex[i]) {
              isLessThan = true;
              areEqual = false;
              break;
            } else if (dragIndex[i] > newIndex[i]) {
              isGreaterThan = true;
              areEqual = false;
              break;
            }
          }

          // Don't replace items with themselves
          if (areEqual && dragIndex.length === newIndex.length) {
            return;
          }

          if (dropSensitivity === DROP_SENSITIVITY.REGULAR) {
            // Dragging downwards
            if (isLessThan && !isGreaterThan && hoverClientY < hoverMiddleY) {
              return;
            }

            // Dragging upwards
            if (isGreaterThan && !isLessThan && hoverClientY > hoverMiddleY) {
              return;
            }
          }
        }

        onMoveItem(newIndex, dragIndex);
        item.index = newIndex;
      }
    },
  });

  const getDragDirection = (monitor: DragSourceMonitor<TItem, void>) => {
    if (
      monitor &&
      monitor.isDragging() &&
      !monitor.didDrop() &&
      monitor.getInitialClientOffset() &&
      monitor.getClientOffset()
    ) {
      const deltaY = monitor.getInitialClientOffset()!.y - monitor.getClientOffset()!.y;

      if (deltaY > 0) return DIRECTIONS.UPWARD;

      if (deltaY < 0) return DIRECTIONS.DOWNWARD;

      return null;
    }

    return null;
  };

  const [{ isDragging, direction }, dragRef, dragPreviewRef] = useDrag({
    type,
    item() {
      if (onStart) {
        onStart();
      }

      /**
       * This will be attached and it helps define the preview sizes
       * when a component is flexy e.g. Relations
       */
      const { width } = objectRef.current?.getBoundingClientRect() ?? {};

      return { index, width, ...item };
    },
    end() {
      if (onEnd) {
        onEnd();
      }
    },
    canDrag: active,
    /**
     * This is useful when the item is in a virtualized list.
     * However, if we don't have an ID then we want the libraries
     * defaults to take care of this.
     */
    isDragging: item?.id
      ? (monitor) => {
          return item.id === monitor.getItem().id;
        }
      : undefined,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
      initialOffset: monitor.getInitialClientOffset(),
      currentOffset: monitor.getClientOffset(),
      direction: getDragDirection(monitor),
    }),
  });

  const handleKeyDown = useKeyboardDragAndDrop(active, index, {
    onGrabItem,
    onDropItem,
    onCancel,
    onMoveItem,
  });

  return [
    { handlerId, isDragging, handleKeyDown, isOverDropTarget: isOver, direction },
    objectRef,
    dropRef,
    dragRef,
    dragPreviewRef,
  ];
};

export {
  useDragAndDrop,
  UseDragAndDropReturn,
  UseDragAndDropOptions,
  DIRECTIONS,
  DROP_SENSITIVITY,
};
