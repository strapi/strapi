import React from 'react';
import PropTypes from 'prop-types';
import { Pencil } from '@buffetjs/icons';
import { ClearIcon } from 'strapi-helper-plugin';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import DownloadIcon from '../../icons/Download';
import Wrapper from './Wrapper';

const CardControl = ({ color, onClick, small, type }) => {
  return (
    <Wrapper onClick={onClick} color={color} type={type} small={small}>
      {type === 'pencil' && <Pencil fill={color} />}
      {type === 'clear' && <ClearIcon fill={color} />}
      {type === 'download' && <DownloadIcon fill={color} />}
      {!['pencil', 'clear', 'download'].includes(type) && <FontAwesomeIcon icon={type} />}
    </Wrapper>
  );
};

CardControl.defaultProps = {
  color: '#b3b5b9',
  onClick: () => {},
  small: false,
  type: 'pencil',
};

CardControl.propTypes = {
  color: PropTypes.string,
  onClick: PropTypes.func,
  small: PropTypes.bool,
  type: PropTypes.string,
};

export default CardControl;
