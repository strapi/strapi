import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import PropTypes from 'prop-types';

const Icon = ({ elapsed, icon }) => {
  let displayedIcon = icon;
  let className = 'icoContainer spinner';

  if (elapsed > 15) {
    displayedIcon = ['far', 'clock'];
    className = 'icoContainer';
  }

  return (
    <div className={className}>
      <FontAwesomeIcon icon={displayedIcon} />
    </div>
  );
};

Icon.defaultProps = {
  icon: 'sync-alt',
};

Icon.propTypes = {
  elapsed: PropTypes.number.isRequired,
  icon: PropTypes.oneOfType([PropTypes.string, PropTypes.array]),
};

export default Icon;
