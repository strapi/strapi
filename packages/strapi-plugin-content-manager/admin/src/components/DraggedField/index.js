/* eslint-disable react/display-name */
import React, { forwardRef, useState } from 'react';
import PropTypes from 'prop-types';

import { Grab, Pencil, Remove } from '@buffetjs/icons';

import Wrapper from './Wrapper';

const DraggedField = forwardRef(
  (
    {
      count,
      isDragging,
      isHidden,
      name,
      onClick,
      onRemove,
      selectedItem,
      style,
    },
    ref
  ) => {
    const opacity = isDragging ? 0.2 : 1;
    const [isOverRemove, setIsOverRemove] = useState(false);

    const isSelected = selectedItem === name;

    return (
      <Wrapper
        count={count}
        isSelected={isSelected}
        isOverRemove={isOverRemove}
        style={style}
      >
        {!isHidden && (
          <div className="sub_wrapper" style={{ opacity }}>
            <div className="grab" ref={ref}>
              <Grab style={{ marginRight: 10, cursor: 'move' }} />
            </div>
            <div className="name" onClick={() => onClick(name)}>
              {name}
            </div>
            <div
              className="remove"
              onClick={onRemove}
              onMouseEnter={() => setIsOverRemove(true)}
              onMouseLeave={() => setIsOverRemove(false)}
            >
              {isSelected ? <Pencil /> : <Remove />}
            </div>
          </div>
        )}
      </Wrapper>
    );
  }
);

DraggedField.defaultProps = {
  count: 1,
  isDragging: false,
  isHidden: false,
  onClick: () => {},
  onRemove: () => {},
  selectedItem: '',

  style: {},
};

DraggedField.propTypes = {
  count: PropTypes.number,
  isDragging: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onClick: PropTypes.func,
  onRemove: PropTypes.func,
  selectedItem: PropTypes.string,
};

export default DraggedField;
