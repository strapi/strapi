/**
 *
 * useNotification
 *
 */

import { useContext, useRef } from 'react';
import NotificationsContext from '../../contexts/NotificationsContext';

const useNotification = () => {
  const { toggleNotification } = useContext(NotificationsContext);
  // Use a ref so we can safely add the toggleNotification
  // to a hook dependencies array
  const toggleNotificationRef = useRef(toggleNotification);

  return toggleNotificationRef.current;
};

export default useNotification;
