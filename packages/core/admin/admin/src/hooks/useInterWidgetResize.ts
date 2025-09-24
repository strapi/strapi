/**
 * useInterWidgetResize Hook
 *
 * Custom hook for handling inter-widget resize operations.
 * Manages drag state, position calculations, and resize logic for resizing widgets in the same row.
 */

import * as React from 'react';

import { snapToDiscreteSize, isValidResize, adjustToTotalColumns } from '../utils/widgetUtils';

import type { WidgetWithUID } from '../core/apis/Widgets';

interface UseInterWidgetResizeOptions {
  leftWidgetId: string;
  rightWidgetId: string;
  leftWidgetWidth: number;
  rightWidgetWidth: number;
  onResize: (
    leftWidgetId: string,
    rightWidgetId: string,
    newLeftWidth: number,
    newRightWidth: number
  ) => void;
  filteredWidgets?: WidgetWithUID[];
}

interface ResizeState {
  isDragging: boolean;
  startX: number;
  startLeftWidth: number;
  startRightWidth: number;
  position: { left: number; top: number; height: number };
  lastResizeValues: { leftWidth: number; rightWidth: number };
  currentResizeValues: { leftWidth: number; rightWidth: number };
  rowPosition: { left: number; top: number; width: number; height: number } | null;
}

