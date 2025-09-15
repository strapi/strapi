/**
 * useWidgetManagement Hook
 *
 * Custom hook for managing widget operations like finding, moving, and dropping widgets
 * in the homepage widget grid system.
 */

import { useCallback } from 'react';

import { produce } from 'immer';

import type { WidgetWithUID } from '../core/apis/Widgets';

interface UseWidgetManagementOptions {
  filteredWidgets: WidgetWithUID[];
  setFilteredWidgets: (
    widgets: WidgetWithUID[] | ((prev: WidgetWithUID[]) => WidgetWithUID[])
  ) => void;
}

interface WidgetInfo {
  widget: WidgetWithUID | undefined;
  index: number;
}

/**
 * Custom hook for managing widget operations
 *
 * @param options - Configuration for widget management
 * @returns Widget management functions
 */
export const useWidgetManagement = ({
  filteredWidgets,
  setFilteredWidgets,
}: UseWidgetManagementOptions) => {
  const findWidget = useCallback(
    (id: string): WidgetInfo => {
      const widget = filteredWidgets.find((c) => `${c.uid}` === id);
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

  const moveWidget = useCallback(
    (id: string, atIndex: number) => {
      const { widget, index } = findWidget(id);
      if (!widget || index === -1) {
        return;
      }
      setFilteredWidgets(
        produce(filteredWidgets, (draft) => {
          draft.splice(index, 1);
          draft.splice(atIndex, 0, widget);
        })
      );
    },
    [findWidget, filteredWidgets, setFilteredWidgets]
  );

  const handleDropWidget = useCallback(
    (widgetId: string, insertIndex: number) => {
      moveWidget(widgetId, insertIndex);
    },
    [moveWidget]
  );

  const deleteWidget = useCallback(
    (widgetId: string) => {
      setFilteredWidgets(
        produce(filteredWidgets, (draft) => {
          const index = draft.findIndex((widget) => widget.uid === widgetId);
          if (index !== -1) {
            draft.splice(index, 1);
          }
        })
      );
    },
    [filteredWidgets, setFilteredWidgets]
  );

  const addWidget = useCallback(
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
    },
    [filteredWidgets, setFilteredWidgets]
  );

  return {
    findWidget,
    moveWidget,
    handleDropWidget,
    deleteWidget,
    addWidget,
  };
};

export type { WidgetInfo };
