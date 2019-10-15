import React from 'react';
import PropTypes from 'prop-types';
import Wrapper from './Wrapper';

const DraggedField = ({ name }) => {
  console.log(name);
  return (
    <Wrapper>
      <div>{name}</div>
    </Wrapper>
  );
};

DraggedField.propTypes = {
  name: PropTypes.string.isRequired,
};

export default DraggedField;
