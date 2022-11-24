import { useState } from 'react';

/**
 * @typedef UseKeyboardDragAndDropCallbacks
 *
 * @type {{
 *  onCancel?: (index: number) => void,
 *  onDropItem?: (index: number) => void,
 *  onGrabItem?: (index: number) => void,
 *  onMoveItem: (newIndex: number, currentIndex: number) => void,
 * }}
 */

/**
 * Utility hook designed to implement keyboard accessibile drag and drop by
 * returning an onKeyDown handler to be passed to the drag icon button.
 *
 * @type {(index: number, callbacks: UseKeyboardDragAndDropCallbacks) => (event: React.KeyboardEvent<HTMLButtonElement>) => void}
 */
export const useKeyboardDragAndDrop = (index, { onCancel, onDropItem, onGrabItem, onMoveItem }) => {
  const [isSelected, setIsSelected] = useState(false);
  /**
   * @type {(movement: 'UP' | 'DOWN') => void})}
   */
  const handleMove = (movement) => {
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
    setIsSelected(false);

    if (onCancel) {
      onCancel(index);
    }
  };

  /**
   * @type {React.KeyboardEventHandler<HTMLButtonElement>}
   */
  const handleKeyDown = (e) => {
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
