import React, { memo, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useDrag, useDrop } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { has } from 'lodash';

import pluginId from '../../pluginId';
import ItemTypes from '../../utils/ItemTypes';

import { Li } from './components';
import Relation from './Relation';

function ListItem({
  data,
  displayNavigationLink,
  findRelation,
  isDisabled,
  mainField,
  moveRelation,
  onRemove,
  searchToPersist,
  targetModel,
}) {
  const to = `/plugins/${pluginId}/collectionType/${targetModel}/${data.id}`;

  const hasDraftAndPublish = has(data, 'published_at');

  const originalIndex = findRelation(data.id).index;
  const [{ isDragging }, drag, preview] = useDrag({
    item: {
      type: ItemTypes.RELATION,
      id: data.id,
      originalIndex,
      data,
      hasDraftAndPublish,
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
    <Li
      ref={node => {
        if (!isDisabled) {
          drag(drop(node));
        }
      }}
      style={{ opacity }}
    >
      <Relation
        displayNavigationLink={displayNavigationLink}
        hasDraftAndPublish={hasDraftAndPublish}
        mainField={mainField}
        onRemove={onRemove}
        data={data}
        to={to}
        isDisabled={isDisabled}
        searchToPersist={searchToPersist}
      />
    </Li>
  );
}

ListItem.defaultProps = {
  findRelation: () => {},
  moveRelation: () => {},
  onRemove: () => {},
  searchToPersist: null,
  targetModel: '',
};

ListItem.propTypes = {
  data: PropTypes.object.isRequired,
  displayNavigationLink: PropTypes.bool.isRequired,
  findRelation: PropTypes.func,
  isDisabled: PropTypes.bool.isRequired,
  mainField: PropTypes.shape({
    name: PropTypes.string.isRequired,
    schema: PropTypes.shape({
      type: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
  moveRelation: PropTypes.func,
  onRemove: PropTypes.func,
  searchToPersist: PropTypes.string,
  targetModel: PropTypes.string,
};

export default memo(ListItem);
