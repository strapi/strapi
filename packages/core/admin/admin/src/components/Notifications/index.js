import { NotificationsProvider } from '@strapi/helper-plugin';
import React, { useReducer } from 'react';
import PropTypes from 'prop-types';
import { Box } from '@strapi/parts/Box';
import { Stack } from '@strapi/parts/Stack';
import Notification from './Notification';
import reducer, { initialState } from './reducer';
import NotificationsWrapper from './Wrapper';

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
      <NotificationsWrapper justifyContent="space-around">
        <Stack size={notifications.length}>
          {notifications.map(notification => {
            return (
              <Box key={notification.id} style={{ width: 500 }}>
                <Notification dispatch={dispatch} notification={notification} />
              </Box>
            );
          })}
        </Stack>
      </NotificationsWrapper>
      {children}
    </NotificationsProvider>
  );
};

Notifications.propTypes = {
  children: PropTypes.element.isRequired,
};

export default Notifications;
