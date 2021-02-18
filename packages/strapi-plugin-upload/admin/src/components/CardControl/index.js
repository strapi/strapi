import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Pencil, Plus } from '@buffetjs/icons';
import { Tooltip } from '@buffetjs/styles';
import { useGlobalContext } from 'strapi-helper-plugin';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import { getTrad } from '../../utils';
import DownloadIcon from '../../icons/Download';
import Wrapper from './Wrapper';

const CardControl = ({ title, color, onClick, small, type, iconStyle }) => {
  const { formatMessage } = useGlobalContext();
  const [tooltipIsDisplayed, setTooltipIsDisplayed] = useState(false);

  const handleToggleTooltip = () => {
    setTooltipIsDisplayed(prev => !prev);
  };

  return (
    <>
      <Wrapper
        onClick={onClick}
        color={color}
        type={type}
        small={small}
        onMouseEnter={handleToggleTooltip}
        onMouseLeave={handleToggleTooltip}
        data-for={type}
        data-tip={formatMessage({ id: getTrad(`control-card.${title}`) })}
      >
        {type === 'pencil' && <Pencil fill={color} />}
        {type === 'plus' && <Plus fill={color} />}
        {type === 'download' && <DownloadIcon fill={color} />}
        {!['pencil', 'clear', 'plus', 'download'].includes(type) && (
          <FontAwesomeIcon style={iconStyle} icon={type} />
        )}
      </Wrapper>
      {tooltipIsDisplayed && <Tooltip id={type} />}
    </>
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
