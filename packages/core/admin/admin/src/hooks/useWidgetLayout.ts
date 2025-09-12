/**
 * useWidgetLayout Hook
 *
 * Custom hook for calculating widget layout and drop zones
 * for the homepage widget grid system.
 */

import { useMemo } from 'react';

import type { WidgetWithUID } from '../core/apis/Widgets';

interface WidgetLayoutItem {
  widget: WidgetWithUID;
  index: number;
  currentWidgetWidth: number;
  shouldShowDropZone: boolean;
  dropZoneWidth: number;
}

interface UseWidgetLayoutOptions {
  filteredWidgets: WidgetWithUID[];
  columnWidths: Record<string, number>;
}

/**
 *
 * Custom hook for calculating widget layout and drop zones
 *
 * @param options - Configuration for widget layout
 * @returns Calculated widget layout data
 */
export const useWidgetLayout = ({ filteredWidgets, columnWidths }: UseWidgetLayoutOptions) => {
  const widgetLayout = useMemo(() => {
    return filteredWidgets.reduce(
      (acc, widget, index) => {
        const currentWidgetWidth = columnWidths[widget.uid] || 6;
        const nextWidgetWidth = columnWidths[filteredWidgets[index + 1]?.uid] || 6;

        // Calculate current row width
        const currentRowWidth =
          acc.currentRowWidth + currentWidgetWidth > 12
            ? currentWidgetWidth
            : acc.currentRowWidth + currentWidgetWidth;

        const nextAccumulator = currentRowWidth + nextWidgetWidth;
        const shouldShowDropZone = nextAccumulator > 12 && currentRowWidth < 12;

        acc.layout.push({
          widget,
          index,
          currentWidgetWidth,
          shouldShowDropZone,
          dropZoneWidth: 12 - currentRowWidth,
        });

        acc.currentRowWidth = currentRowWidth;
        return acc;
      },
      {
        layout: [] as WidgetLayoutItem[],
        currentRowWidth: 0,
      }
    ).layout;
  }, [filteredWidgets, columnWidths]);

  return {
    widgetLayout,
  };
};

export type { WidgetLayoutItem };
