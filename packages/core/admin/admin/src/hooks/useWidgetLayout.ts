import { useMemo } from 'react';

import { isLastWidgetInRow, canResizeBetweenWidgets, getWidgetWidth } from '../utils/widgetUtils';

import type { WidgetWithUID } from '../core/apis/Widgets';

export interface WidgetLayout {
  widget: WidgetWithUID;
  index: number;
  isLastInRow: boolean;
  rightWidgetId: string | undefined;
  widgetWidth: number;
  rightWidgetWidth: number;
  canResize: boolean;
}

/**
 * Custom hook to calculate widget layout data for rendering
 * Pre-calculates all layout-related data to optimize performance
 */
export const useWidgetLayout = (
  filteredWidgets: WidgetWithUID[],
  columnWidths: Record<string, number>
): WidgetLayout[] => {
  const widgetLayout = useMemo(() => {
    return filteredWidgets.map((widget, index) => {
      const rightWidgetId = filteredWidgets[index + 1]?.uid;
      const widgetWidth = getWidgetWidth(columnWidths, widget.uid);
      const rightWidgetWidth = getWidgetWidth(columnWidths, rightWidgetId);

      return {
        widget,
        index,
        isLastInRow: isLastWidgetInRow(index, filteredWidgets, columnWidths),
        rightWidgetId,
        widgetWidth,
        rightWidgetWidth,
        canResize:
          rightWidgetId &&
          canResizeBetweenWidgets(widget.uid, rightWidgetId, columnWidths, filteredWidgets),
      };
    });
  }, [filteredWidgets, columnWidths]);

  return widgetLayout;
};
