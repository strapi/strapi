/**
 *
 * LeftMenuLink
 *
 */

import React from 'react';
import PropTypes from 'prop-types';

import LeftMenuLinkContent from './LeftMenuLinkContent';

const LeftMenuLink = ({ destination, iconName, label, location, notificationsCount, search }) => {
  return (
    <LeftMenuLinkContent
      destination={destination}
      iconName={iconName}
      label={label}
      location={location}
      notificationsCount={notificationsCount}
      search={search}
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
  notificationsCount: PropTypes.number.isRequired,
  search: PropTypes.string,
};

LeftMenuLink.defaultProps = {
  iconName: 'circle',
  search: null,
};

export default LeftMenuLink;
