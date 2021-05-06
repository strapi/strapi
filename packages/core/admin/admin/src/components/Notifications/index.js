import React, { useEffect, useReducer } from 'react';
import { CSSTransition } from 'react-transition-group';

import Notification from './Notification';
import reducer, { initialState } from './reducer';
import NotificationsWrapper from './Wrapper';

const Notifications = () => {
  const [{ notifications }, dispatch] = useReducer(reducer, initialState);

  const displayNotification = config => {
    dispatch({
      type: 'SHOW_NOTIFICATION',
      config,
    });
  };

  useEffect(() => {
    window.strapi = Object.assign(window.strapi || {}, {
      notification: {
        toggle: config => {
          displayNotification(config);
        },
      },
    });
  }, []);

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
          <Notification dispatch={dispatch} notification={notification} />
        </CSSTransition>
      ))}
    </NotificationsWrapper>
  );
};

export default Notifications;
