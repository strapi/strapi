/* eslint-disable react/display-name */
import React, { forwardRef } from 'react';
import PropTypes from 'prop-types';
import { useDraggedField } from '../../contexts/DraggedField';
import { Grab, Pencil, Remove } from '@buffetjs/icons';

import Wrapper from './Wrapper';

const DraggedField = forwardRef(
  ({ count, isDragging, name, onClick, onRemove }, ref) => {
    const opacity = isDragging ? 0.2 : 1;
    const { selectedItem } = useDraggedField();
    const isSelected = selectedItem === name;

    return (
      <Wrapper count={count} isSelected={isSelected}>
        <div className="sub_wrapper" style={{ opacity }}>
          <div className="grab" ref={ref}>
            <Grab style={{ marginRight: 10, cursor: 'move' }} />
          </div>
          <div className="name" onClick={() => onClick(name)}>
            {name}
          </div>
          <div className="remove" onClick={onRemove}>
            {isSelected ? <Pencil /> : <Remove />}
          </div>
        </div>
      </Wrapper>
    );
  }
);

DraggedField.defaultProps = {
  count: 1,
  isDragging: false,
};

DraggedField.propTypes = {
  count: PropTypes.number,
  isDragging: PropTypes.bool,
  name: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

export default DraggedField;
