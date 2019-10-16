import React from 'react';
import PropTypes from 'prop-types';
import GrabIcon from '../GrabIcon';
import Wrapper from './Wrapper';

const DraggedField = ({ name }) => {
  return (
    <Wrapper>
      <div className="sub_wrapper">
        <div className="grab">
          <GrabIcon style={{ marginRight: 10 }} />
        </div>
        <div className="name">{name}</div>
      </div>
    </Wrapper>
  );
};

DraggedField.propTypes = {
  name: PropTypes.string.isRequired,
};

export default DraggedField;
