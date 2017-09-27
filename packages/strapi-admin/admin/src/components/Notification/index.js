/**
 *
 * Notification
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import styles from './styles.scss';

class Notification extends React.Component { // eslint-disable-line react/prefer-stateless-function
  onCloseClicked = () => {
    this.props.onHideNotification(this.props.notification.id);
  };

  options = {
    success: {
      icon: 'fa-check',
      title: 'Success',
      class: 'notificationSuccess',
    },
    warning: {
      icon: 'fa-exclamation',
      title: 'Warning',
      class: 'notificationWarning',
    },
    error: {
      icon: 'fa-exclamation',
      title: 'Error',
      class: 'notificationError',
    },
    info: {
      icon: 'fa-info',
      title: 'Info',
      class: 'notificationInfo',
    },
  };

  render() {
    const options = this.options[this.props.notification.status] || this.options.info;

    return (
      <li key={this.props.notification.id} className={`${styles.notification} ${styles[options.class]}`}>
        <icon className={`fa ${options.icon} ${styles.notificationIcon}`}></icon>
        <div className={styles.notificationContent}>
          <p className={styles.notificationTitle}><FormattedMessage id={this.props.notification.message} /></p>
        </div>
        <icon className={`fa fa-close ${styles.notificationClose}`} onClick={this.onCloseClicked}></icon>
      </li>
    );
  }
}

Notification.propTypes = {
  notification: PropTypes.object.isRequired,
  onHideNotification: PropTypes.func.isRequired,
};

export default Notification;
