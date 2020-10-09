/**
 *
 * NotificationsContainer
 *
 */

import React from 'react';
import { useSelector } from 'react-redux';
import { CSSTransition } from 'react-transition-group';

import Notification from './Notification';
import NotificationsWrapper from './Wrapper';

const NotificationsContainer = () => {
  const notifications = useSelector(state => state.get('newNotification').notifications);

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
          <Notification notification={notification} />
        </CSSTransition>
      ))}
    </NotificationsWrapper>
  );
};

export default NotificationsContainer;
