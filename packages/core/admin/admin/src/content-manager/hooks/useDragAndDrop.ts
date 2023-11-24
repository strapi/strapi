import * as React from 'react';

import {
  ConnectDragPreview,
  ConnectDragSource,
  ConnectDropTarget,
  useDrag,
  useDrop,
} from 'react-dnd';

import { useKeyboardDragAndDrop, UseKeyboardDragAndDropCallbacks } from './useKeyboardDragAndDrop';

import type { Entity } from '@strapi/types';
import type { Identifier } from 'dnd-core';

export interface UseDragAndDropOptions<TItem extends { index: Entity.ID } = { index: Entity.ID }>
  extends UseKeyboardDragAndDropCallbacks {
  type?: string;
  index: number;
  item?: TItem;
  onStart?: () => void;
  onEnd?: () => void;
  dropSensitivity?: 'regular' | 'immediate';
}

export type UseDragAndDropReturn = [
  props: {
    handlerId: Identifier | null;
    isDragging: boolean;
    handleKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
  },
  objectRef: React.RefObject<HTMLElement>,
  dragRef: ConnectDropTarget,
  dropRef: ConnectDragSource,
  dragPreviewRef: ConnectDragPreview
];

/**
 * A utility hook abstracting the general drag and drop hooks from react-dnd.
 * Centralising the same behaviours and by default offering keyboard support.
 */
export const useDragAndDrop = <TItem extends { index: number; id?: Entity.ID; [key: string]: any }>(
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
    dropSensitivity = 'regular',
  }: UseDragAndDropOptions<TItem>
): UseDragAndDropReturn => {
  const objectRef = React.useRef<HTMLElement>(null);

  const [{ handlerId }, dropRef] = useDrop<TItem, unknown, { handlerId: Identifier | null }>({
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
        // we're hovering, so we're dragging, therefore it will not be null(?)
        const clientOffset = monitor.getClientOffset()!;
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
    isDragging: item?.id
      ? (monitor) => {
          return item?.id === monitor.getItem().id;
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
