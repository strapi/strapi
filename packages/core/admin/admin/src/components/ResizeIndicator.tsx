import * as React from 'react';

import { Box } from '@strapi/design-system';
import { styled } from 'styled-components';

import {
  isValidResize,
  calculateTargetWidths,
  shouldTriggerResize,
  calculateResizeHandlePosition,
  calculateRowBounds,
} from '../utils/resizeHandlers';
import { getWidgetElement, getWidgetGridContainer } from '../utils/widgetLayout';

import type { WidgetWithUID } from '../core/apis/Widgets';

const INDICATOR_SIZE = 20;

interface ResizeIndicatorProps {
  isVisible: boolean;
  position: { left: number; top: number; height: number };
  currentLeftWidth: number;
  currentRightWidth: number;
  totalColumns?: number;
  rowPosition?: { left: number; top: number; width: number; height: number } | null;
}

const IndicatorContainer = styled(Box)<{ $isVisible: boolean }>`
  position: absolute;
  z-index: 1;
  pointer-events: none;
  opacity: ${({ $isVisible }) => ($isVisible ? 1 : 0)};
  transition: opacity 0.2s ease-in-out;
  background: transparent;
  height: ${INDICATOR_SIZE}px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const DotContainer = styled(Box)<{ $position: number }>`
  position: absolute;
  top: 50%;
  left: ${({ $position }) => $position}%;
  transform: translate(-50%, -50%);
`;

const Dot = styled(Box)<{ $isActive: boolean; $isCurrent: boolean }>`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: ${({ $isActive, $isCurrent, theme }) => {
    if ($isCurrent) return theme.colors.primary600;
    if ($isActive) return theme.colors.primary500;
    return theme.colors.neutral300;
  }};
  transition: all 0.2s ease-in-out;
  box-shadow: ${({ $isCurrent, theme }) =>
    $isCurrent ? `0 0 0 3px ${theme.colors.primary100}` : 'none'};
  transform: ${({ $isCurrent }) => ($isCurrent ? 'scale(1.2)' : 'scale(1)')};
`;

const calculateGapAdjustment = (rowWidth: number, leftColumns: number): number => {
  const dotWidth = 6;
  const gapAdjustmentPixels = dotWidth / 2; // Half dot width to center on boundary
  const gapAdjustmentPercent = (gapAdjustmentPixels / rowWidth) * 100;

  // Different adjustments for different positions
  switch (leftColumns) {
    case 4:
      return -gapAdjustmentPercent; // Left dot
    case 8:
      return gapAdjustmentPercent; // Right dot
    default: // Center dot
      return 0;
  }
};

const ResizeIndicator = ({
  isVisible,
  position,
  currentLeftWidth,
  currentRightWidth,
  totalColumns = 12,
  rowPosition,
}: ResizeIndicatorProps) => {
  // Calculate available resize positions accounting for grid gaps
  const availablePositions = React.useMemo(() => {
    const rowWidth = rowPosition?.width || 800;

    return [4, 6, 8].map((left) => {
      const right = totalColumns - left;
      const basePosition = (left / totalColumns) * 100;
      const gapAdjustment = calculateGapAdjustment(rowWidth, left);
      const positionPercent = basePosition + gapAdjustment;

      return { left, right, positionPercent };
    });
  }, [totalColumns, rowPosition?.width]);

  // Find the current position index
  const currentPositionIndex = React.useMemo(() => {
    return availablePositions.findIndex(
      (pos) => pos.left === currentLeftWidth && pos.right === currentRightWidth
    );
  }, [availablePositions, currentLeftWidth, currentRightWidth]);

  if (!isVisible) {
    return null;
  }

  // Calculate positioning - indicator always spans the full row width
  const indicatorTop = rowPosition
    ? rowPosition.top - INDICATOR_SIZE
    : Math.max(10, position.top + position.height / 2 - 40);
  const isCurrent = (index: number) => index === currentPositionIndex;
  const isActive = (index: number) => Math.abs(index - currentPositionIndex) <= 1;

  return (
    <IndicatorContainer
      $isVisible={isVisible}
      style={{
        left: rowPosition ? `${rowPosition.left}px` : `${position.left + 10}px`,
        top: `${indicatorTop}px`,
        width: rowPosition ? `${rowPosition.width}px` : 'auto',
      }}
    >
      {availablePositions.map((pos, index) => {
        return (
          <DotContainer key={`${pos.left}-${pos.right}`} $position={pos.positionPercent}>
            <Dot $isActive={isActive(index)} $isCurrent={isCurrent(index)} />
          </DotContainer>
        );
      })}
    </IndicatorContainer>
  );
};
const ResizeHandleContainer = styled(Box)<{ $isDragging?: boolean }>`
  position: absolute;
  top: 0;
  bottom: 0;
  width: ${INDICATOR_SIZE}px;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.8;
  transition: opacity 0.2s ease-in-out;
  cursor: col-resize;
  background-color: ${({ $isDragging }) => ($isDragging ? 'rgba(0, 0, 0, 0.1)' : 'transparent')};
