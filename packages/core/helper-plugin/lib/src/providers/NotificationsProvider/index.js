/**
 *
 * NotificationsProvider
 *
 */
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import NotificationsContext from '../../contexts/NotificationsContext';

const NotificationsProvider = ({ children, toggleNotification }) => {
  const notificationValue = useMemo(() => ({ toggleNotification }), [toggleNotification]);

  return (
    <NotificationsContext.Provider value={notificationValue}>
      {children}
    </NotificationsContext.Provider>
  );
};

NotificationsProvider.propTypes = {
  children: PropTypes.node.isRequired,
  toggleNotification: PropTypes.func.isRequired,
};

export default NotificationsProvider;
