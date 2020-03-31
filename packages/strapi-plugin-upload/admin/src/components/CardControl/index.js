import React from 'react';
import PropTypes from 'prop-types';
import { Pencil, Plus } from '@buffetjs/icons';
import { ClearIcon, useGlobalContext } from 'strapi-helper-plugin';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { getTrad } from '../../utils';
import DownloadIcon from '../../icons/Download';
import Wrapper from './Wrapper';

const CardControl = ({ title, color, onClick, small, type }) => {
  const { formatMessage } = useGlobalContext();

  return (
    <Wrapper
      title={formatMessage({ id: getTrad(`control-card.${title}`) })}
      onClick={onClick}
      color={color}
      type={type}
      small={small}
    >
      {type === 'pencil' && <Pencil fill={color} />}
      {type === 'clear' && <ClearIcon fill={color} />}
      {type === 'plus' && <Plus fill={color} />}
      {type === 'download' && <DownloadIcon fdill={color} />}
      {!['pencil', 'clear', 'plus', 'download'].includes(type) && <FontAwesomeIcon icon={type} />}
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
  title: PropTypes.string.isRequired,
};

export default CardControl;