`;

const ResizeHandleBar = styled(Box)<{ $isDragging?: boolean }>`
  width: 2px;
  height: 100%;
  background-color: ${({ theme }) => theme.colors.primary500};
  border-radius: 1px;
  opacity: 0;
  transition: opacity 0.2s ease-in-out;

  ${ResizeHandleContainer}:hover & {
    opacity: 0.8;
  }

  ${({ $isDragging }) => $isDragging && `opacity: 0.8;`}
`;

interface WidgetResizeHandleProps {
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
  saveLayout: () => void;
  filteredWidgets?: WidgetWithUID[];
}

export const WidgetResizeHandle = ({
  leftWidgetId,
  rightWidgetId,
  leftWidgetWidth,
  rightWidgetWidth,
  onResize,
  saveLayout,
}: WidgetResizeHandleProps) => {
  const [state, setState] = React.useState({
    isDragging: false,
    startX: 0,
    startLeftWidth: 0,
    startRightWidth: 0,
    position: { left: 0, top: 0, height: 0 },
    lastResizeValues: { leftWidth: 0, rightWidth: 0 },
    currentResizeValues: { leftWidth: leftWidgetWidth, rightWidth: rightWidgetWidth },
    rowPosition: null as { left: number; top: number; width: number; height: number } | null,
  });

  const throttleRef = React.useRef<NodeJS.Timeout | null>(null);

  const handleResize = React.useCallback(
    (deltaColumns: number) => {
      // Only resize if there's significant movement (dead zone)
      if (Math.abs(deltaColumns) < 0.25) {
        return;
      }

      // Calculate target widths
      const { targetLeftWidth, targetRightWidth } = calculateTargetWidths(
        deltaColumns,
        state.startLeftWidth,
        state.startRightWidth
      );

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
      if (shouldTriggerResize(targetLeftWidth, targetRightWidth, state.lastResizeValues)) {
        setState((prev) => ({
          ...prev,
          lastResizeValues: { leftWidth: targetLeftWidth, rightWidth: targetRightWidth },
        }));
        onResize(leftWidgetId, rightWidgetId, targetLeftWidth, targetRightWidth);
      }
    },
    [
      leftWidgetId,
      rightWidgetId,
      onResize,
      state.startLeftWidth,
      state.startRightWidth,
      state.lastResizeValues,
    ]
  );

  const handlePointerMove = React.useCallback(
    (e: PointerEvent) => {
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
      }, 0);
    },
    [state.isDragging, state.startX, handleResize]
  );

  // Handle pointer up to end drag
  const handlePointerUp = React.useCallback(() => {
    // Clear any pending throttle timeout
    if (throttleRef.current) {
      clearTimeout(throttleRef.current);
      throttleRef.current = null;
    }

    // Save the layout
    saveLayout();

    // Reset last resize values and stop dragging
    setState((prev) => ({
      ...prev,
      lastResizeValues: { leftWidth: 0, rightWidth: 0 },
      currentResizeValues: { leftWidth: leftWidgetWidth, rightWidth: rightWidgetWidth },
      isDragging: false,
    }));
  }, [leftWidgetWidth, rightWidgetWidth, saveLayout]);

  // Handle pointer down to start drag
  const handlePointerDown = React.useCallback(
    (e: React.PointerEvent) => {
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

  // Set up drag event listeners
  React.useEffect(() => {
    if (state.isDragging) {
      document.addEventListener('pointermove', handlePointerMove);
      document.addEventListener('pointerup', handlePointerUp);

      return () => {
        document.removeEventListener('pointermove', handlePointerMove);
        document.removeEventListener('pointerup', handlePointerUp);
      };
    }
  }, [state.isDragging, handlePointerMove, handlePointerUp]);

  // Set up resize observer for position updates - watching widgets and grid container
  React.useLayoutEffect(() => {
    const leftElement = getWidgetElement(leftWidgetId);
    const rightElement = getWidgetElement(rightWidgetId);
    const containerElement = getWidgetGridContainer();

    const updatePosition = () => {
      const position = calculateResizeHandlePosition(leftElement, rightElement, containerElement);
      const rowPosition = calculateRowBounds(leftElement, rightElement, containerElement);

      setState((prev) => ({
        ...prev,
        position,
        rowPosition,
      }));
    };

    // Create ResizeObserver to watch widgets and grid container
    const resizeObserver = new ResizeObserver(updatePosition);

    // Observe all relevant elements
    if (leftElement) resizeObserver.observe(leftElement);
    if (rightElement) resizeObserver.observe(rightElement);
    if (containerElement) resizeObserver.observe(containerElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [leftWidgetId, rightWidgetId]);

  // Cleanup throttle timeout on unmount
  React.useEffect(() => {
    return () => {
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
    };
  }, []);

  return (
    <>
      <ResizeHandleContainer
        onPointerDown={handlePointerDown}
        style={{
          transform: `translate(${state.position.left}px, ${state.position.top}px)`,
          height: `${state.position.height}px`,
        }}
      >
        <ResizeHandleBar $isDragging={state.isDragging} />
      </ResizeHandleContainer>

      <ResizeIndicator
        isVisible={state.isDragging}
        position={state.position}
        currentLeftWidth={state.currentResizeValues.leftWidth}
        currentRightWidth={state.currentResizeValues.rightWidth}
        rowPosition={state.rowPosition}
      />
    </>
  );
};
