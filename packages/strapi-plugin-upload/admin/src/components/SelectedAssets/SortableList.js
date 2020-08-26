import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox } from '@buffetjs/core';
import { get } from 'lodash';
import { prefixFileUrlWithBackendUrl } from 'strapi-helper-plugin';
import DraggableCard from './DraggableCard';
import CardControlsWrapper from '../CardControlsWrapper';
import ListWrapper from '../ListWrapper';
import CardControl from '../CardControl';

const SortableList = ({
  allowedActions,
  canSelect,
  data,
  moveAsset,
  noNavigation,
  onChange,
  onClickEditFile,
  selectedItems,
}) => {
  const handleClick = e => {
    e.stopPropagation();
  };

  return (
    <ListWrapper small>
      <div className="row">
        {data.map((item, index) => {
          const { id } = item;
          const url = get(item, ['formats', 'thumbnail', 'url'], item.url);
          const checked = selectedItems.findIndex(file => file.id === id) !== -1;
          const fileUrl = prefixFileUrlWithBackendUrl(url);
          const handleEditClick = e => {
            e.stopPropagation();
            onClickEditFile(id);
          };

          return (
            <div className="col-xs-12 col-md-6 col-xl-3" key={id || index}>
              <DraggableCard
                checked={checked}
                {...item}
                url={fileUrl}
                moveAsset={moveAsset}
                isDraggable
                index={index}
              >
                {(checked || canSelect) && (
                  <CardControlsWrapper leftAlign displayed className="card-control-wrapper">
                    <Checkbox
                      name={`${id}`}
                      onChange={onChange}
                      onClick={handleClick}
                      value={checked}
                    />
                  </CardControlsWrapper>
                )}
                {!noNavigation && allowedActions.canUpdate && (
                  <CardControlsWrapper className="card-control-wrapper card-control-wrapper-hidden">
                    <CardControl
                      small
                      title="edit"
                      color="#9EA7B8"
                      type="pencil"
                      onClick={e => handleEditClick(e)}
                    />
                  </CardControlsWrapper>
                )}
              </DraggableCard>
            </div>
          );
        })}
      </div>
    </ListWrapper>
  );
};

SortableList.defaultProps = {
  allowedActions: {
    canUpdate: false,
  },
  canSelect: true,
  data: [],
  moveAsset: () => {},
  noNavigation: false,
  onChange: () => {},
  onClickEditFile: () => {},
  selectedItems: [],
};

SortableList.propTypes = {
  allowedActions: PropTypes.object,
  canSelect: PropTypes.bool,
  data: PropTypes.array,
  moveAsset: PropTypes.func,
  noNavigation: PropTypes.bool,
  onChange: PropTypes.func,
  onClickEditFile: PropTypes.func,
  selectedItems: PropTypes.array,
};

export default SortableList;
