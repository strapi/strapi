import * as React from 'react';

import {
  calculateWidgetRows,
  moveWidgetInArray,
  findRowContainingWidget,
  resizeRowAfterRemoval,
  resizeRowAfterAddition,
  isValidResizeOperation,
  canResizeBetweenWidgets,
} from '../utils/widgetUtils';
import { useUpdateHomepageLayoutMutation } from '../services/homepage';
import { useNotification } from './Notifications';
import { useAPIErrorHandler } from '../hooks/useAPIErrorHandler';
import { WidgetRoot } from '../components/WidgetRoot';
import { useIntl } from 'react-intl';

import type { WidgetWithUID } from '../core/apis/Widgets';

interface WidgetInfo {
  widget: WidgetWithUID | undefined;
  index: number;
}

/* -------------------------------------------------------------------------------------------------
 * Widget Management
 * -----------------------------------------------------------------------------------------------*/

const findWidget = (filteredWidgets: WidgetWithUID[], widgetId: string): WidgetInfo => {
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
};

const saveLayout = async (
  widgets: WidgetWithUID[],
  widths: Record<string, number>,
  updateHomepageLayout: any,
  toggleNotification: any,
  formatAPIError: any,
  formatMessage: any
) => {
  try {
    const layoutData = {
      widgets: widgets.map((widget) => ({
        uid: widget.uid,
        width: (widths[widget.uid] || 12) as 4 | 6 | 8 | 12,
      })),
    };

    const res = await updateHomepageLayout(layoutData);

    if ('error' in res) {
      toggleNotification({
        type: 'danger',
        message: formatAPIError(res.error),
      });
    }
  } catch {
    toggleNotification({
      type: 'danger',
      message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occured' }),
    });
  }
};

const moveWidget = (
  filteredWidgets: WidgetWithUID[],
  columnWidths: Record<string, number>,
  widgetId: string,
  insertIndex: number,
  targetRowIndex?: number,
  isHorizontalDrop?: boolean
) => {
  const widget = filteredWidgets.find((w) => w.uid === widgetId);
  if (!widget) return { newWidgets: filteredWidgets, newWidths: columnWidths };

  const widgetRows = calculateWidgetRows(filteredWidgets, columnWidths);

  // Move widget in the array
  const newWidgets = moveWidgetInArray(filteredWidgets, widgetId, insertIndex);

  // Calculate optimal widths for both source and target rows
  const newWidths = { ...columnWidths };

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

  return { newWidgets, newWidths };
};

const deleteWidget = (filteredWidgets: WidgetWithUID[], columnWidths: Record<string, number>) => {
  const widgetRows = calculateWidgetRows(filteredWidgets, columnWidths);

  return (widgetId: string) => {
    const { [widgetId]: removed, ...newWidths } = columnWidths;

    // Find the row containing the deleted widget
    const deletedWidgetIndex = filteredWidgets.findIndex((w) => w.uid === widgetId);
    if (deletedWidgetIndex === -1) return { newWidgets: filteredWidgets, newWidths };

    const affectedRow = widgetRows.find(
      (row) => deletedWidgetIndex >= row.startIndex && deletedWidgetIndex <= row.endIndex
    );

    // Use resizeRowAfterRemoval to resize the affected row
    const finalWidths = resizeRowAfterRemoval(affectedRow, widgetId, newWidths);

    const newWidgets = filteredWidgets.filter((w) => w.uid !== widgetId);

    return { newWidgets, newWidths: finalWidths };
  };
};

const addWidget = (filteredWidgets: WidgetWithUID[], columnWidths: Record<string, number>) => {
  return (widget: WidgetWithUID) => {
    // Check if widget is already added
    const index = filteredWidgets.findIndex((w) => w.uid === widget.uid);
    if (index !== -1) return { newWidgets: filteredWidgets, newWidths: columnWidths };

    const newWidgets = [...filteredWidgets, widget];
    const newWidths = { ...columnWidths };
    // New widget always takes full width (3/3 = 12 columns) in its own row
    newWidths[widget.uid] = 12;

    return { newWidgets, newWidths };
  };
};

const handleInterWidgetResize = (
  filteredWidgets: WidgetWithUID[],
  columnWidths: Record<string, number>,
  leftWidgetId: string,
  rightWidgetId: string,
  newLeftWidth: number,
  newRightWidth: number
) => {
  // Check if widgets can be resized (adjacent, same row, valid sizes)
  if (!canResizeBetweenWidgets(leftWidgetId, rightWidgetId, columnWidths, filteredWidgets)) {
    return columnWidths;
  }

  if (!isValidResizeOperation(newLeftWidth, newRightWidth)) {
    // Resize would violate constraints, don't allow it
    return columnWidths;
  }

  return {
    ...columnWidths,
    [leftWidgetId]: newLeftWidth,
    [rightWidgetId]: newRightWidth,
  };
};

