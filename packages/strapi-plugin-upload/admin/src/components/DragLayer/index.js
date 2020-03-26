import React from 'react';
import { useDragLayer } from 'react-dnd';
import { Checkbox } from '@buffetjs/core';
import { ItemTypes } from '../../utils';
import CardControlsWrapper from '../CardControlsWrapper';
import CardImgWrapper from '../CardImgWrapper';
import CardPreview from '../CardPreview';
import Border from '../CardBorder';
import Wrapper from './Wrapper';

function getItemStyles(initialOffset, currentOffset, mouseOffset) {
  if (!initialOffset || !currentOffset) {
    return { display: 'none' };
  }

  const { x, y } = mouseOffset;
  const transform = `translate(${x}px, ${y}px)`;

  return {
    transform,
    WebkitTransform: transform,
  };
}

const DragLayer = () => {
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

  const renderItem = () => {
    switch (itemType) {
      case ItemTypes.MEDIA_CARD: {
        return (
          <CardImgWrapper checked small>
            <CardPreview url={item.url} type={item.fileType} withFileCaching />
            <Border color="mediumBlue" shown />
            <CardControlsWrapper leftAlign className="card-control-wrapper">
              <Checkbox name="id" onChange={() => {}} onClick={() => {}} value />
            </CardControlsWrapper>
          </CardImgWrapper>
        );
      }
      default:
        return null;
    }
  };

  if (!isDragging) {
    return null;
  }

  return (
    <Wrapper>
      <div style={getItemStyles(initialOffset, currentOffset, mouseOffset)} className="col-md-2">
        {renderItem()}
      </div>
    </Wrapper>
  );
};

export default DragLayer;
