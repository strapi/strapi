import React from 'react';
import { useDragLayer } from 'react-dnd';
import LayoutDndProvider from '../LayoutDndProvider';

import ItemTypes from '../../utils/ItemTypes';
import CardPreview from '../../pages/ListSettingsView/components/CardPreview';

import ComponentPreview from './ComponentDragPreview';
import { RelationDragPreview } from './RelationDragPreview';

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

  /**
   * Because a user may have multiple relations / dynamic zones / repeable fields in the same content type,
   * we append the fieldName for the item type to make them unique, however, we then want to extract that
   * first type to apply the correct preview.
   */
  const [actualType] = itemType.split('_');

  return (
    <LayoutDndProvider>
      <div style={layerStyles}>
        <div style={getItemStyles(initialOffset, currentOffset, mouseOffset)} className="col-md-2">
          {[ItemTypes.EDIT_FIELD, ItemTypes.FIELD].includes(itemType) && (
            <CardPreview labelField={item.labelField} />
          )}
          {actualType === ItemTypes.COMPONENT && (
            <ComponentPreview displayedValue={item.displayedValue} />
          )}
          {actualType === ItemTypes.DYNAMIC_ZONE && (
            <ComponentPreview displayedValue={item.displayedValue} />
          )}
          {actualType === ItemTypes.RELATION && (
            <RelationDragPreview
              displayedValue={item.displayedValue}
              status={item.status}
              width={item.width}
            />
          )}
        </div>
      </div>
    </LayoutDndProvider>
  );
};

export default CustomDragLayer;
