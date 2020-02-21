import React from 'react';
import PropTypes from 'prop-types';
import { Pencil } from '@buffetjs/icons';
import { ClearIcon } from 'strapi-helper-plugin';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Wrapper from './Wrapper';

const CardControl = ({ color, onClick, type }) => {
  return (
    <Wrapper onClick={onClick} color={color}>
      {type === 'pencil' && <Pencil fill={color} />}
      {type === 'clear' && <ClearIcon fill={color} />}
      {!['pencil', 'clear'].includes(type) && <FontAwesomeIcon icon={type} />}
    </Wrapper>
  );
};

CardControl.defaultProps = {
  color: '#b3b5b9',
  onClick: () => {},
  type: 'pencil',
};

CardControl.propTypes = {
  color: PropTypes.string,
  onClick: PropTypes.func,
  type: PropTypes.string,
};

export default CardControl;
