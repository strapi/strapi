import React from 'react';
import { useDragLayer } from 'react-dnd';
import LayoutDndProvider from '../LayoutDndProvider';

import ItemTypes from '../../utils/ItemTypes';
import CardPreview from '../../pages/ListSettingsView/components/CardPreview';

import ComponentPreview from './ComponentDragPreview';

const layerStyles = {
  position: 'fixed',
  pointerEvents: 'none',
  zIndex: 100,
  left: 0,
  top: 0,
  width: '100%',
  height: '100%',
};

function getItemStyles(initialOffset, currentOffset, mouseOffset) {
  if (!initialOffset || !currentOffset) {
    return { display: 'none' };
  }

  const { x, y } = mouseOffset;
  // TODO adjust
  const transform = `translate(${x}px, ${y}px)`;

  return {
    transform,
    WebkitTransform: transform,
  };
}

const CustomDragLayer = () => {
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
    <LayoutDndProvider>
      <div style={layerStyles}>
        <div style={getItemStyles(initialOffset, currentOffset, mouseOffset)} className="col-md-2">
          {[ItemTypes.EDIT_FIELD, ItemTypes.FIELD].includes(itemType) && (
            <CardPreview labelField={item.labelField} />
          )}
          {itemType === ItemTypes.COMPONENT && (
            <ComponentPreview displayedValue={item.displayedValue} />
          )}
          {itemType === ItemTypes.DYNAMIC_ZONE && (
            <ComponentPreview icon={item.icon} displayedValue={item.displayedValue} />
          )}
        </div>
      </div>
    </LayoutDndProvider>
  );
};

export default CustomDragLayer;
