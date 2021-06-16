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

const LeftMenuLink = ({ to, icon, intlLabel, notificationsCount }) => {
  return (
    <Link to={to}>
      <LeftMenuIcon icon={icon} />
      {/* TODO change with new DS */}
      <FormattedMessage {...intlLabel}>
        {message => <LinkLabel>{message}</LinkLabel>}
      </FormattedMessage>
      {notificationsCount > 0 && <NotificationCount count={notificationsCount} />}
    </Link>
  );
};

LeftMenuLink.propTypes = {
  to: PropTypes.string.isRequired,
  icon: PropTypes.string,
  intlLabel: PropTypes.object.isRequired,
  notificationsCount: PropTypes.number,
};

LeftMenuLink.defaultProps = {
  icon: 'circle',
  notificationsCount: 0,
};

export default LeftMenuLink;
