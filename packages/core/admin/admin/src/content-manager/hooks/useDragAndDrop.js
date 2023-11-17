import { useRef } from 'react';

import { useDrag, useDrop } from 'react-dnd';

import { useKeyboardDragAndDrop } from './useKeyboardDragAndDrop';

/**
 * @typedef UseDragAndDropOptions
 *
 * @type {{
 *  type?: string,
 *  index: number | Array<number>,
 *  item?: object,
 *  onStart?: () => void,
 *  onEnd?: () => void,
 *  dropSensitivity?: 'regular' | 'immediate',
 *  canDropHandler?: () => void,
 * } & import('./useKeyboardDragAndDrop').UseKeyboardDragAndDropCallbacks}
 */

/**
 * @typedef UseDragAndDropReturn
 *
 * @type {[props: {handlerId: import('dnd-core').Identifier, isDragging: boolean, handleKeyDown: (event: import('react').KeyboardEvent<HTMLButtonElement>) => void}, objectRef: React.RefObject<HTMLElement>, dropRef: import('react-dnd').ConnectDropTarget, dragRef: import('react-dnd').ConnectDragSource, dragPreviewRef: import('react-dnd').ConnectDragPreview]}
 */

/**
 * A utility hook abstracting the general drag and drop hooks from react-dnd.
 * Centralising the same behaviours and by default offering keyboard support.
 *
 * @type {(active: boolean, options: UseDragAndDropOptions) => UseDragAndDropReturn}
 */
export const useDragAndDrop = (
  active,
  {
    type = 'STRAPI_DND',
    index,
    item = {},
    onStart,
    onEnd,
    onGrabItem,
    onDropItem,
    onCancel,
    onMoveItem,
    dropSensitivity = 'regular',
    canDropHandler,
  }
) => {
  const objectRef = useRef(null);

  const [{ handlerId, canDrop }, dropRef] = useDrop({
    accept: type,
    canDrop: canDropHandler, // to skip some items from droppable target
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
        canDrop: monitor.canDrop(),
      };
    },
    hover(item, monitor) {
      if (!objectRef.current) {
        return;
      }

      // Don't move item if not allowed to drop at new index
      if (!canDrop) {
        return;
      }
      const dragIndex = item.index;
      const newIndex = index;

      if (typeof index === 'number') {
        if (dragIndex === newIndex) {
          // Don't replace items with themselves
          return;
        }

        if (dropSensitivity === 'regular') {
          const hoverBoundingRect = objectRef.current.getBoundingClientRect();
          const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
          const clientOffset = monitor.getClientOffset();
          const hoverClientY = clientOffset.y - hoverBoundingRect.top;

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
        // Using numbers as indices don't work for heirarchy of nodes
        // For moving blocks, index would be a path as Array<number>
        if (dropSensitivity === 'regular') {
          const hoverBoundingRect = objectRef.current.getBoundingClientRect();
          const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
          const clientOffset = monitor.getClientOffset();
          const hoverClientY = clientOffset.y - hoverBoundingRect.top;

          // Indices comparison to find elments position in a heirarchy of nodes
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
          // Dragging downwards
          if (isLessThan && !isGreaterThan && hoverClientY < hoverMiddleY) {
            return;
          }

          // Dragging upwards
          if (isGreaterThan && !isLessThan && hoverClientY > hoverMiddleY) {
            return;
          }
        }
        onMoveItem(newIndex, dragIndex);
        item.index = newIndex;
      }
    },
  });

  const [{ isDragging }, dragRef, dragPreviewRef] = useDrag({
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
     * This is for useful when the item is in a virtualized list.
     * However, if we don't have an ID then we want the libraries
     * defaults to take care of this.
     */
    isDragging: item.id
      ? (monitor) => {
          return item.id === monitor.getItem().id;
        }
      : undefined,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const handleKeyDown = useKeyboardDragAndDrop(active, index, {
    onGrabItem,
    onDropItem,
    onCancel,
    onMoveItem,
  });

  return [{ handlerId, isDragging, handleKeyDown }, objectRef, dropRef, dragRef, dragPreviewRef];
};
