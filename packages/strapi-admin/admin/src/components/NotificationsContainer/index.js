/**
*
* NotificationsContainer
*
*/

import PropTypes from 'prop-types';
import Notification from 'components/Notification';

import styles from './styles.scss';

const { CSSTransition, TransitionGroup } = ReactTransitionGroup;

class NotificationsContainer extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    if (this.props.notifications.length === 0) {
      return (false);
    }

    const notifications = this.props.notifications.map((notification, i) => (
      <CSSTransition
        key={i}
        classNames="notification"
        timeout={{
          enter: 500,
          exit: 300,
        }}
      >
        <Notification
          key={notification.id}
          onHideNotification={this.props.onHideNotification}
          notification={notification}
        />
      </CSSTransition>
    ));

    return (
      <TransitionGroup className={styles.notificationsContainer}>
        {notifications}
      </TransitionGroup>
    );
  }
}

NotificationsContainer.propTypes = {
  notifications: PropTypes.object.isRequired,
  onHideNotification: PropTypes.func.isRequired,
};

export default NotificationsContainer;
