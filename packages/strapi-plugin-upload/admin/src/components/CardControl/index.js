import React from 'react';
import PropTypes from 'prop-types';
import { Pencil } from '@buffetjs/icons';
import Wrapper from './Wrapper';

const CardControl = ({ onClick }) => {
  return (
    <Wrapper onClick={onClick}>
      <Pencil fill="#b3b5b9" />
    </Wrapper>
  );
};

CardControl.defaultProps = {
  onClick: () => {},
};

CardControl.propTypes = {
  onClick: PropTypes.func,
};

export default CardControl;
