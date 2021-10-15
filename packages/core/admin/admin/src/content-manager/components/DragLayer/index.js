import React from 'react';
import { useDragLayer } from 'react-dnd';
import LayoutDndProvider from '../LayoutDndProvider';

import ItemTypes from '../../utils/ItemTypes';
import RepeatableComponentPreview from '../RepeatableComponent/DragPreview';
import CardPreview from '../../pages/ListSettingsView/components/CardPreview';
// import RelationItem from '../SelectMany/Relation';
// import { Li } from '../SelectMany/components';
// import DraggedField from '../DraggedField';

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
    monitor => ({
      item: monitor.getItem(),
      itemType: monitor.getItemType(),
      initialOffset: monitor.getInitialSourceClientOffset(),
      currentOffset: monitor.getSourceClientOffset(),
      isDragging: monitor.isDragging(),
      mouseOffset: monitor.getClientOffset(),
    })
  );

  // function renderItem() {
  //   switch (itemType) {
  //     case ItemTypes.FIELD:
  //       return <div>{item.labelField}</div>;
  //     case ItemTypes.COMPONENT:
  //       return <RepeatableComponentPreview displayedValue={item.displayedValue} />;
  // case ItemTypes.RELATION:
  //   return (
  //     <Li>
  //       <RelationItem
  //         data={item.data}
  //         displayNavigationLink={false}
  //         mainField={item.mainField}
  //         isDisabled={false}
  //         isDragging
  //         hasDraftAndPublish={item.hasDraftAndPublish}
  //       />
  //     </Li>
  //   );
  // case ItemTypes.EDIT_FIELD:
  // case ItemTypes.EDIT_RELATION:
  //   return <DraggedField name={item.name} size={12} selectedItem={item.name} />;
  //     default:
  //       return null;
  //   }
  // }

  if (!isDragging) {
    return null;
  }

  return (
    <LayoutDndProvider>
      <div style={layerStyles}>
        <div style={getItemStyles(initialOffset, currentOffset, mouseOffset)} className="col-md-2">
          {/* {renderItem()} */}
          {itemType === ItemTypes.FIELD && <CardPreview labelField={item.labelField} />}
          {itemType === ItemTypes.COMPONENT && (
            <RepeatableComponentPreview displayedValue={item.displayedValue} />
          )}
        </div>
      </div>
    </LayoutDndProvider>
  );
};

export default CustomDragLayer;
