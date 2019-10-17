import React from 'react';
import PropTypes from 'prop-types';
import GrabIcon from '../../icons/GrabIcon';
import RemoveIcon from '../../icons/RemoveIcon';
import Wrapper from './Wrapper';

const DraggedField = ({ count, name, onClick, onRemove }) => {
  return (
    <Wrapper count={count}>
      <div className="sub_wrapper">
        <div className="grab">
          <GrabIcon style={{ marginRight: 10, cursor: 'move' }} />
        </div>
        <div className="name" onClick={() => onClick(name)}>
          {name}
        </div>
        <div className="remove" onClick={onRemove}>
          <RemoveIcon />
        </div>
      </div>
    </Wrapper>
  );
};

DraggedField.defaultProps = {
  count: 1,
};

DraggedField.propTypes = {
  count: PropTypes.number,
  name: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired,
};

export default DraggedField;
