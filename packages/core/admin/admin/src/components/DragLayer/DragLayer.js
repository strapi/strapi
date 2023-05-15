import * as React from 'react';
import PropTypes from 'prop-types';
import { useDragLayer } from 'react-dnd';
import { Box } from '@strapi/design-system';

function getStyle(initialOffset, currentOffset, mouseOffset) {
  if (!initialOffset || !currentOffset) {
    return { display: 'none' };
  }

  const { x, y } = mouseOffset;

  return {
    transform: `translate(${x}px, ${y}px)`,
  };
}

export function DragLayer({ renderItem }) {
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
      <Box style={getStyle(initialOffset, currentOffset, mouseOffset)}>
        {renderItem({ type: itemType, item })}
      </Box>
    </Box>
  );
}

DragLayer.propTypes = {
  renderItem: PropTypes.func.isRequired,
};
