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
 *  dropSensitivity?: 'regular' | 'immediate'
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
      const newInd = index;

      // Don't replace items with themselves
      if (dragIndex === newInd) {
        return;
      }

      if (dropSensitivity === 'regular') {
        const hoverBoundingRect = objectRef.current.getBoundingClientRect();
        const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
        const clientOffset = monitor.getClientOffset();
        const hoverClientY = clientOffset.y - hoverBoundingRect.top;

        // Dragging downwards
        if (dragIndex < newInd && hoverClientY < hoverMiddleY) {
          return;
        }

        // Dragging upwards
        if (dragIndex > newInd && hoverClientY > hoverMiddleY) {
          return;
        }
      }

      // Time to actually perform the action
      onMoveItem(newInd, dragIndex);
      item.index = newInd;
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
