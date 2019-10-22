/**
 *
 * NotificationsContainer
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { CSSTransition } from 'react-transition-group';

import Notification from '../Notification';
import Wrapper from './Wrapper';

const NotificationsContainer = ({ notifications, onHideNotification }) => {
  if (notifications.length === 0) {
    return false;
  }

  const notifs = notifications.map((notification, i) => (
    <CSSTransition
      key={i}
      classNames="notification"
      timeout={{
        enter: 500,
        exit: 300,
      }}
    >
      <Notification
        key={notification.id}
        onHideNotification={onHideNotification}
        notification={notification}
      />
    </CSSTransition>
  ));

  return <Wrapper>{notifs}</Wrapper>;
};

NotificationsContainer.defaultProps = {
  notifications: [
    {
      id: 1,
      message: 'app.utils.defaultMessage',
      status: 'success',
    },
  ],
};

NotificationsContainer.propTypes = {
  notifications: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  onHideNotification: PropTypes.func.isRequired,
};

export default NotificationsContainer;
