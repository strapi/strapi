import React from 'react';
import PropTypes from 'prop-types';
import GrabIcon from '../../icons/GrabIcon';
import RemoveIcon from '../../icons/RemoveIcon';
import Wrapper from './Wrapper';

const DraggedField = ({ name, onRemove }) => {
  return (
    <Wrapper>
      <div className="sub_wrapper">
        <div className="grab">
          <GrabIcon style={{ marginRight: 10, cursor: 'move' }} />
        </div>
        <div className="name">{name}</div>
        <div className="remove" onClick={onRemove}>
          <RemoveIcon />
        </div>
      </div>
    </Wrapper>
  );
};

DraggedField.propTypes = {
  name: PropTypes.string.isRequired,
  onRemove: PropTypes.func.isRequired,
};

export default DraggedField;
