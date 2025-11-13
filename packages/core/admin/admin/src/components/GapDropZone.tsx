import * as React from 'react';

import { Box } from '@strapi/design-system';
// TODO: use @dnd-kit/core instead
import { useDrop } from 'react-dnd';
import { styled } from 'styled-components';

import {
  calculateWidgetRows,
  type WidgetRow,
  getWidgetElement,
  getWidgetGridContainer,
} from '../utils/widgetLayout';

import type { WidgetWithUID } from '../core/apis/Widgets';

export const DROP_ZONE_SIZE = 20;

export interface GapDropZonePosition {
  insertIndex: number;
  position: { left: number; top: number; height: number; width: number };
  isVisible: boolean;
  type: 'vertical' | 'horizontal';
  isHorizontalDrop?: boolean;
  targetRowIndex?: number;
}

interface GapDropZoneManagerProps {
  filteredWidgets: WidgetWithUID[];
  columnWidths: Record<string, number>;
  draggedWidgetId?: string;
  moveWidget: (id: string, to: number, targetRowIndex?: number, isHorizontalDrop?: boolean) => void;
}

const getRowInfo = (row: WidgetRow) => {
  const firstWidgetElement = getWidgetElement(row.widgets[0].uid);
  const lastWidgetElement = getWidgetElement(row.widgets[row.widgets.length - 1].uid);
  const containerElement = getWidgetGridContainer();

  if (!firstWidgetElement || !lastWidgetElement || !containerElement) {
    return null;
  }

  const firstRect = firstWidgetElement.getBoundingClientRect();
  const lastRect = lastWidgetElement.getBoundingClientRect();
  const containerRect = containerElement.getBoundingClientRect();

  return {
    firstWidgetElement,
    lastWidgetElement,
    containerElement,
    firstRect,
    lastRect,
    containerRect,
    rowHeight: Math.max(firstRect.height, lastRect.height),
    rowTop: firstRect.top - containerRect.top,
  };
};

export const addVerticalDropZones = (
  row: WidgetRow,
  rowInfo: ReturnType<typeof getRowInfo>,
  rowIndex: number
): GapDropZonePosition[] => {
  if (!rowInfo) return [];

  const { containerRect, rowTop, rowHeight } = rowInfo;
  const widgetCount = row.widgets.length;

  // Get widget positions relative to container
  const widgetPositions = row.widgets
    .map((widget) => {
      const element = getWidgetElement(widget.uid);
      if (!element) return null;

      const rect = element.getBoundingClientRect();
      return {
        left: rect.left - containerRect.left,
        width: rect.width,
      };
    })
    .filter((pos): pos is NonNullable<typeof pos> => pos !== null);

  if (widgetPositions.length !== widgetCount) return [];

  const gapDropZones: GapDropZonePosition[] = [];

  // Always add drop zone before the first widget
  gapDropZones.push({
    insertIndex: row.startIndex,
    position: {
      left: widgetPositions[0].left - DROP_ZONE_SIZE,
      top: rowTop,
      height: rowHeight,
      width: DROP_ZONE_SIZE,
    },
    isVisible: true,
    type: 'vertical',
    targetRowIndex: rowIndex,
  });

  // Add drop zones between widgets
  widgetPositions.slice(0, -1).forEach((currentWidget, i) => {
    gapDropZones.push({
      insertIndex: row.startIndex + i + 1,
      position: {
        left: currentWidget.left + currentWidget.width,
        top: rowTop,
        height: rowHeight,
        width: DROP_ZONE_SIZE,
      },
      isVisible: true,
      type: 'vertical',
      targetRowIndex: rowIndex,
    });
  });

  // Always add drop zone after the last widget
  const lastWidget = widgetPositions[widgetCount - 1];
  gapDropZones.push({
    insertIndex: row.endIndex + 1,
    position: {
      left: lastWidget.left + lastWidget.width,
      top: rowTop,
      height: rowHeight,
      width: DROP_ZONE_SIZE,
    },
    isVisible: true,
    type: 'vertical',
    targetRowIndex: rowIndex,
  });

  return gapDropZones;
};

export const addHorizontalDropZones = (
  row: WidgetRow,
  rowIndex: number,
  rowInfo: ReturnType<typeof getRowInfo>,
  widgetRows: WidgetRow[],
  filteredWidgets: WidgetWithUID[]
): GapDropZonePosition[] => {
  if (!rowInfo) return [];

  // Don't show horizontal drop zones if there's only one row with one widget
  if (widgetRows.length === 1 && row.widgets.length === 1) return [];

  const { containerRect } = rowInfo;
  const containerWidth = containerRect.width;
  const horizontalDropZoneHeight = DROP_ZONE_SIZE;

  const gapDropZones: GapDropZonePosition[] = [];

  // Add horizontal drop zone above the first row
  if (rowIndex === 0) {
    const firstRowRect = rowInfo.firstRect;
    const firstRowTop = firstRowRect.top - containerRect.top;

    gapDropZones.push({
      insertIndex: 0,
      position: {
        left: 0,
        top: firstRowTop - horizontalDropZoneHeight,
        height: horizontalDropZoneHeight,
        width: containerWidth,
      },
      isVisible: true,
      type: 'horizontal',
      isHorizontalDrop: true,
    });
  }

  // Add horizontal drop zone below the current row (between rows or after last row)
  if (rowIndex < widgetRows.length - 1) {
    // Between rows: position above the next row
    const nextRow = widgetRows[rowIndex + 1];
    const nextRowFirstWidgetElement = getWidgetElement(nextRow.widgets[0].uid);

    if (nextRowFirstWidgetElement) {
      const nextRowRect = nextRowFirstWidgetElement.getBoundingClientRect();
      const nextRowTop = nextRowRect.top - containerRect.top;

      gapDropZones.push({
        insertIndex: row.endIndex + 1,
        position: {
          left: 0,
          top: nextRowTop - horizontalDropZoneHeight,
          height: horizontalDropZoneHeight,
          width: containerWidth,
        },
        isVisible: true,
        type: 'horizontal',
        isHorizontalDrop: true,
      });
    }
  } else {
    // After the last row: position below the current row
    const lastRowRect = rowInfo.lastRect;
    const lastRowBottom = lastRowRect.bottom - containerRect.top;

    gapDropZones.push({
      insertIndex: filteredWidgets.length,
      position: {
        left: 0,
        top: lastRowBottom,
        height: horizontalDropZoneHeight,
        width: containerWidth,
      },
      isVisible: true,
      type: 'horizontal',
      isHorizontalDrop: true,
    });
  }

  return gapDropZones;
};

