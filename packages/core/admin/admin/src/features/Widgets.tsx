import * as React from 'react';

import { useIntl } from 'react-intl';

import { useAPIErrorHandler } from '../hooks/useAPIErrorHandler';
import { useUpdateHomepageLayoutMutation } from '../services/homepage';
import {
  calculateWidgetRows,
  moveWidgetInArray,
  findRowContainingWidget,
  resizeRowAfterRemoval,
  resizeRowAfterAddition,
  isValidResizeOperation,
  canResizeBetweenWidgets,
  WIDGET_SIZING,
} from '../utils/widgetLayout';

import { useNotification } from './Notifications';

import type { WidgetWithUID } from '../core/apis/Widgets';
import type { WidgetType } from '@strapi/admin/strapi-admin';

export interface WidgetInfo {
  widget: WidgetType | undefined;
  index: number;
}

export type FindWidgetFunction = (id: string) => WidgetInfo;
export type WidgetIdFunction = (id: string) => void;
export type DragEndFunction = () => void;

interface BaseWidgetContext {
  filteredWidgets: WidgetWithUID[];
  columnWidths: Record<string, number>;
}

interface MoveWidgetOptions extends BaseWidgetContext {
  widgetId: string;
  insertIndex: number;
  targetRowIndex?: number;
  isHorizontalDrop?: boolean;
}

interface SaveLayoutOptions {
  widgets: WidgetWithUID[];
  widths: Record<string, number>;
  updateHomepageLayout: (data: {
    widgets: Array<{ uid: string; width: (typeof WIDGET_SIZING.DISCRETE_SIZES)[number] }>;
  }) => Promise<any>;
  toggleNotification: (config: { type: 'danger'; message: string }) => void;
  formatAPIError: (error: any) => string;
  formatMessage: (descriptor: { id: string; defaultMessage: string }) => string;
}

interface HandleWidgetResizeOptions extends BaseWidgetContext {
  leftWidgetId: string;
  rightWidgetId: string;
  newLeftWidth: number;
  newRightWidth: number;
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

const saveLayout = async ({
  widgets,
  widths,
  updateHomepageLayout,
  toggleNotification,
  formatAPIError,
  formatMessage,
}: SaveLayoutOptions) => {
  try {
    const layoutData = {
      widgets: widgets.map((widget) => ({
        uid: widget.uid,
        width: (widths[widget.uid] ||
          WIDGET_SIZING.TOTAL_COLUMNS) as (typeof WIDGET_SIZING.DISCRETE_SIZES)[number],
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

const moveWidget = ({
  filteredWidgets,
  columnWidths,
  widgetId,
  insertIndex,
  targetRowIndex,
  isHorizontalDrop,
}: MoveWidgetOptions) => {
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
    newWidths[widgetId] = WIDGET_SIZING.TOTAL_COLUMNS;

    // Resize source row (after widget removal)
    const sourceRowResize = resizeRowAfterRemoval(sourceRow, widgetId, newWidths);
    Object.assign(newWidths, sourceRowResize);
  } else {
    // This is a vertical drop zone within a row
    const targetRow = widgetRows[targetRowIndex!];

    // Check if we're reordering within the same row
    const isSameRowReorder =
      sourceRow && targetRow && sourceRow.startIndex === targetRow.startIndex;

    if (isSameRowReorder) {
      // For same-row reordering, just preserve the existing widths
      return { newWidgets, newWidths };
    }

    // Different rows - resize both source and target rows
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
    const { [widgetId]: _removed, ...newWidths } = columnWidths;

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
    // New widget always takes full width in its own row
    newWidths[widget.uid] = WIDGET_SIZING.TOTAL_COLUMNS;

    return { newWidgets, newWidths };
  };
};

const handleWidgetResize = ({
  filteredWidgets,
  columnWidths,
  leftWidgetId,
  rightWidgetId,
  newLeftWidth,
  newRightWidth,
}: HandleWidgetResizeOptions) => {
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

  const [updateHomepageLayout] = useUpdateHomepageLayoutMutation();
  const { toggleNotification } = useNotification();
  const { _unstableFormatAPIError: formatAPIError } = useAPIErrorHandler();
  const { formatMessage } = useIntl();

  const findWidgetFn: FindWidgetFunction = (widgetId: string) =>
    findWidget(filteredWidgets, widgetId);

  const moveWidgetFn = (
    widgetId: string,
    insertIndex: number,
    targetRowIndex?: number,
    isHorizontalDrop?: boolean
  ) => {
    const result = moveWidget({
      filteredWidgets,
      columnWidths,
      widgetId,
      insertIndex,
      targetRowIndex,
      isHorizontalDrop,
    });

    setFilteredWidgets(result.newWidgets);
    setColumnWidths(result.newWidths);

    saveLayout({
      widgets: result.newWidgets,
      widths: result.newWidths,
      updateHomepageLayout,
      toggleNotification,
      formatAPIError,
      formatMessage,
    });
  };

  const deleteWidgetFn: WidgetIdFunction = (widgetId: string) => {
    const deleteWidgetOperation = deleteWidget(filteredWidgets, columnWidths);
    const result = deleteWidgetOperation(widgetId);

    setFilteredWidgets(result.newWidgets);
    setColumnWidths(result.newWidths);

    saveLayout({
      widgets: result.newWidgets,
      widths: result.newWidths,
      updateHomepageLayout,
      toggleNotification,
      formatAPIError,
      formatMessage,
    });
  };

  const addWidgetFn = (widget: WidgetWithUID) => {
    const addWidgetOperation = addWidget(filteredWidgets, columnWidths);
    const result = addWidgetOperation(widget);

    setFilteredWidgets(result.newWidgets);
    setColumnWidths(result.newWidths);

    saveLayout({
      widgets: result.newWidgets,
      widths: result.newWidths,
      updateHomepageLayout,
      toggleNotification,
      formatAPIError,
      formatMessage,
    });
  };

  const handleWidgetResizeFn = (
    leftWidgetId: string,
    rightWidgetId: string,
    newLeftWidth: number,
    newRightWidth: number
  ) => {
    const newWidths = handleWidgetResize({
      filteredWidgets,
      columnWidths,
      leftWidgetId,
      rightWidgetId,
      newLeftWidth,
      newRightWidth,
    });

    setColumnWidths(newWidths);
  };

  const handleDragStart: WidgetIdFunction = React.useCallback((widgetId: string) => {
    setIsDraggingWidget(true);
    setDraggedWidgetId(widgetId);
  }, []);

  const handleDragEnd: DragEndFunction = React.useCallback(() => {
    setIsDraggingWidget(false);
    setDraggedWidgetId(undefined);
  }, []);

  const saveLayoutFn = () => {
    saveLayout({
      widgets: filteredWidgets,
      widths: columnWidths,
      updateHomepageLayout,
      toggleNotification,
      formatAPIError,
      formatMessage,
    });
  };

  return {
    findWidget: findWidgetFn,
    deleteWidget: deleteWidgetFn,
    addWidget: addWidgetFn,
    moveWidget: moveWidgetFn,
    columnWidths,
    setColumnWidths,
    handleWidgetResize: handleWidgetResizeFn,
    saveLayout: saveLayoutFn,
    isDraggingWidget,
    draggedWidgetId,
    handleDragStart,
    handleDragEnd,
  };
};
