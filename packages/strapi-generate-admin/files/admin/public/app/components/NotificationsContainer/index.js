/**
*
* NotificationsContainer
*
*/

import React from 'react';
import ReactCSSTransitionGroup from 'react/lib/ReactCSSTransitionGroup';
import Notification from 'components/Notification';

import styles from './styles.scss';

class NotificationsContainer extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    let notifications;

    if (this.props.notifications) {
      notifications = this.props.notifications.map((notification) => (
        <Notification
          key={notification.id}
          onHideNotification={this.props.onHideNotification}
          notification={notification}
        />));
    }

    return (
      <ul className={styles.notificationsContainer}>
        <ReactCSSTransitionGroup
          transitionName="notification"
          transitionEnterTimeout={0}
          transitionLeaveTimeout={0}
        >
          {notifications}
        </ReactCSSTransitionGroup>
      </ul>
    );
  }
}

NotificationsContainer.propTypes = {
  notifications: React.PropTypes.object,
  onHideNotification: React.PropTypes.func,
};

export default NotificationsContainer;
