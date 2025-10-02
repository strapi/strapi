import * as React from 'react';

import { Box } from '@strapi/design-system';
import { styled } from 'styled-components';

import { snapToDiscreteSize, isValidResize, adjustToTotalColumns } from '../utils/widgetUtils';

import type { WidgetWithUID } from '../core/apis/Widgets';

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
  z-index: 20;
  pointer-events: none;
  opacity: ${({ $isVisible }) => ($isVisible ? 1 : 0)};
  transition: opacity 0.2s ease-in-out;
  background: transparent;
  height: 20px;
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
  if (leftColumns === 4) return -gapAdjustmentPercent; // Left dot
  if (leftColumns === 6) return 0; // Center dot
  if (leftColumns === 8) return gapAdjustmentPercent; // Right dot

  return 0;
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
    ? rowPosition.top - 20
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
  width: 20px;
  z-index: 10;
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

export interface InterWidgetResizeHandleProps {
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

const calculatePosition = (leftWidgetId: string, rightWidgetId: string) => {
  const leftElement = document.querySelector(`[data-widget-id="${leftWidgetId}"]`);
  const rightElement = document.querySelector(`[data-widget-id="${rightWidgetId}"]`);

  if (leftElement && rightElement) {
    const leftRect = leftElement.getBoundingClientRect();
    const rightRect = rightElement.getBoundingClientRect();
    const containerRect = leftElement.closest('[data-grid-container]')?.getBoundingClientRect();

    if (containerRect) {
      const left = leftRect.right - containerRect.left;
      const top = leftRect.top - containerRect.top;
      const height = Math.max(leftRect.height, rightRect.height);

      return { left, top, height };
    }
  }
  return { left: 0, top: 0, height: 0 };
};

const calculateRowPosition = (leftWidgetId: string, rightWidgetId: string) => {
  const leftElement = document.querySelector(`[data-widget-id="${leftWidgetId}"]`);
  const rightElement = document.querySelector(`[data-widget-id="${rightWidgetId}"]`);
  const containerRect = leftElement?.closest('[data-grid-container]')?.getBoundingClientRect();

  if (leftElement && rightElement && containerRect) {
    const leftRect = leftElement.getBoundingClientRect();
    const rightRect = rightElement.getBoundingClientRect();

    // Calculate the row bounds
    const rowLeft = Math.min(leftRect.left, rightRect.left) - containerRect.left;
    const rowTop = leftRect.top - containerRect.top;
    const rowWidth =
      Math.max(leftRect.right, rightRect.right) - Math.min(leftRect.left, rightRect.left);
    const rowHeight = Math.max(leftRect.height, rightRect.height);

    return { left: rowLeft, top: rowTop, width: rowWidth, height: rowHeight };
  }
  return null;
};

const calculateTargetWidths = (
  deltaColumns: number,
  startLeftWidth: number,
  startRightWidth: number
) => {
  let targetLeftWidth = startLeftWidth + deltaColumns;
  let targetRightWidth = startRightWidth - deltaColumns;

  targetLeftWidth = snapToDiscreteSize(targetLeftWidth);
  targetRightWidth = snapToDiscreteSize(targetRightWidth);

  // Adjust to maintain 12 columns total
  const adjusted = adjustToTotalColumns(targetLeftWidth, targetRightWidth);
  return { targetLeftWidth: adjusted.leftWidth, targetRightWidth: adjusted.rightWidth };
};

const shouldTriggerResize = (
  leftWidth: number,
  rightWidth: number,
  lastResizeValues: { leftWidth: number; rightWidth: number }
): boolean => {
  return leftWidth !== lastResizeValues.leftWidth || rightWidth !== lastResizeValues.rightWidth;
};

export const InterWidgetResizeHandle = ({
  leftWidgetId,
  rightWidgetId,
  leftWidgetWidth,
  rightWidgetWidth,
  onResize,
  filteredWidgets,
}: InterWidgetResizeHandleProps) => {
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

  // Handle resize logic
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
  }, [leftWidgetWidth, rightWidgetWidth]);

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
      position: calculatePosition(leftWidgetId, rightWidgetId),
      rowPosition: calculateRowPosition(leftWidgetId, rightWidgetId),
    }));

    // Recalculate on window resize
    const handleResize = () =>
      setState((prev) => ({
        ...prev,
        position: calculatePosition(leftWidgetId, rightWidgetId),
        rowPosition: calculateRowPosition(leftWidgetId, rightWidgetId),
      }));
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, [leftWidgetId, rightWidgetId, leftWidgetWidth, rightWidgetWidth, filteredWidgets]);

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
        position: calculatePosition(leftWidgetId, rightWidgetId),
        rowPosition: calculateRowPosition(leftWidgetId, rightWidgetId),
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
        onMouseDown={handleMouseDown}
        style={{
          left: `${state.position.left}px`,
          top: `${state.position.top}px`,
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
