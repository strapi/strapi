import React from 'react';
import PropTypes from 'prop-types';
import { Checkbox } from '@buffetjs/core';
import Card from '../Card';
import CardControlsWrapper from '../CardControlsWrapper';
import ListWrapper from '../ListWrapper';

const SortableList = ({ data, moveAsset, onChange, onClickEditFile, selectedItems, canSelect }) => {
  const handleClick = e => {
    e.stopPropagation();
  };

  return (
    <ListWrapper>
      <div className="row">
        {data.map((item, index) => {
          const { id, url } = item;
          const checked = selectedItems.findIndex(file => file.id === id) !== -1;
          const fileUrl = url.startsWith('/') ? `${strapi.backendURL}${url}` : url;

          return (
            <div className="col-xs-12 col-md-6 col-xl-3" key={id}>
              <Card
                checked={checked}
                {...item}
                url={fileUrl}
                moveAsset={moveAsset}
                onClick={onClickEditFile}
                isDraggable
                index={index}
              >
                {(checked || canSelect) && (
                  <CardControlsWrapper leftAlign className="card-control-wrapper">
                    <Checkbox
                      name={`${id}`}
                      onChange={onChange}
                      onClick={handleClick}
                      value={checked}
                    />
                  </CardControlsWrapper>
                )}
              </Card>
            </div>
          );
        })}
      </div>
    </ListWrapper>
  );
};

SortableList.defaultProps = {
  canSelect: true,
  data: [],
  moveAsset: () => {},
  onChange: () => {},
  onClickEditFile: () => {},
  selectedItems: [],
};

SortableList.propTypes = {
  canSelect: PropTypes.bool,
  data: PropTypes.array,
  moveAsset: PropTypes.func,
  onChange: PropTypes.func,
  onClickEditFile: PropTypes.func,
  selectedItems: PropTypes.array,
};

export default SortableList;
