/*
 * AdminPage
 *
 * This is the first thing users see of our AdminPage, at the '/' route
 *
 * NOTE: while this component should technically be a stateless functional
 * component (SFC), hot reloading does not currently support SFCs. If hot
 * reloading is not a neccessity for you then you can refactor it and remove
 * the linting exception.
 */

import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { Switch, Route } from 'react-router-dom';

import HomePage from 'containers/HomePage';
import PluginPage from 'containers/PluginPage';
import ComingSoonPage from 'containers/ComingSoonPage';
import LeftMenu from 'containers/LeftMenu';
import Content from 'containers/Content';
import NotFoundPage from 'containers/NotFoundPage';

import { selectPlugins } from 'containers/App/selectors';
import { hideNotification } from 'containers/NotificationProvider/actions';

import Header from 'components/Header/index';

import styles from './syles.scss';

export class AdminPage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.adminPage}>
        <LeftMenu plugins={this.props.plugins} />
        <div className={styles.adminPageRightWrapper}>
          <Header />
          <Content {...this.props}>
            <Switch>
              <Route path="/admin" component={HomePage} exact />
              <Route path="/admin/plugins" component={PluginPage} />
              <Route path="/admin/list-plugins" component={ComingSoonPage} exact />
              <Route path="/admin/install-plugin" component={ComingSoonPage} exact />
              <Route path="/admin/configuration" component={ComingSoonPage} exact />
              <Route path="" component={NotFoundPage} />
            </Switch>
          </Content>
        </div>
      </div>
    );
  }
}

AdminPage.contextTypes = {
  router: React.PropTypes.object.isRequired,
};

AdminPage.propTypes = {
  plugins: React.PropTypes.object.isRequired,
};

const mapStateToProps = createStructuredSelector({
  plugins: selectPlugins(),
});

function mapDispatchToProps(dispatch) {
  return {
    onHideNotification: (id) => { dispatch(hideNotification(id)); },
    dispatch,
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(AdminPage);
