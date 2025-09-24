import * as React from 'react';
import { Box } from '@strapi/design-system';
import { styled } from 'styled-components';

import { useInterWidgetResize } from '../hooks/useInterWidgetResize';

import type { WidgetWithUID } from '../core/apis/Widgets';

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

/* -------------------------------------------------------------------------------------------------
 * Inter-Widget Resize Handle
 * -----------------------------------------------------------------------------------------------*/

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

export const InterWidgetResizeHandle = ({
  leftWidgetId,
  rightWidgetId,
  leftWidgetWidth,
  rightWidgetWidth,
  onResize,
  filteredWidgets,
}: InterWidgetResizeHandleProps) => {
  const { isDragging, position, currentResizeValues, rowPosition, handleMouseDown } =
    useInterWidgetResize({
      leftWidgetId,
      rightWidgetId,
      leftWidgetWidth,
      rightWidgetWidth,
      onResize,
      filteredWidgets,
    });

  return (
    <>
      <ResizeHandleContainer
        onMouseDown={handleMouseDown}
        style={{
          left: `${position.left}px`,
          top: `${position.top}px`,
          height: `${position.height}px`,
        }}
      >
        <ResizeHandleBar $isDragging={isDragging} />
      </ResizeHandleContainer>

      <ResizeIndicator
        isVisible={isDragging}
        position={position}
        currentLeftWidth={currentResizeValues.leftWidth}
        currentRightWidth={currentResizeValues.rightWidth}
        rowPosition={rowPosition}
      />
    </>
  );
};

export { ResizeHandleContainer };
