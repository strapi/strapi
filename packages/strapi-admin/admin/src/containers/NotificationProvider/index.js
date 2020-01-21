/*
 *
 * NotificationProvider
 *
 */

/* eslint-disable */
import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import NotificationsContainer from '../../components/NotificationsContainer';
import { selectNotifications } from './selectors';
import { hideNotification } from './actions';

export class NotificationProvider extends React.Component {
  render() {
    return (
      <NotificationsContainer
        onHideNotification={this.props.onHideNotification}
        notifications={this.props.notifications}
      />
    );
  }
}

NotificationProvider.propTypes = {
  notifications: PropTypes.object.isRequired,
  onHideNotification: PropTypes.func.isRequired,
};

const mapStateToProps = createStructuredSelector({
  notifications: selectNotifications(),
});

function mapDispatchToProps(dispatch) {
  return {
    onHideNotification: id => {
      dispatch(hideNotification(id));
    },
    dispatch,
  };
}

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NotificationProvider);
