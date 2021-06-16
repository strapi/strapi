/**
 *
 * LeftMenuLink
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import LinkLabel from './LinkLabel';
import Link from './Link';
import LeftMenuIcon from './LeftMenuIcon';
import NotificationCount from './NotificationCount';

const LeftMenuLink = ({ destination, iconName, label, notificationsCount }) => {
  return (
    <Link to={destination}>
      <LeftMenuIcon icon={iconName} />
      {/* TODO change with new DS */}
      <FormattedMessage {...label}>{message => <LinkLabel>{message}</LinkLabel>}</FormattedMessage>
      {notificationsCount > 0 && <NotificationCount count={notificationsCount} />}
    </Link>
  );
};

LeftMenuLink.propTypes = {
  destination: PropTypes.string.isRequired,
  iconName: PropTypes.string,
  label: PropTypes.object.isRequired,
  notificationsCount: PropTypes.number.isRequired,
};

LeftMenuLink.defaultProps = {
  iconName: 'circle',
};

export default LeftMenuLink;
