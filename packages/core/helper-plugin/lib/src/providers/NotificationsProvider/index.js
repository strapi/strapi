/**
 *
 * NotificationsProvider
 *
 */
import React from 'react';
import PropTypes from 'prop-types';
import NotificationsContext from '../../contexts/NotificationsContext';

const NotificationsProvider = ({ children, toggleNotification }) => {
  return (
    <NotificationsContext.Provider value={{ toggleNotification }}>
      {children}
    </NotificationsContext.Provider>
  );
};

NotificationsProvider.propTypes = {
  children: PropTypes.node.isRequired,
  toggleNotification: PropTypes.func.isRequired,
};

export default NotificationsProvider;
