/**
 *
 * Notifications
 *
 */

import React from 'react';
import ReactCSSTransitionGroup from 'react/lib/ReactCSSTransitionGroup';


import styles from './styles.scss';

class Notifications extends React.Component { // eslint-disable-line react/prefer-stateless-function
  options = {
    success: {
      icon: 'ion-ios-checkmark-outline',
      title: 'Success',
      class: 'notificationSuccess',
    },
    warning: {
      icon: 'ion-ios-information-outline',
      title: 'Warning',
      class: 'notificationWarning',
    },
    error: {
      icon: 'ion-ios-close-outline',
      title: 'Error',
      class: 'notificationError',
    },
    info: {
      icon: 'ion-ios-information-outline',
      title: 'Info',
      class: 'notificationInfo',
    },
  };

  render() {
    const self = this;
    const notifications = this.props.notifications && this.props.notifications.map((notification, i) => {
        const options = self.options[notification.status] || self.options['info'];
        return <li key={notification.id} className={`${styles.notification} ${styles[options.class]}`}>
          <icon className={`ion ${options.icon} ${styles.notificationIcon}`}></icon>
          <p className={styles.notificationContent}>
            <span className={styles.notificationTitle}>{options.title}: </span>
            <span>{notification.message}</span>
          </p>
          <icon className={`ion ion-ios-close-empty pull-right ${styles.notificationClose}`}  onClick={this.props.onHideNotification.bind(this, notification.id)}></icon>
        </li>;
      });

    return (
      <ul className={styles.notifications}>
        <ReactCSSTransitionGroup
          transitionName="notification"
          transitionEnterTimeout={0}
          transitionLeaveTimeout={0}>
          {notifications}
        </ReactCSSTransitionGroup>
      </ul>
    );
  }
}

Notifications.propTypes = {
  notifications: React.PropTypes.object,
  onHideNotification: React.PropTypes.func,
};

export default Notifications;
