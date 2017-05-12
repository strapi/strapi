/**
*
* Notification
*
*/

import React from 'react';

import styles from './styles.scss';

class Notification extends React.Component { // eslint-disable-line react/prefer-stateless-function
  onCloseClicked = () => {
    this.props.onHideNotification(this.props.notification.id);
  };

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
    const options = this.options[this.props.notification.status] || this.options.info;

    return (
      <li key={this.props.notification.id} className={`${styles.notification} ${styles[options.class]}`}>
        <icon className={`ion ${options.icon} ${styles.notificationIcon}`}></icon>
        <p className={styles.notificationContent}>
          <span className={styles.notificationTitle}>{options.title}: </span>
          <span>{this.props.notification.message}</span>
        </p>
        <icon className={`ion ion-ios-close-empty pull-right ${styles.notificationClose}`} onClick={this.onCloseClicked}></icon>
      </li>
    );
  }
}

Notification.propTypes = {
  notification: React.PropTypes.object,
  onHideNotification: React.PropTypes.func,
};

export default Notification;
