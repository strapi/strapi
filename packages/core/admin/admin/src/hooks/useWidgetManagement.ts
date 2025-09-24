/**
 * useWidgetManagement Hook
 *
 * Custom hook for managing widget operations like finding, adding, and deleting widgets
 * in the homepage widget grid system.
 */

import * as React from 'react';

import { produce } from 'immer';

import {
  calculateWidgetRows,
  moveWidgetInArray,
  findRowContainingWidget,
  resizeRowAfterRemoval,
  resizeRowAfterAddition,
  isValidResizeOperation,
  canResizeBetweenWidgets,
} from '../utils/widgetUtils';

import type { WidgetWithUID } from '../core/apis/Widgets';

interface UseWidgetManagementOptions {
  filteredWidgets: WidgetWithUID[];
  setFilteredWidgets: (
    widgets: WidgetWithUID[] | ((prev: WidgetWithUID[]) => WidgetWithUID[])
  ) => void;
  columnWidths: Record<string, number>;
  setColumnWidths: (
    widths: Record<string, number> | ((prev: Record<string, number>) => Record<string, number>)
  ) => void;
}

interface WidgetInfo {
  widget: WidgetWithUID | undefined;
  index: number;
}

/**
 * Custom hook for managing widget operations
 */
export const useWidgetManagement = ({
  filteredWidgets,
  setFilteredWidgets,
  setColumnWidths,
  columnWidths,
}: UseWidgetManagementOptions) => {
  const findWidget = React.useCallback(
    (widgetId: string): WidgetInfo => {
      const widget = filteredWidgets.find((c) => `${c.uid}` === widgetId);
      if (!widget) {
        return {
          widget: undefined,
          index: -1,
        };
      }
      return {
        widget,
        index: filteredWidgets.indexOf(widget),
      };
    },
    [filteredWidgets]
  );

  // Calculate widget rows for drop validation
  const widgetRows = React.useMemo(() => {
    return calculateWidgetRows(filteredWidgets, columnWidths);
  }, [filteredWidgets, columnWidths]);

  // Handle widget drop with validation
  const moveWidget = React.useCallback(
    (
      widgetId: string,
      insertIndex: number,
      targetRowIndex?: number,
      isHorizontalDrop?: boolean
    ) => {
      const widget = filteredWidgets.find((w) => w.uid === widgetId);
      if (!widget) return;

      // Move widget in the array
      setFilteredWidgets((prevWidgets) => moveWidgetInArray(prevWidgets, widgetId, insertIndex));

      // Calculate optimal widths for both source and target rows
      setColumnWidths((prevWidths) => {
        const newWidths = { ...prevWidths };

        // Find the source row (where the widget was removed from)
        const sourceRow = findRowContainingWidget(widgetRows, widgetId, filteredWidgets);

        if (isHorizontalDrop) {
          // This is a horizontal drop zone - widget gets full width in its own row
          newWidths[widgetId] = 12;

          // Resize source row (after widget removal)
          const sourceRowResize = resizeRowAfterRemoval(sourceRow, widgetId, newWidths);
          Object.assign(newWidths, sourceRowResize);
        } else {
          // This is a vertical drop zone within a row
          const targetRow = widgetRows[targetRowIndex!];

          // Resize source row (after widget removal)
          const sourceRowResize = resizeRowAfterRemoval(sourceRow, widgetId, newWidths);
          Object.assign(newWidths, sourceRowResize);

          // Resize target row (after widget addition)
          const targetRowResize = resizeRowAfterAddition(targetRow, widget, insertIndex, newWidths);
          Object.assign(newWidths, targetRowResize);
        }

        return newWidths;
      });
    },
    [filteredWidgets, setFilteredWidgets, setColumnWidths, widgetRows]
  );

  const deleteWidget = React.useCallback(
    (widgetId: string) => {
      setFilteredWidgets(
        produce(filteredWidgets, (draft) => {
          const index = draft.findIndex((widget) => widget.uid === widgetId);
          if (index !== -1) {
            draft.splice(index, 1);
          }
        })
      );

      // Resize only the affected row after deleting widget
      setColumnWidths((prev) => {
        const { [widgetId]: removed, ...newWidths } = prev;

        // Find the row containing the deleted widget
        const deletedWidgetIndex = filteredWidgets.findIndex((w) => w.uid === widgetId);
        if (deletedWidgetIndex === -1) return newWidths;

        const affectedRow = widgetRows.find(
          (row) => deletedWidgetIndex >= row.startIndex && deletedWidgetIndex <= row.endIndex
        );

        // Use resizeRowAfterRemoval to resize the affected row
        return resizeRowAfterRemoval(affectedRow, widgetId, newWidths);
      });
    },
    [filteredWidgets, setFilteredWidgets, setColumnWidths, widgetRows]
  );

  const addWidget = React.useCallback(
    (widget: WidgetWithUID) => {
      setFilteredWidgets(
        produce(filteredWidgets, (draft) => {
          // Check if widget is already added
          const index = draft.findIndex((w) => w.uid === widget.uid);
          if (index === -1) {
            draft.push(widget);
          }
        })
      );

      // Add widget to a new row (full width)
      setColumnWidths((prev) => {
        const newWidths = { ...prev };
        // New widget always takes full width (3/3 = 12 columns) in its own row
        newWidths[widget.uid] = 12;
        return newWidths;
      });
    },
    [filteredWidgets, setFilteredWidgets, setColumnWidths]
  );

  // Handle inter-widget resize
  const handleInterWidgetResize = React.useCallback(
    (leftWidgetId: string, rightWidgetId: string, newLeftWidth: number, newRightWidth: number) => {
      setColumnWidths((prev) => {
        // Check if widgets can be resized (adjacent, same row, valid sizes)
        if (!canResizeBetweenWidgets(leftWidgetId, rightWidgetId, prev, filteredWidgets)) {
          return prev;
        }

        if (!isValidResizeOperation(newLeftWidth, newRightWidth)) {
          // Resize would violate constraints, don't allow it
          return prev;
        }

        const updatedWidths = {
          ...prev,
          [leftWidgetId]: newLeftWidth,
          [rightWidgetId]: newRightWidth,
        };

        return updatedWidths;
      });
    },
    [filteredWidgets, setColumnWidths]
  );

  return {
    findWidget,
    deleteWidget,
    addWidget,
    moveWidget,
    handleInterWidgetResize,
  };
};

export type { WidgetInfo };
