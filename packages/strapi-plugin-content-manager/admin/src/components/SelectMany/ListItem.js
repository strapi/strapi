import React, { memo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';

import pluginId from '../../pluginId';
import ItemTypes from '../../utils/ItemTypes';

import { Li } from './components';
import Relation from './Relation';

function ListItem({
  data,
  findRelation,
  mainField,
  moveRelation,
  nextSearch,
  onRemove,
  targetModel,
}) {
  const to = `/plugins/${pluginId}/${targetModel}/${data.id}?redirectUrl=${nextSearch}`;

  const originalIndex = findRelation(data.id).index;
  const [{ isDragging }, drag, preview] = useDrag({
    item: {
      type: ItemTypes.RELATION,
      id: data.id,
      originalIndex,
      data,
      mainField,
    },
    collect: monitor => ({
      isDragging: monitor.isDragging(),
    }),
  });
  const [, drop] = useDrop({
    accept: ItemTypes.RELATION,
    canDrop: () => false,
    hover({ id: draggedId }) {
      if (draggedId !== data.id) {
        const { index: overIndex } = findRelation(data.id);
        moveRelation(draggedId, overIndex);
      }
    },
  });

  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  const opacity = isDragging ? 0.2 : 1;

  return (
    <Li ref={node => drag(drop(node))} style={{ opacity }}>
      <Relation mainField={mainField} onRemove={onRemove} data={data} to={to} />
    </Li>
  );
}

ListItem.defaultProps = {
  findRelation: () => {},
  moveRelation: () => {},
  nextSearch: '',
  onRemove: () => {},
  targetModel: '',
};

ListItem.propTypes = {
  data: PropTypes.object.isRequired,
  findRelation: PropTypes.func,
  mainField: PropTypes.string.isRequired,
  moveRelation: PropTypes.func,
  nextSearch: PropTypes.string,
  onRemove: PropTypes.func,
  targetModel: PropTypes.string,
};

export default memo(ListItem);
