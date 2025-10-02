import * as React from 'react';

import { Box } from '@strapi/design-system';
import { useDrop } from 'react-dnd';
import { styled } from 'styled-components';

import { calculateWidgetRows, type WidgetRow } from '../utils/widgetUtils';

import type { WidgetWithUID } from '../core/apis/Widgets';

interface GapDropZonePosition {
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
  isDraggingWidget: boolean;
  draggedWidgetId?: string;
  moveWidget: (id: string, to: number, targetRowIndex?: number, isHorizontalDrop?: boolean) => void;
}

const getRowInfo = (row: WidgetRow) => {
  const firstWidgetElement = document.querySelector(`[data-widget-id="${row.widgets[0].uid}"]`);
  const lastWidgetElement = document.querySelector(
    `[data-widget-id="${row.widgets[row.widgets.length - 1].uid}"]`
  );
  const containerElement = document.querySelector('[data-grid-container]');

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

const createVerticalDropZone = (
  insertIndex: number,
  left: number,
  top: number,
  height: number,
  width: number = 20,
  targetRowIndex?: number
): GapDropZonePosition => ({
  insertIndex,
  position: { left, top, height, width },
  isVisible: true, // Will be controlled by parent
  type: 'vertical',
  targetRowIndex,
});

const createHorizontalDropZone = (
  insertIndex: number,
  left: number,
  top: number,
  height: number,
  width: number
): GapDropZonePosition => ({
  insertIndex,
  position: { left, top, height, width },
  isVisible: true, // Will be controlled by parent
  type: 'horizontal',
  isHorizontalDrop: true,
});

const addVerticalDropZonesForSingleWidget = (
  gapDropZones: GapDropZonePosition[],
  row: WidgetRow,
  rowInfo: ReturnType<typeof getRowInfo>,
  rowIndex: number
) => {
  if (!rowInfo) return;

  const { firstRect, containerRect, rowTop, rowHeight } = rowInfo;
  const widgetLeft = firstRect.left - containerRect.left;

  // Before the first widget
  gapDropZones.push(
    createVerticalDropZone(row.startIndex, widgetLeft - 20, rowTop, rowHeight, 20, rowIndex)
  );

  // At the end of the row
  gapDropZones.push(
    createVerticalDropZone(
      row.endIndex + 1,
      widgetLeft + firstRect.width,
      rowTop,
      rowHeight,
      20,
      rowIndex
    )
  );
};

const addVerticalDropZonesForTwoWidgets = (
  gapDropZones: GapDropZonePosition[],
  row: WidgetRow,
  rowInfo: ReturnType<typeof getRowInfo>,
  rowIndex: number
) => {
  if (!rowInfo) return;

  const { firstRect, lastRect, containerRect, rowTop, rowHeight } = rowInfo;
  const firstWidgetLeft = firstRect.left - containerRect.left;
  const secondWidgetLeft = lastRect.left - containerRect.left;

  // Before the first widget
  gapDropZones.push(
    createVerticalDropZone(row.startIndex, firstWidgetLeft - 20, rowTop, rowHeight, 20, rowIndex)
  );

  // Between the two widgets
  gapDropZones.push(
    createVerticalDropZone(row.startIndex + 1, firstRect.width, rowTop, rowHeight, 20, rowIndex)
  );

  // At the end of the row
  gapDropZones.push(
    createVerticalDropZone(
      row.endIndex + 1,
      secondWidgetLeft + lastRect.width,
      rowTop,
      rowHeight,
      20,
      rowIndex
    )
  );
};

const addVerticalDropZonesForThreeWidgets = (
  gapDropZones: GapDropZonePosition[],
  row: WidgetRow,
  rowInfo: ReturnType<typeof getRowInfo>,
  rowIndex: number
) => {
  if (!rowInfo) return;

  const { firstRect, lastRect, containerRect, rowTop, rowHeight } = rowInfo;
  const secondWidgetElement = document.querySelector(`[data-widget-id="${row.widgets[1].uid}"]`);

  if (!secondWidgetElement) return;

  const secondWidgetRect = secondWidgetElement.getBoundingClientRect();
  const firstWidgetLeft = firstRect.left - containerRect.left;
  const secondWidgetLeft = secondWidgetRect.left - containerRect.left;
  const thirdWidgetLeft = lastRect.left - containerRect.left;

  // Before the first widget
  gapDropZones.push(
    createVerticalDropZone(row.startIndex, firstWidgetLeft - 20, rowTop, rowHeight, 20, rowIndex)
  );

  // Between the first and second widgets
  gapDropZones.push(
    createVerticalDropZone(
      row.startIndex + 1,
      firstWidgetLeft + firstRect.width,
      rowTop,
      rowHeight,
      20,
      rowIndex
    )
  );

  // Between the second and third widgets
  gapDropZones.push(
    createVerticalDropZone(
      row.startIndex + 2,
      secondWidgetLeft + secondWidgetRect.width,
      rowTop,
      rowHeight,
      20,
      rowIndex
    )
  );

  // At the end of the row
  gapDropZones.push(
    createVerticalDropZone(
      row.endIndex + 1,
      thirdWidgetLeft + lastRect.width,
      rowTop,
      rowHeight,
      20,
      rowIndex
    )
  );
};

const addHorizontalDropZones = (
  gapDropZones: GapDropZonePosition[],
  row: WidgetRow,
  rowIndex: number,
  rowInfo: ReturnType<typeof getRowInfo>,
  widgetRows: WidgetRow[],
  filteredWidgets: WidgetWithUID[]
) => {
  if (!rowInfo) return;

  // Don't show horizontal drop zones if there's only one row with one widget
  if (widgetRows.length === 1 && row.widgets.length === 1) return;

  const { containerRect } = rowInfo;
  const containerWidth = containerRect.width;
  const horizontalDropZoneHeight = 20;

  // Add horizontal drop zone above the first row
  if (rowIndex === 0) {
    const firstRowRect = rowInfo.firstRect;
    const firstRowTop = firstRowRect.top - containerRect.top;

    gapDropZones.push(
      createHorizontalDropZone(
        0,
        0,
        firstRowTop - horizontalDropZoneHeight,
        horizontalDropZoneHeight,
        containerWidth
      )
    );
  }

  // Add horizontal drop zone below the current row (between rows or after last row)
  if (rowIndex < widgetRows.length - 1) {
    // Between rows: position above the next row
    const nextRow = widgetRows[rowIndex + 1];
    const nextRowFirstWidgetElement = document.querySelector(
      `[data-widget-id="${nextRow.widgets[0].uid}"]`
    );

    if (nextRowFirstWidgetElement) {
      const nextRowRect = nextRowFirstWidgetElement.getBoundingClientRect();
      const nextRowTop = nextRowRect.top - containerRect.top;

      gapDropZones.push(
        createHorizontalDropZone(
          row.endIndex + 1,
          0,
          nextRowTop - horizontalDropZoneHeight,
          horizontalDropZoneHeight,
          containerWidth
        )
      );
    }
  } else {
    // After the last row: position below the current row
    const lastRowRect = rowInfo.lastRect;
    const lastRowBottom = lastRowRect.bottom - containerRect.top;

    gapDropZones.push(
      createHorizontalDropZone(
        filteredWidgets.length,
        0,
        lastRowBottom,
        horizontalDropZoneHeight,
        containerWidth
      )
    );
  }
};

export const GapDropZoneManager = ({
  filteredWidgets,
  columnWidths,
  isDraggingWidget,
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
        (isDraggingFromThisRow || (isDraggingFromAnotherRow && canAcceptMoreWidgets)) &&
        isDraggingWidget;

      // Add vertical drop zones based on widget count
      if (shouldShowVerticalDropZones) {
        if (widgetCount === 1) {
          addVerticalDropZonesForSingleWidget(gapDropZones, row, rowInfo, rowIndex);
        } else if (widgetCount === 2) {
          addVerticalDropZonesForTwoWidgets(gapDropZones, row, rowInfo, rowIndex);
        } else if (widgetCount === 3) {
          addVerticalDropZonesForThreeWidgets(gapDropZones, row, rowInfo, rowIndex);
        }
      }

      // Add horizontal drop zones
      addHorizontalDropZones(gapDropZones, row, rowIndex, rowInfo, widgetRows, filteredWidgets);
    });

    return gapDropZones;
  }, [widgetRows, isDraggingWidget, draggedWidgetId, filteredWidgets]);

  React.useEffect(() => {
    const updatePositions = () => {
      const newPositions = calculateGapDropZonePositions();
      setPositions(newPositions);
    };

    updatePositions();

    // Update positions on window resize
    const handleResize = () => {
      // Debounce the resize handler
      setTimeout(updatePositions, 100);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [calculateGapDropZonePositions]);

  // Set up resize observer for position updates
  React.useEffect(() => {
    const updatePositions = () => {
      const newPositions = calculateGapDropZonePositions();
      setPositions(newPositions);
    };

    // Update positions when widgets change size
    const resizeObserver = new ResizeObserver(() => {
      setTimeout(updatePositions, 50); // Small delay to ensure DOM is updated
    });

    // Observe all widget elements
    filteredWidgets.forEach((widget) => {
      const element = document.querySelector(`[data-widget-id="${widget.uid}"]`);
      if (element) {
        resizeObserver.observe(element);
      }
    });

    return () => {
      resizeObserver.disconnect();
    };
  }, [filteredWidgets, calculateGapDropZonePositions]);

  return (
    <>
      {positions.map((gapDropZone, index) => (
        <GapDropZone
          key={`gap-drop-zone-${index}`}
          insertIndex={gapDropZone.insertIndex}
          position={gapDropZone.position}
          isVisible={gapDropZone.isVisible && isDraggingWidget}
          type={gapDropZone.type}
          moveWidget={moveWidget}
          targetRowIndex={gapDropZone.targetRowIndex}
        />
      ))}
    </>
  );
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
  background-color: ${({ $isOver }) => ($isOver ? 'rgba(0, 123, 255, 0.2)' : 'transparent')};
  border: ${({ $isOver, theme }) =>
    $isOver ? `2px solid ${theme.colors.primary500}` : '2px solid transparent'};
  opacity: ${({ $isOver }) => ($isOver ? 1 : 0.6)};
  transition: all 0.2s ease-in-out;
  cursor: pointer;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 0;
  bottom: 0;
  width: 20px;
  z-index: 10;
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
        left: `${position.left}px`,
        top: `${position.top}px`,
        height: `${position.height}px`,
        width: `${position.width}px`,
      }}
    />
  );
};
