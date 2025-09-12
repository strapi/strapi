import { useCallback, useEffect, useState } from 'react';

import { useDebounce } from './useDebounce';

interface UseWidgetResizeOptions {
  columnWidth: number;
  onWidthChange: (newWidth: number) => void;
  minWidth?: number;
  maxWidth?: number;
  debounceMs?: number; // Debounce delay in milliseconds
}

interface UseDragResizeOptions {
  threshold?: number;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}

// Valid column widths for discrete snapping (1/3, 1/2, 2/3, 3/3)
const DISCRETE_COLUMN_WIDTHS = [4, 6, 8, 12] as const;

// Helper function to snap to the nearest discrete column width
const snapToDiscreteWidth = (width: number): number => {
  return DISCRETE_COLUMN_WIDTHS.reduce((prev, curr) =>
    Math.abs(curr - width) < Math.abs(prev - width) ? curr : prev
  );
};

const calculateNewWidth = (
  startWidth: number,
  deltaX: number,
  threshold: number,
  minWidth: number,
  maxWidth: number
): number => {
  const rawWidth = startWidth + Math.round(deltaX / threshold);
  const clampedWidth = Math.max(minWidth, Math.min(maxWidth, rawWidth));
  return snapToDiscreteWidth(clampedWidth);
};

const isValidWidth = (width: number, minWidth: number, maxWidth: number): boolean => {
  return width >= minWidth && width <= maxWidth;
};

/**
 * Core hook for handling widget resizing with discrete column snapping
 * Provides the base resize functionality that can be used by different resize methods
 */
export const useWidgetResize = ({
  columnWidth,
  onWidthChange,
  minWidth = 4,
  maxWidth = 12,
  debounceMs = 50,
}: UseWidgetResizeOptions) => {
  const [dragWidth, setDragWidth] = useState<number>(columnWidth);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const debouncedDragWidth = useDebounce(dragWidth, debounceMs);

  // Apply debounced width changes for drag operations only
  useEffect(() => {
    const shouldUpdate =
      isDragging &&
      debouncedDragWidth !== columnWidth &&
      isValidWidth(debouncedDragWidth, minWidth, maxWidth);

    if (shouldUpdate) {
      onWidthChange(debouncedDragWidth);
    }
  }, [debouncedDragWidth, columnWidth, onWidthChange, minWidth, maxWidth, isDragging]);

  // Programmatic resize (instant, no debouncing)
  const resizeTo = useCallback(
    (newWidth: number) => {
      if (isValidWidth(newWidth, minWidth, maxWidth)) {
        setDragWidth(newWidth);
        onWidthChange(newWidth);
      }
    },
    [minWidth, maxWidth, onWidthChange]
  );

  // Update width during drag operations
  const updateWidth = useCallback(
    (newWidth: number) => {
      if (isValidWidth(newWidth, minWidth, maxWidth)) {
        setDragWidth(newWidth);
      }
    },
    [minWidth, maxWidth]
  );

  // Drag state management
  const startDrag = useCallback(() => setIsDragging(true), []);
  const endDrag = useCallback(() => setIsDragging(false), []);

  return {
    resizeTo,
    updateWidth,
    startDrag,
    endDrag,
  };
};

/**
 * Hook for handling drag-to-resize functionality
 * Extends the base resize hook with drag-specific behavior
 */
export const useDragResize = ({
  columnWidth,
  onWidthChange,
  minWidth = 4,
  maxWidth = 12,
  threshold = 100,
  debounceMs = 50,
  onDragStart,
  onDragEnd,
}: UseWidgetResizeOptions & UseDragResizeOptions) => {
  const { updateWidth, resizeTo, startDrag, endDrag } = useWidgetResize({
    columnWidth,
    onWidthChange,
    minWidth,
    maxWidth,
    debounceMs,
  });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();

      const startX = e.clientX;
      const startWidth = columnWidth;

      // Initialize drag operation
      startDrag();
      onDragStart?.();

      // Create mouse event handlers
      const handleMouseMove = (moveEvent: MouseEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const newWidth = calculateNewWidth(startWidth, deltaX, threshold, minWidth, maxWidth);

        if (isValidWidth(newWidth, minWidth, maxWidth)) {
          updateWidth(newWidth);
        }
      };

      const handleMouseUp = (upEvent: MouseEvent) => {
        const finalDeltaX = upEvent.clientX - startX;
        const finalWidth = calculateNewWidth(
          startWidth,
          finalDeltaX,
          threshold,
          minWidth,
          maxWidth
        );

        if (isValidWidth(finalWidth, minWidth, maxWidth)) {
          updateWidth(finalWidth);
          onWidthChange(finalWidth);
        }

        // Cleanup
        endDrag();
        onDragEnd?.();
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [
      columnWidth,
      onWidthChange,
      minWidth,
      maxWidth,
      threshold,
      updateWidth,
      startDrag,
      endDrag,
      onDragStart,
      onDragEnd,
    ]
  );

  return { handleMouseDown, resizeTo };
};
