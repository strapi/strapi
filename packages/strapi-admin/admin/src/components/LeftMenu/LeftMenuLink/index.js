/**
 *
 * LeftMenuLink
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

import LeftMenuLinkContent from './LeftMenuLinkContent';

const LeftMenuLink = ({ destination, iconName, label, location }) => {
  return (
    <LeftMenuLinkContent
      destination={destination}
      iconName={iconName}
      label={label}
      location={location}
    />
  );
};

LeftMenuLink.propTypes = {
  destination: PropTypes.string.isRequired,
  iconName: PropTypes.string,
  label: PropTypes.oneOfType([PropTypes.object, PropTypes.string]).isRequired,
  location: PropTypes.shape({
    pathname: PropTypes.string,
  }).isRequired,
};

LeftMenuLink.defaultProps = {
  iconName: 'circle',
};

export default LeftMenuLink;
