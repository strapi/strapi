/**
 *
 * CustomAttributeIcon
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlug } from '@fortawesome/free-solid-svg-icons';
import StyledCustomAttributeIcon from './StyledCustomAttributeIcon';

const CustomAttributeIcon = ({ icon, className, ...rest }) => {
  return (
    <StyledCustomAttributeIcon {...rest}>
      <FontAwesomeIcon icon={icon || faPlug} style={{ color: 'white' }} className={className} />
    </StyledCustomAttributeIcon>
  );
};

CustomAttributeIcon.defaultProps = {
  icon: null,
  className: '',
};

CustomAttributeIcon.propTypes = {
  icon: PropTypes.object,
  className: PropTypes.string,
};

export default CustomAttributeIcon;
