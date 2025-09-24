/**
 * useGapDropZonePosition Hook
 *
 * Custom hook for calculating GapDropZone positions based on the grid layout.
 * Determines where GapDropZones should be placed according to the rules:
 * - 1 widget in row: before the first item or at the end of the row
 * - 2 widgets in row: before the first item, between items, or at the end of the row
 * - 3 widgets in row: before the first item, between items, at the end of the row, only if dragging from that row
 * - horizontal drop zones: above each row, below each row
 */

import * as React from 'react';

import { calculateWidgetRows, type WidgetRow } from '../utils/widgetUtils';

import type { WidgetWithUID } from '../core/apis/Widgets';

export interface GapDropZonePosition {
  insertIndex: number;
  position: { left: number; top: number; height: number; width: number };
  isVisible: boolean;
  type: 'vertical' | 'horizontal';
  isHorizontalDrop?: boolean;
  targetRowIndex?: number;
}

interface UseGapDropZonePositionOptions {
  filteredWidgets: WidgetWithUID[];
  columnWidths: Record<string, number>;
  isDraggingWidget: boolean;
  draggedWidgetId?: string;
}

export const useGapDropZonePosition = ({
  filteredWidgets,
  columnWidths,
  isDraggingWidget,
  draggedWidgetId,
}: UseGapDropZonePositionOptions) => {
  const [positions, setPositions] = React.useState<GapDropZonePosition[]>([]);

  // Calculate widget rows
  const widgetRows = React.useMemo(() => {
    return calculateWidgetRows(filteredWidgets, columnWidths);
  }, [filteredWidgets, columnWidths]);

  // Helper function to get DOM elements and calculate basic row info
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

  // Helper function to create a vertical drop zone
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
    isVisible: isDraggingWidget,
    type: 'vertical',
    targetRowIndex,
  });

  // Helper function to create a horizontal drop zone
  const createHorizontalDropZone = (
    insertIndex: number,
    left: number,
    top: number,
    height: number,
    width: number
  ): GapDropZonePosition => ({
    insertIndex,
    position: { left, top, height, width },
    isVisible: isDraggingWidget,
    type: 'horizontal',
    isHorizontalDrop: true,
  });

  // Helper function to add vertical drop zones for a single widget row
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

  // Helper function to add vertical drop zones for a two-widget row
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

  // Helper function to add vertical drop zones for a three-widget row
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

  // Helper function to add horizontal drop zones
  const addHorizontalDropZones = (
    gapDropZones: GapDropZonePosition[],
    row: WidgetRow,
    rowIndex: number,
    rowInfo: ReturnType<typeof getRowInfo>
  ) => {
    if (!rowInfo || widgetRows.length <= 1) return;

    const { containerRect } = rowInfo;
    const containerWidth = containerRect.width;
    const horizontalDropZoneHeight = 20;

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
      const lastRowLastWidgetElement = document.querySelector(
        `[data-widget-id="${row.widgets[row.widgets.length - 1].uid}"]`
      );

      if (lastRowLastWidgetElement) {
        const lastRowRect = lastRowLastWidgetElement.getBoundingClientRect();
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
    }
  };

  // Helper function to add horizontal drop zone above the first row
  const addHorizontalDropZoneAboveFirstRow = (gapDropZones: GapDropZonePosition[]) => {
    if (widgetRows.length <= 1) return;

    const firstRow = widgetRows[0];
    const firstRowFirstWidgetElement = document.querySelector(
      `[data-widget-id="${firstRow.widgets[0].uid}"]`
    );
    const containerElement = document.querySelector('[data-grid-container]');

    if (firstRowFirstWidgetElement && containerElement) {
      const firstRowRect = firstRowFirstWidgetElement.getBoundingClientRect();
      const containerRect = containerElement.getBoundingClientRect();
      const firstRowTop = firstRowRect.top - containerRect.top;
      const containerWidth = containerRect.width;
      const horizontalDropZoneHeight = 20;

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
  };

  // Main function to calculate GapDropZone positions
  const calculateGapDropZonePositions = React.useCallback(() => {
    const gapDropZones: GapDropZonePosition[] = [];

    // Find which row the dragged widget is from (if any)
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
      addHorizontalDropZones(gapDropZones, row, rowIndex, rowInfo);
    });

    // Add horizontal drop zone above the first row
    addHorizontalDropZoneAboveFirstRow(gapDropZones);

    return gapDropZones;
  }, [widgetRows, columnWidths, isDraggingWidget, draggedWidgetId]);

  // Update positions when dependencies change
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

  return {
    gapDropZonePositions: positions,
  };
};