interface UseWidgetsOptions {
  filteredWidgets: WidgetWithUID[];
  setFilteredWidgets: (
    widgets: WidgetWithUID[] | ((prev: WidgetWithUID[]) => WidgetWithUID[])
  ) => void;
}

export const useWidgets = ({ filteredWidgets, setFilteredWidgets }: UseWidgetsOptions) => {
  const [columnWidths, setColumnWidths] = React.useState<Record<string, number>>({});
  const [isDraggingWidget, setIsDraggingWidget] = React.useState(false);
  const [draggedWidgetId, setDraggedWidgetId] = React.useState<string | undefined>();

  // Get services for saveLayout function
  const [updateHomepageLayout] = useUpdateHomepageLayoutMutation();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const { formatMessage } = useIntl();

  // Create memoized functions
  const findWidgetFn = React.useCallback(
    (widgetId: string) => findWidget(filteredWidgets, widgetId),
    [filteredWidgets]
  );

  const moveWidgetFn = React.useCallback(
    (
      widgetId: string,
      insertIndex: number,
      targetRowIndex?: number,
      isHorizontalDrop?: boolean
    ) => {
      const result = moveWidget(
        filteredWidgets,
        columnWidths,
        widgetId,
        insertIndex,
        targetRowIndex,
        isHorizontalDrop
      );

      setFilteredWidgets(result.newWidgets);
      setColumnWidths(result.newWidths);

      // Save layout after state updates
      saveLayout(
        result.newWidgets,
        result.newWidths,
        updateHomepageLayout,
        toggleNotification,
        formatAPIError,
        formatMessage
      );
    },
    [
      filteredWidgets,
      columnWidths,
      setFilteredWidgets,
      setColumnWidths,
      updateHomepageLayout,
      toggleNotification,
      formatAPIError,
      formatMessage,
    ]
  );

  const deleteWidgetFn = React.useCallback(
    (widgetId: string) => {
      const deleteWidgetOperation = deleteWidget(filteredWidgets, columnWidths);
      const result = deleteWidgetOperation(widgetId);

      setFilteredWidgets(result.newWidgets);
      setColumnWidths(result.newWidths);

      // Save layout after state updates
      saveLayout(
        result.newWidgets,
        result.newWidths,
        updateHomepageLayout,
        toggleNotification,
        formatAPIError,
        formatMessage
      );
    },
    [
      filteredWidgets,
      columnWidths,
      setFilteredWidgets,
      setColumnWidths,
      updateHomepageLayout,
      toggleNotification,
      formatAPIError,
      formatMessage,
    ]
  );

  const addWidgetFn = React.useCallback(
    (widget: WidgetWithUID) => {
      const addWidgetOperation = addWidget(filteredWidgets, columnWidths);
      const result = addWidgetOperation(widget);

      setFilteredWidgets(result.newWidgets);
      setColumnWidths(result.newWidths);

      // Save layout after state updates
      saveLayout(
        result.newWidgets,
        result.newWidths,
        updateHomepageLayout,
        toggleNotification,
        formatAPIError,
        formatMessage
      );
    },
    [
      filteredWidgets,
      columnWidths,
      setFilteredWidgets,
      setColumnWidths,
      updateHomepageLayout,
      toggleNotification,
      formatAPIError,
      formatMessage,
    ]
  );

  const handleInterWidgetResizeFn = React.useCallback(
    (leftWidgetId: string, rightWidgetId: string, newLeftWidth: number, newRightWidth: number) => {
      const newWidths = handleInterWidgetResize(
        filteredWidgets,
        columnWidths,
        leftWidgetId,
        rightWidgetId,
        newLeftWidth,
        newRightWidth
      );

      setColumnWidths(newWidths);

      // Save layout after state updates
      saveLayout(
        filteredWidgets,
        newWidths,
        updateHomepageLayout,
        toggleNotification,
        formatAPIError,
        formatMessage
      );
    },
    [
      filteredWidgets,
      columnWidths,
      setColumnWidths,
      updateHomepageLayout,
      toggleNotification,
      formatAPIError,
      formatMessage,
    ]
  );

  // Drag state callbacks
  const handleDragStart = React.useCallback((widgetId: string) => {
    setIsDraggingWidget(true);
    setDraggedWidgetId(widgetId);
  }, []);

  const handleDragEnd = React.useCallback(() => {
    setIsDraggingWidget(false);
    setDraggedWidgetId(undefined);
  }, []);

  return {
    findWidget: findWidgetFn,
    deleteWidget: deleteWidgetFn,
    addWidget: addWidgetFn,
    moveWidget: moveWidgetFn,
    columnWidths,
    setColumnWidths,
    WidgetRoot,
    handleInterWidgetResize: handleInterWidgetResizeFn,
    isDraggingWidget,
    draggedWidgetId,
    handleDragStart,
    handleDragEnd,
  };
};