export const useInterWidgetResize = ({
  leftWidgetId,
  rightWidgetId,
  leftWidgetWidth,
  rightWidgetWidth,
  onResize,
  filteredWidgets,
}: UseInterWidgetResizeOptions) => {
  const [state, setState] = React.useState<ResizeState>({
    isDragging: false,
    startX: 0,
    startLeftWidth: 0,
    startRightWidth: 0,
    position: { left: 0, top: 0, height: 0 },
    lastResizeValues: { leftWidth: 0, rightWidth: 0 },
    currentResizeValues: { leftWidth: leftWidgetWidth, rightWidth: rightWidgetWidth },
    rowPosition: null,
  });

  const throttleRef = React.useRef<NodeJS.Timeout | null>(null);

  // Calculate position of the resize handle
  const calculatePosition = React.useCallback(() => {
    const leftElement = document.querySelector(`[data-widget-id="${leftWidgetId}"]`);
    const rightElement = document.querySelector(`[data-widget-id="${rightWidgetId}"]`);

    if (leftElement && rightElement) {
      const leftRect = leftElement.getBoundingClientRect();
      const rightRect = rightElement.getBoundingClientRect();
      const containerRect = leftElement.closest('[data-grid-container]')?.getBoundingClientRect();

      if (containerRect) {
        // Check if widgets are in the same row (horizontally adjacent)
        const areInSameRow = Math.abs(leftRect.top - rightRect.top) < 10; // 10px tolerance

        if (areInSameRow) {
          // Widgets are in the same row - position between them
          const left = leftRect.right - containerRect.left; // Center between widgets
          const top = leftRect.top - containerRect.top;
          const height = Math.max(leftRect.height, rightRect.height);

          return { left, top, height };
        }
      }
    }
    return { left: 0, top: 0, height: 0 };
  }, [leftWidgetId, rightWidgetId]);

  // Calculate the row position for the indicator
  // Since resize handles are only created when widgets are adjacent and in the same row,
  // we can simplify this calculation significantly
  const calculateRowPosition = React.useCallback(() => {
    const leftElement = document.querySelector(`[data-widget-id="${leftWidgetId}"]`);
    const rightElement = document.querySelector(`[data-widget-id="${rightWidgetId}"]`);
    const containerRect = leftElement?.closest('[data-grid-container]')?.getBoundingClientRect();

    if (leftElement && rightElement && containerRect) {
      const leftRect = leftElement.getBoundingClientRect();
      const rightRect = rightElement.getBoundingClientRect();

      // Calculate the row bounds (widgets are guaranteed to be in the same row)
      const rowLeft = Math.min(leftRect.left, rightRect.left) - containerRect.left;
      const rowTop = leftRect.top - containerRect.top;
      const rowWidth =
        Math.max(leftRect.right, rightRect.right) - Math.min(leftRect.left, rightRect.left);
      const rowHeight = Math.max(leftRect.height, rightRect.height);

      return { left: rowLeft, top: rowTop, width: rowWidth, height: rowHeight };
    }
    return null;
  }, [leftWidgetId, rightWidgetId]);

  // Helper function to check if widgets are in the same row
  // Since resize handles are only created when widgets are adjacent and in the same row,
  // this check is redundant but kept for safety
  // @todo: remove this
  const areWidgetsInSameRow = React.useCallback(() => {
    const leftElement = document.querySelector(`[data-widget-id="${leftWidgetId}"]`);
    const rightElement = document.querySelector(`[data-widget-id="${rightWidgetId}"]`);

    if (!leftElement || !rightElement) return false;

    const leftRect = leftElement.getBoundingClientRect();
    const rightRect = rightElement.getBoundingClientRect();

    return Math.abs(leftRect.top - rightRect.top) < 10; // 10px tolerance
  }, [leftWidgetId, rightWidgetId]);

  // Calculate target widths for resize operation
  const calculateTargetWidths = React.useCallback(
    (deltaColumns: number) => {
      let targetLeftWidth = state.startLeftWidth + deltaColumns;
      let targetRightWidth = state.startRightWidth - deltaColumns;

      // Snap to discrete sizes
      targetLeftWidth = snapToDiscreteSize(targetLeftWidth);
      targetRightWidth = snapToDiscreteSize(targetRightWidth);

      // Adjust to maintain 12 columns total
      const adjusted = adjustToTotalColumns(targetLeftWidth, targetRightWidth);
      return { targetLeftWidth: adjusted.leftWidth, targetRightWidth: adjusted.rightWidth };
    },
    [state.startLeftWidth, state.startRightWidth]
  );

  // Check if resize should be triggered
  const shouldTriggerResize = React.useCallback(
    (leftWidth: number, rightWidth: number): boolean => {
      return (
        leftWidth !== state.lastResizeValues.leftWidth ||
        rightWidth !== state.lastResizeValues.rightWidth
      );
    },
    [state.lastResizeValues]
  );

  // Handle resize logic
  const handleResize = React.useCallback(
    (deltaColumns: number) => {
      // Check if widgets are in the same row
      if (!areWidgetsInSameRow()) {
        return;
      }

      // Only resize if there's significant movement (dead zone)
      if (Math.abs(deltaColumns) < 0.25) {
        return;
      }

      // Calculate target widths
      const { targetLeftWidth, targetRightWidth } = calculateTargetWidths(deltaColumns);

      // Validate the resize
      if (!isValidResize(targetLeftWidth, targetRightWidth)) {
        return;
      }

      // Update current resize values for the indicator
      setState((prev) => ({
        ...prev,
        currentResizeValues: { leftWidth: targetLeftWidth, rightWidth: targetRightWidth },
      }));

      // Only trigger resize if values have changed
      if (shouldTriggerResize(targetLeftWidth, targetRightWidth)) {
        setState((prev) => ({
          ...prev,
          lastResizeValues: { leftWidth: targetLeftWidth, rightWidth: targetRightWidth },
        }));
        onResize(leftWidgetId, rightWidgetId, targetLeftWidth, targetRightWidth);
      }
    },
    [
      areWidgetsInSameRow,
      calculateTargetWidths,
      isValidResize,
      shouldTriggerResize,
      leftWidgetId,
      rightWidgetId,
      onResize,
    ]
  );

  // Handle mouse move during drag
  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (!state.isDragging) return;

      // Clear any existing throttle timeout
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }

      // Throttle the resize calls to prevent excessive updates
      throttleRef.current = setTimeout(() => {
        const deltaX = e.clientX - state.startX;
        const threshold = 120; // Pixels per column unit
        const deltaColumns = Math.round(deltaX / threshold);

        handleResize(deltaColumns);
      }, 2);
    },
    [state.isDragging, state.startX, handleResize]
  );

  // Handle mouse up to end drag
  const handleMouseUp = React.useCallback(() => {
    // Clear any pending throttle timeout
    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
      throttleRef.current = null;
    }

    // Reset last resize values and stop dragging
    setState((prev) => ({
      ...prev,
      lastResizeValues: { leftWidth: 0, rightWidth: 0 },
      currentResizeValues: { leftWidth: leftWidgetWidth, rightWidth: rightWidgetWidth },
      isDragging: false,
    }));
  }, []);

  // Handle mouse down to start drag
  const handleMouseDown = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      setState((prev) => ({
        ...prev,
        isDragging: true,
        startX: e.clientX,
        startLeftWidth: leftWidgetWidth,
        startRightWidth: rightWidgetWidth,
      }));
    },
    [leftWidgetWidth, rightWidgetWidth]
  );

  // Update position when widgets resize
  React.useEffect(() => {
    setState((prev) => ({
      ...prev,
      position: calculatePosition(),
      rowPosition: calculateRowPosition(),
    }));

    // Recalculate on window resize
    const handleResize = () =>
      setState((prev) => ({
        ...prev,
        position: calculatePosition(),
        rowPosition: calculateRowPosition(),
      }));
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [calculatePosition, calculateRowPosition, leftWidgetWidth, rightWidgetWidth, filteredWidgets]);

  // Set up drag event listeners
  React.useEffect(() => {
    if (state.isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [state.isDragging, handleMouseMove, handleMouseUp]);

  // Set up resize observer for position updates
  React.useEffect(() => {
    const updatePosition = () => {
      setState((prev) => ({
        ...prev,
        position: calculatePosition(),
        rowPosition: calculateRowPosition(),
      }));
    };

    // Update position on window resize
    window.addEventListener('resize', updatePosition);

    // Update position when widgets change size
    const resizeObserver = new ResizeObserver(updatePosition);
    const leftElement = document.querySelector(`[data-widget-id="${leftWidgetId}"]`);
    const rightElement = document.querySelector(`[data-widget-id="${rightWidgetId}"]`);

    if (leftElement) resizeObserver.observe(leftElement);
    if (rightElement) resizeObserver.observe(rightElement);

    return () => {
      window.removeEventListener('resize', updatePosition);
      resizeObserver.disconnect();
    };
  }, [leftWidgetId, rightWidgetId, calculatePosition, calculateRowPosition]);

  // Cleanup throttle timeout on unmount
  React.useEffect(() => {
    return () => {
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
    };
  }, []);

  return {
    isDragging: state.isDragging,
    position: state.position,
    currentResizeValues: state.currentResizeValues,
    rowPosition: state.rowPosition,
    handleMouseDown,
  };
};
