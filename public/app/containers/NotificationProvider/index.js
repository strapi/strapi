/*
 *
 * NotificationProvider
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import selectNotificationProvider from './selectors';

export class NotificationProvider extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div>
        {React.Children.only(this.props.children)}
      </div>
    );
  }
}

NotificationProvider.propTypes = {
  children: React.PropTypes.object,
};

const mapStateToProps = selectNotificationProvider();

function mapDispatchToProps(dispatch) {
  return {
    dispatch,
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(NotificationProvider);
