import * as React from 'react';

export type UseKeyboardDragAndDropCallbacks<TIndex extends number | Array<number> = number> = {
  onCancel?: (index: TIndex) => void;
  onDropItem?: (currentIndex: TIndex, newIndex?: TIndex) => void;
  onGrabItem?: (index: TIndex) => void;
  onMoveItem?: (newIndex: TIndex, currentIndex: TIndex) => void;
};

/**
 * Utility hook designed to implement keyboard accessibile drag and drop by
 * returning an onKeyDown handler to be passed to the drag icon button.
 *
 * @internal - You should use `useDragAndDrop` instead.
 */
export const useKeyboardDragAndDrop = <TIndex extends number | Array<number> = number>(
  active: boolean,
  index: TIndex,
  { onCancel, onDropItem, onGrabItem, onMoveItem }: UseKeyboardDragAndDropCallbacks<TIndex>
) => {
  const [isSelected, setIsSelected] = React.useState(false);

  const handleMove = (movement: 'UP' | 'DOWN') => {
    if (!isSelected) {
      return;
    }
    if (typeof index === 'number' && onMoveItem) {
      if (movement === 'UP') {
        onMoveItem((index - 1) as TIndex, index);
      } else if (movement === 'DOWN') {
        onMoveItem((index + 1) as TIndex, index);
      }
    }
  };

  const handleDragClick = () => {
    if (isSelected) {
      if (onDropItem) {
        onDropItem(index);
      }
      setIsSelected(false);
    } else {
      if (onGrabItem) {
        onGrabItem(index);
      }
      setIsSelected(true);
    }
  };

  const handleCancel = () => {
    if (isSelected) {
      setIsSelected(false);

      if (onCancel) {
        onCancel(index);
      }
    }
  };

  const handleKeyDown = <E extends Element>(e: React.KeyboardEvent<E>) => {
    if (!active) {
      return;
    }

    if (e.key === 'Tab' && !isSelected) {
      return;
    }

    e.preventDefault();

    switch (e.key) {
      case ' ':
      case 'Enter':
        handleDragClick();
        break;

      case 'Escape':
        handleCancel();
        break;

      case 'ArrowDown':
      case 'ArrowRight':
        handleMove('DOWN');
        break;

      case 'ArrowUp':
      case 'ArrowLeft':
        handleMove('UP');
        break;

      default:
    }
  };

  return handleKeyDown;
};
