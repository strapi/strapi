import * as React from 'react';

import { Box } from '@strapi/design-system';
import { DragLayerMonitor, XYCoord, useDragLayer } from 'react-dnd';

import { getWidgetElement } from '../utils/widgetLayout';

import type { WidgetArgs } from '../core/apis/Widgets';

export interface WidgetDragItem extends Pick<WidgetArgs, 'title' | 'icon' | 'link' | 'component'> {
  type: 'widget';
  id: string;
  originalIndex: number;
}

export function isWidgetDragItem(item: unknown): item is WidgetDragItem {
  return (
    typeof item === 'object' &&
    item !== null &&
    'id' in item &&
    typeof item.id === 'string' &&
    'originalIndex' in item &&
    typeof item.originalIndex === 'number' &&
    'title' in item &&
    'component' in item
  );
}

function getStyle(
  initialOffset: XYCoord | null,
  currentOffset: XYCoord | null,
  mouseOffset: XYCoord | null,
  item?: unknown
) {
  if (!initialOffset || !currentOffset || !mouseOffset) {
    return { display: 'none' };
  }

  const { x, y } = mouseOffset;

  // Only apply custom offset for widget drags
  if (isWidgetDragItem(item)) {
    // Calculate dynamic offset based on widget position and width
    const widgetElement = getWidgetElement(item.id);
    const previewWidth = widgetElement?.clientWidth;
    const offsetX = previewWidth ? -previewWidth + 20 : 0;
    const offsetY = 20;

    return {
      transform: `translate(${x + offsetX}px, ${y + offsetY}px)`,
    };
  }

  // Default positioning for non-widget drags
  return {
    transform: `translate(${x}px, ${y}px)`,
  };
}

export interface DragLayerProps {
  renderItem: (item: {
    item: unknown;
    type: ReturnType<DragLayerMonitor['getItemType']>;
  }) => React.ReactNode;
}

const DragLayer = ({ renderItem }: DragLayerProps) => {
  const { itemType, isDragging, item, initialOffset, currentOffset, mouseOffset } = useDragLayer(
    (monitor) => ({
      item: monitor.getItem(),
      itemType: monitor.getItemType(),
      initialOffset: monitor.getInitialSourceClientOffset(),
      currentOffset: monitor.getSourceClientOffset(),
      isDragging: monitor.isDragging(),
      mouseOffset: monitor.getClientOffset(),
    })
  );

  if (!isDragging) {
    return null;
  }

  return (
    <Box
      height="100%"
      left={0}
      position="fixed"
      pointerEvents="none"
      top={0}
      zIndex={100}
      width="100%"
    >
      <Box style={getStyle(initialOffset, currentOffset, mouseOffset, item)}>
        {renderItem({ type: itemType, item })}
      </Box>
    </Box>
  );
};

export { DragLayer };
