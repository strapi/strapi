import { NotificationsProvider } from '@strapi/helper-plugin';
import React, { useReducer } from 'react';
import PropTypes from 'prop-types';
import { Flex } from '@strapi/design-system';
import Notification from './Notification';
import reducer, { initialState } from './reducer';

const Notifications = ({ children }) => {
  const [{ notifications }, dispatch] = useReducer(reducer, initialState);

  const displayNotification = (config) => {
    dispatch({
      type: 'SHOW_NOTIFICATION',
      config,
    });
  };

  return (
    <NotificationsProvider toggleNotification={displayNotification}>
      <Flex
        left="50%"
        marginLeft="-250px"
        position="fixed"
        direction="column"
        alignItems="stretch"
        gap={2}
        top={`${46 / 16}rem`}
        width={`${500 / 16}rem`}
        zIndex={10}
      >
        {notifications.map((notification) => {
          return (
            <Notification key={notification.id} dispatch={dispatch} notification={notification} />
          );
        })}
      </Flex>
      {children}
    </NotificationsProvider>
  );
};

Notifications.propTypes = {
  children: PropTypes.element.isRequired,
};

export default Notifications;
