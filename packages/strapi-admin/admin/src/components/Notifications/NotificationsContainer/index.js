/**
 *
 * NotificationsContainer
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { CSSTransition } from 'react-transition-group';

import Notification from '../Notification';
import NotificationsWrapper from './NotificationsWrapper';

const NotificationsContainer = ({ notifications, onHideNotification }) => {
  if (notifications.length === 0) {
    return null;
  }

  return (
    <NotificationsWrapper>
      {notifications.map(notification => (
        <CSSTransition
          key={notification.id}
          classNames="notification"
          timeout={{
            enter: 500,
            exit: 300,
          }}
        >
          <Notification notification={notification} onHideNotification={onHideNotification} />
        </CSSTransition>
      ))}
    </NotificationsWrapper>
  );
};

NotificationsContainer.defaultProps = {
  notifications: [
    {
      id: 1,
      message: 'app.utils.defaultMessage',
      title: null,
      link: null,
      type: 'success',
    },
  ],
};

NotificationsContainer.propTypes = {
  notifications: PropTypes.oneOfType([PropTypes.object, PropTypes.array]),
  onHideNotification: PropTypes.func.isRequired,
};

export default NotificationsContainer;
