import { createSelector } from 'reselect';

/**
 * Direct selector to the notificationProvider state domain
 */
const selectNotificationProviderDomain = () => state => state.get('notification');

/**
 * Other specific selectors
 */

/**
 * Default selector used by NotificationProvider
 */

const selectNotificationProvider = () =>
  createSelector(selectNotificationProviderDomain(), notificationProviderState =>
    notificationProviderState.toJS()
  );

const selectNotifications = () =>
  createSelector(selectNotificationProviderDomain(), notificationProviderState =>
    notificationProviderState.get('notifications')
  );

export default selectNotificationProvider;
export { selectNotificationProviderDomain, selectNotifications };
