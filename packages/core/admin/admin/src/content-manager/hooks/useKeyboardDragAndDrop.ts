import * as React from 'react';

export interface UseKeyboardDragAndDropCallbacks {
  onCancel?: (index: number) => void;
  onDropItem?: (index: number) => void;
  onGrabItem?: (index: number) => void;
  onMoveItem: (toIndex: number, fromIndex: number) => void;
}

/**
 * Utility hook designed to implement keyboard accessibile drag and drop by
 * returning an onKeyDown handler to be passed to the drag icon button.
 *
 * @internal - You should use `useDragAndDrop` instead.
 */
export const useKeyboardDragAndDrop = (
  active: boolean,
  index: number,
  { onCancel, onDropItem, onGrabItem, onMoveItem }: UseKeyboardDragAndDropCallbacks
) => {
  const [isSelected, setIsSelected] = React.useState(false);

  const handleMove = (movement: 'UP' | 'DOWN') => {
    if (!isSelected) {
      return;
    }

    if (movement === 'UP') {
      onMoveItem(index - 1, index);
    } else if (movement === 'DOWN') {
      onMoveItem(index + 1, index);
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

  const handleKeyDown: React.KeyboardEventHandler<HTMLButtonElement> = (e) => {
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
