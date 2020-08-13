/**
 *
 * Notification
 *
 */
/* eslint-disable */
import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { isObject } from 'lodash';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Remove } from '@buffetjs/icons';
import Li, { GlobalNotification } from './Li';

class Notification extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  handleCloseClicked = () => {
    this.props.onHideNotification(this.props.notification.id);
  };

  options = {
    success: {
      icon: 'check',
      title: 'Success',
      class: 'notificationSuccess',
    },
    warning: {
      icon: 'exclamation',
      title: 'Warning',
      class: 'notificationWarning',
    },
    error: {
      icon: 'exclamation',
      title: 'Error',
      class: 'notificationError',
    },
    info: {
      icon: 'info',
      title: 'Info',
      class: 'notificationInfo',
    },
  };

  render() {
    const options = this.options[this.props.notification.status] || this.options.info;
    const {
      notification: { message },
    } = this.props;
    const content =
      isObject(message) && message.id ? (
        <FormattedMessage id={message.id} defaultMessage={message.id} values={message.values} />
      ) : (
        <FormattedMessage id={message} defaultMessage={message} />
      );

    return (
      <>
        <GlobalNotification />
        <Li
          key={this.props.notification.id}
          className={`${options.class}`}
          onClick={this.handleCloseClicked}
        >
          <div className={`notificationIcon`}>
            <div>
              <FontAwesomeIcon icon={options.icon} />
            </div>
          </div>
          <div className="notificationContent">
            <p className="notificationTitle">{content}</p>
          </div>
          <div className={`notificationClose`}>
            <Remove onClick={this.handleCloseClicked} />
          </div>
        </Li>
      </>
    );
  }
}

Notification.defaultProps = {
  notification: {
    id: 1,
    message: 'app.utils.defaultMessage',
    status: 'success',
  },
};

Notification.propTypes = {
  notification: PropTypes.shape({
    id: PropTypes.number,
    message: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.shape({
        id: PropTypes.string,
        values: PropTypes.object,
      }),
    ]),
    status: PropTypes.string,
  }),
  onHideNotification: PropTypes.func.isRequired,
};

export default Notification;