export const GapDropZoneManager = ({
  filteredWidgets,
  columnWidths,
  draggedWidgetId,
  moveWidget,
}: GapDropZoneManagerProps) => {
  const [positions, setPositions] = React.useState<GapDropZonePosition[]>([]);

  // Calculate widget rows
  const widgetRows = React.useMemo(() => {
    return calculateWidgetRows(filteredWidgets, columnWidths);
  }, [filteredWidgets, columnWidths]);

  // Main function to calculate GapDropZone positions
  const calculateGapDropZonePositions = React.useCallback(() => {
    const gapDropZones: GapDropZonePosition[] = [];

    // Find which row the dragged widget is from
    const draggedWidgetRow = draggedWidgetId
      ? widgetRows.find((row) => row.widgets.some((widget) => widget.uid === draggedWidgetId))
      : null;

    widgetRows.forEach((row, rowIndex) => {
      const rowInfo = getRowInfo(row);
      if (!rowInfo) return;

      const widgetCount = row.widgets.length;

      // Determine if we should show vertical drop zones for this row
      const isDraggingFromThisRow = draggedWidgetRow && draggedWidgetRow === row;
      const isDraggingFromAnotherRow = draggedWidgetRow && draggedWidgetRow !== row;
      const canAcceptMoreWidgets = widgetCount < 3;

      const shouldShowVerticalDropZones =
        isDraggingFromThisRow || (isDraggingFromAnotherRow && canAcceptMoreWidgets);

      // Add vertical drop zones based on widget count
      if (shouldShowVerticalDropZones) {
        const verticalDropZones = addVerticalDropZones(row, rowInfo, rowIndex);
        gapDropZones.push(...verticalDropZones);
      }

      // Add horizontal drop zones
      const horizontalDropZones = addHorizontalDropZones(
        row,
        rowIndex,
        rowInfo,
        widgetRows,
        filteredWidgets
      );
      gapDropZones.push(...horizontalDropZones);
    });

    return gapDropZones;
  }, [widgetRows, draggedWidgetId, filteredWidgets]);

  React.useLayoutEffect(() => {
    const updatePositions = () => {
      const newPositions = calculateGapDropZonePositions();
      setPositions(newPositions);
    };

    updatePositions();

    // Update positions on container resize using ResizeObserver
    const containerElement = getWidgetGridContainer();
    if (!containerElement) return;

    const resizeObserver = new ResizeObserver(() => {
      updatePositions();
    });

    resizeObserver.observe(containerElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, [calculateGapDropZonePositions]);

  return positions.map((gapDropZone) => (
    <GapDropZone
      key={`gap-drop-zone-${gapDropZone.type}-${gapDropZone.insertIndex}-${gapDropZone.targetRowIndex ?? 'no-row'}`}
      insertIndex={gapDropZone.insertIndex}
      position={gapDropZone.position}
      isVisible={gapDropZone.isVisible}
      type={gapDropZone.type}
      moveWidget={moveWidget}
      targetRowIndex={gapDropZone.targetRowIndex}
    />
  ));
};

interface GapDropZoneProps {
  insertIndex: number;
  position: { left: number; top: number; height: number; width: number };
  isVisible: boolean;
  type: 'vertical' | 'horizontal';
  moveWidget: (id: string, to: number, targetRowIndex?: number, isHorizontalDrop?: boolean) => void;
  targetRowIndex?: number;
}

const GapDropZoneContainer = styled(Box)<{
  $isOver: boolean;
}>`
  background-color: ${({ $isOver, theme }) =>
    $isOver ? `${theme.colors.primary100}` : 'transparent'};
  border: ${({ $isOver, theme }) =>
    $isOver ? `2px solid ${theme.colors.primary500}` : '2px solid transparent'};
  opacity: ${({ $isOver }) => ($isOver ? 1 : 0.6)};
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.borderRadius};
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 0;
  bottom: 0;
  width: ${DROP_ZONE_SIZE}px;
  z-index: 1;
`;

const GapDropZone = ({
  insertIndex,
  position,
  isVisible,
  type,
  moveWidget,
  targetRowIndex,
}: GapDropZoneProps) => {
  const isHorizontalDrop = type === 'horizontal';

  const [{ isOver }, drop] = useDrop(
    () => ({
      accept: 'widget',
      drop: (item: { id: string }) => {
        moveWidget(item.id, insertIndex, targetRowIndex, isHorizontalDrop);
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    }),
    [insertIndex, isHorizontalDrop, moveWidget, targetRowIndex]
  );

  if (!isVisible) {
    return null;
  }

  return (
    <GapDropZoneContainer
      ref={drop}
      $isOver={isOver}
      style={{
        transform: `translate(${position.left}px, ${position.top}px)`,
        height: `${position.height}px`,
        width: `${position.width}px`,
      }}
    />
  );
};
