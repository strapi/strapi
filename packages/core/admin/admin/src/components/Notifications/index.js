import { NotificationsProvider } from '@strapi/helper-plugin';
import React, { useReducer } from 'react';
import PropTypes from 'prop-types';
import { Stack } from '@strapi/design-system/Stack';
import Notification from './Notification';
import reducer, { initialState } from './reducer';

const Notifications = ({ children }) => {
  const [{ notifications }, dispatch] = useReducer(reducer, initialState);

  const displayNotification = config => {
    dispatch({
      type: 'SHOW_NOTIFICATION',
      config,
    });
  };

  return (
    <NotificationsProvider toggleNotification={displayNotification}>
      <Stack
        left="50%"
        marginLeft="-250px"
        position="fixed"
        size={2}
        top={`${46 / 16}rem`}
        width={`${500 / 16}rem`}
        zIndex={10}
      >
        {notifications.map(notification => {
          return (
            <Notification key={notification.id} dispatch={dispatch} notification={notification} />
          );
        })}
      </Stack>
      {children}
    </NotificationsProvider>
  );
};

Notifications.propTypes = {
  children: PropTypes.element.isRequired,
};

export default Notifications;
