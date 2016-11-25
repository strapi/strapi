/**
 *
 * App.react.js
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 * NOTE: while this component should technically be a stateless functional
 * component (SFC), hot reloading does not currently support SFCs. If hot
 * reloading is not a neccessity for you then you can refactor it and remove
 * the linting exception.
 */

import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { selectPlugins } from './selectors';
import { hideNotification } from 'containers/NotificationProvider/actions';
import { selectNotifications } from 'containers/NotificationProvider/selectors';
import NotificationsContainer from 'components/NotificationsContainer';
import '../../styles/main.scss';
import styles from './styles.scss';

export class App extends React.Component { // eslint-disable-line react/prefer-stateless-function

  static propTypes = {
    children: React.PropTypes.node,
  };

  render() {
    return (
      <div>
        <NotificationsContainer onHideNotification={this.props.onHideNotification} notifications={this.props.notifications}></NotificationsContainer>
        <div className={styles.container}>
          <div className={styles.baseline}></div>
          {React.Children.toArray(this.props.children)}
        </div>
      </div>
    );
  }
}

App.propTypes = {
  plugins: React.PropTypes.object,
  notifications: React.PropTypes.object,
  onHideNotification: React.PropTypes.func,
};

const mapStateToProps = createStructuredSelector({
  plugins: selectPlugins(),
  notifications: selectNotifications(),
});

function mapDispatchToProps(dispatch) {
  return {
    onHideNotification: (id) => { dispatch(hideNotification(id)); },
    dispatch,
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(App);
