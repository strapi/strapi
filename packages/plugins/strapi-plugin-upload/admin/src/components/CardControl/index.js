import React from 'react';
import PropTypes from 'prop-types';
import { Pencil, Plus } from '@buffetjs/icons';
import { useGlobalContext } from 'strapi-helper-plugin';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { getTrad } from '../../utils';
import DownloadIcon from '../../icons/Download';
import Wrapper from './Wrapper';

const CardControl = ({ title, color, onClick, small, type, iconStyle }) => {
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
      {type === 'plus' && <Plus fill={color} />}
      {type === 'download' && <DownloadIcon fill={color} />}
      {!['pencil', 'clear', 'plus', 'download'].includes(type) && (
        <FontAwesomeIcon style={iconStyle} icon={type} />
      )}
    </Wrapper>
  );
};

CardControl.defaultProps = {
  color: '#b3b5b9',
  iconStyle: null,
  onClick: () => {},
  small: false,
  type: 'pencil',
};

CardControl.propTypes = {
  color: PropTypes.string,
  iconStyle: PropTypes.object,
  onClick: PropTypes.func,
  small: PropTypes.bool,
  type: PropTypes.string,
  title: PropTypes.string.isRequired,
};

export default CardControl;
