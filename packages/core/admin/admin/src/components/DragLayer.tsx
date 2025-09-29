import * as React from 'react';

import { Box } from '@strapi/design-system';
import { DragLayerMonitor, XYCoord, useDragLayer } from 'react-dnd';

function getStyle(
  initialOffset: XYCoord | null,
  currentOffset: XYCoord | null,
  mouseOffset: XYCoord | null,
  item?: any
) {
  if (!initialOffset || !currentOffset || !mouseOffset) {
    return { display: 'none' };
  }

  const { x, y } = mouseOffset;

  // Only apply custom offset for widget drags
  if (item?.type === 'widget') {
    // Calculate dynamic offset based on widget position and width
    const widgetElement = document.querySelector(`[data-widget-id="${item.id}"]`);
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
    /**
     * TODO: it'd be great if we could make this a union where the type infers the item.
     */
    item: any;
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

  const renderPreview = () => {
    return renderItem({ type: itemType, item });
  };

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
      <Box style={getStyle(initialOffset, currentOffset, mouseOffset, { type: itemType, ...item })}>
        {renderPreview()}
      </Box>
    </Box>
  );
};

export { DragLayer };
