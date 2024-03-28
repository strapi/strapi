import type { KeyboardEvent } from 'react';

import { act, renderHook } from '@testing-library/react';

import { useKeyboardDragAndDrop } from '../useKeyboardDragAndDrop';

describe('useKeyboardDragAndDrop', () => {
  const event = (key: string) =>
    ({
      preventDefault: jest.fn(),
      key,
    }) as unknown as KeyboardEvent<HTMLButtonElement>;

  describe('onGrabItem', () => {
    it('should be called when the event is the enter key', () => {
      const onGrabItem = jest.fn();
      const { result } = renderHook(() =>
        useKeyboardDragAndDrop(true, 0, { onGrabItem, onMoveItem: jest.fn() })
      );

      act(() => {
        result.current(event('Enter'));
      });

      expect(onGrabItem).toHaveBeenCalledWith(0);
    });

    it('should be called when the event is the space key', () => {
      const onGrabItem = jest.fn();
      const { result } = renderHook(() =>
        useKeyboardDragAndDrop(true, 0, { onGrabItem, onMoveItem: jest.fn() })
      );

      act(() => {
        result.current(event(' '));
      });

      expect(onGrabItem).toHaveBeenCalledWith(0);
    });
  });

  describe('onDropItem', () => {
    it('should be called after the enter key is pressed twice', () => {
      const onDropItem = jest.fn();
      const { result } = renderHook(() =>
        useKeyboardDragAndDrop(true, 0, { onDropItem, onMoveItem: jest.fn() })
      );

      act(() => {
        result.current(event('Enter'));
      });

      act(() => {
        result.current(event('Enter'));
      });

      expect(onDropItem).toHaveBeenCalledWith(0);
    });

    it('should be called after the space key is pressed twice', () => {
      const onDropItem = jest.fn();
      const { result } = renderHook(() =>
        useKeyboardDragAndDrop(true, 0, { onDropItem, onMoveItem: jest.fn() })
      );

      act(() => {
        result.current(event(' '));
      });

      act(() => {
        result.current(event(' '));
      });

      expect(onDropItem).toHaveBeenCalledWith(0);
    });
  });

  describe('onCancel', () => {
    it('should be called when the escape key is pressed provided that the enter or space key has been pressed first', () => {
      const onCancel = jest.fn();
      const { result } = renderHook(() =>
        useKeyboardDragAndDrop(true, 0, { onCancel, onMoveItem: jest.fn() })
      );

      act(() => {
        result.current(event('Enter'));
      });

      act(() => {
        result.current(event('Escape'));
      });

      expect(onCancel).toHaveBeenCalledWith(0);

      act(() => {
        result.current(event(' '));
      });

      act(() => {
        result.current(event('Escape'));
      });

      expect(onCancel).toHaveBeenCalledTimes(2);
    });

    it('should not be called if neither the space nor enter key have been pressed first', () => {
      const onCancel = jest.fn();
      const { result } = renderHook(() =>
        useKeyboardDragAndDrop(true, 0, { onCancel, onMoveItem: jest.fn() })
      );

      act(() => {
        result.current(event('Escape'));
      });

      expect(onCancel).not.toHaveBeenCalled();
    });
  });

  describe('onMoveItem', () => {
    it('should be called when the down arrow is pressed provided the enter key has been pressed first', () => {
      const onMoveItem = jest.fn();
      const { result } = renderHook(() => useKeyboardDragAndDrop(true, 0, { onMoveItem }));

      act(() => {
        result.current(event('Enter'));
      });

      act(() => {
        result.current(event('ArrowDown'));
      });

      expect(onMoveItem).toHaveBeenCalledWith(1, 0);
    });

    it('should be called when the right arrow is pressed provided the enter key has been pressed first', () => {
      const onMoveItem = jest.fn();
      const { result } = renderHook(() => useKeyboardDragAndDrop(true, 0, { onMoveItem }));

      act(() => {
        result.current(event('Enter'));
      });

      act(() => {
        result.current(event('ArrowRight'));
      });

      expect(onMoveItem).toHaveBeenCalledWith(1, 0);
    });

    it('should not be called with either the down arrow or right arrow if the enter key has not been pressed prior', () => {
      const onMoveItem = jest.fn();
      const { result } = renderHook(() => useKeyboardDragAndDrop(true, 0, { onMoveItem }));

      act(() => {
        result.current(event('ArrowDown'));
      });

      act(() => {
        result.current(event('ArrowRight'));
      });

      expect(onMoveItem).not.toHaveBeenCalled();
    });

    it('should be called when the up arrow is pressed provided the enter key has been pressed first', () => {
      const onMoveItem = jest.fn();
      const { result } = renderHook(() => useKeyboardDragAndDrop(true, 1, { onMoveItem }));

      act(() => {
        result.current(event('Enter'));
      });

      act(() => {
        result.current(event('ArrowUp'));
      });

      expect(onMoveItem).toHaveBeenCalledWith(0, 1);
    });

    it('should be called when the left arrow is pressed provided the enter key has been pressed first', () => {
      const onMoveItem = jest.fn();
      const { result } = renderHook(() => useKeyboardDragAndDrop(true, 1, { onMoveItem }));

      act(() => {
        result.current(event('Enter'));
      });

      act(() => {
        result.current(event('ArrowLeft'));
      });

      expect(onMoveItem).toHaveBeenCalledWith(0, 1);
    });

    it('should not be called with either the left or up arrow key if the enter key has not been pressed first', () => {
      const onMoveItem = jest.fn();
      const { result } = renderHook(() => useKeyboardDragAndDrop(true, 1, { onMoveItem }));

      act(() => {
        result.current(event('ArrowUp'));
      });

      act(() => {
        result.current(event('ArrowLeft'));
      });

      expect(onMoveItem).not.toHaveBeenCalled();
    });
  });
});
