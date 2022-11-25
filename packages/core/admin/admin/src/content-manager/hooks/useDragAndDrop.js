import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';

import { useKeyboardDragAndDrop } from './useKeyboardDragAndDrop';

/**
 * @typedef UseDragAndDropOptions
 *
 * @type {{
 *  type?: string,
 *  index: number,
 *  item?: object,
 *  onStart?: () => void,
 *  onEnd?: () => void,
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
  }
) => {
  const objectRef = useRef(null);

  const [{ handlerId }, dropRef] = useDrop({
    accept: type,
    collect(monitor) {
      return {
        handlerId: monitor.getHandlerId(),
      };
    },
    hover(item, monitor) {
      if (!objectRef.current) {
        return;
      }
      const dragIndex = item.index;
      const currentIndex = index;

      // Don't replace items with themselves
      if (dragIndex === currentIndex) {
        return;
      }

      const hoverBoundingRect = objectRef.current.getBoundingClientRect();
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      const clientOffset = monitor.getClientOffset();
      const hoverClientY = clientOffset.y - hoverBoundingRect.top;

      // Dragging downwards
      if (dragIndex < currentIndex && hoverClientY < hoverMiddleY) {
        return;
      }

      // Dragging upwards
      if (dragIndex > currentIndex && hoverClientY > hoverMiddleY) {
        return;
      }

      // Time to actually perform the action
      onMoveItem(dragIndex, currentIndex);
      item.index = currentIndex;
    },
  });

  const [{ isDragging }, dragRef, dragPreviewRef] = useDrag({
    type,
    item() {
      if (onStart) {
        onStart();
      }

      return { index, ...item };
    },
    end() {
      if (onEnd) {
        onEnd();
      }
    },
    canDrag: active,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const handleKeyDown = useKeyboardDragAndDrop(index, {
    onGrabItem,
    onDropItem,
    onCancel,
    onMoveItem,
  });

  return [{ handlerId, isDragging, handleKeyDown }, objectRef, dropRef, dragRef, dragPreviewRef];
};
