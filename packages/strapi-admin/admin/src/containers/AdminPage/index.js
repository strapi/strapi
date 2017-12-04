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
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { Switch, Route } from 'react-router-dom';
import { get, includes, isFunction, isUndefined, map, omit } from 'lodash';

import { pluginLoaded, updatePlugin } from 'containers/App/actions';
import { selectPlugins } from 'containers/App/selectors';
import { hideNotification } from 'containers/NotificationProvider/actions';

// Design
import ComingSoonPage from 'containers/ComingSoonPage';
import Content from 'containers/Content';
import Header from 'components/Header/index';
import HomePage from 'containers/HomePage';
import InstallPluginPage from 'containers/InstallPluginPage';
import LeftMenu from 'containers/LeftMenu';
import ListPluginsPage from 'containers/ListPluginsPage';
import Logout from 'components/Logout';
import NotFoundPage from 'containers/NotFoundPage';
import PluginPage from 'containers/PluginPage';

import auth from 'utils/auth';

import styles from './styles.scss';

export class AdminPage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  state = { hasAlreadyRegistereOtherPlugins: false };

  getChildContext = () => (
    {
      plugins: this.props.plugins,
      updatePlugin: this.props.updatePlugin,
    }
  );

  componentDidMount() {
    this.checkLogin(this.props);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.location.pathname !== this.props.location.pathname) {
      this.checkLogin(nextProps);
    }
  }

  checkLogin = (props) => {
    if (this.hasUsersPlugin() && this.isUrlProtected(props) && !auth.getToken()) {
      const endPoint = this.hasAdminUser() ? 'login': 'register';
      this.props.history.push(`/plugins/users-permissions/auth/${endPoint}`);
    }

    // if (!this.isUrlProtected(props) && includes(props.location.pathname, 'login') && !this.hasAdminUser()) {
    //   this.props.history.push('/plugins/users-permissions/auth/register');
    // }

    if (!this.isUrlProtected(props) && includes(props.location.pathname, 'register') && this.hasAdminUser()) {
      this.props.history.push('/plugins/users-permissions/auth/login');
    }

    if (!this.hasUsersPlugin() || auth.getToken() && !this.state.hasAlreadyRegistereOtherPlugins) {
      map(omit(this.props.plugins.toJS(), ['users-permissions', 'email']), plugin => {
        if (isFunction(plugin.bootstrap)) {
          plugin.bootstrap(plugin)
            .then(updatedPlugin => this.props.pluginLoaded(updatedPlugin))
            .catch(err => {
              console.log(err);
            });
        }
      });

      this.setState({ hasAlreadyRegistereOtherPlugins: true });
    }
  }

  hasUsersPlugin = () => !isUndefined(get(this.props.plugins.toJS(), 'users-permissions'));

  hasAdminUser = () => get(this.props.plugins.toJS(), ['users-permissions', 'hasAdminUser']);

  isUrlProtected = (props) => !includes(props.location.pathname, get(this.props.plugins.toJS(), ['users-permissions', 'nonProtectedUrl']));

  showLeftMenu = () => !includes(this.props.location.pathname, get(this.props.plugins.toJS(), ['users-permissions', 'nonProtectedUrl']));

  render() {
    const leftMenu = this.showLeftMenu() ? <LeftMenu plugins={this.props.plugins} /> : '';
    const header = this.showLeftMenu() ? <Header /> : '';
    const style = this.showLeftMenu() ? {} : { width: '100%' };

    return (
      <div className={styles.adminPage}>
        {leftMenu}
        { auth.getToken() && this.hasUsersPlugin() && this.isUrlProtected(this.props) ? (
          <Logout />
        ) : ''}
        <div className={styles.adminPageRightWrapper} style={style}>
          {header}
          <Content {...this.props} showLeftMenu={this.showLeftMenu()}>
            <Switch>
              <Route path="/" component={HomePage} exact />
              <Route path="/plugins/:pluginId" component={PluginPage} />
              <Route path="/plugins" component={ComingSoonPage} />
              <Route path="/list-plugins" component={ListPluginsPage} exact />
              <Route path="/install-plugin" component={InstallPluginPage} exact />
              <Route path="/configuration" component={ComingSoonPage} exact />
              <Route path="" component={NotFoundPage} />
            </Switch>
          </Content>
        </div>
      </div>
    );
  }
}

AdminPage.childContextTypes = {
  plugins: PropTypes.object,
  updatePlugin: PropTypes.func,
};

AdminPage.contextTypes = {
  router: PropTypes.object.isRequired,
};

AdminPage.propTypes = {
  history: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired,
  pluginLoaded: PropTypes.func.isRequired,
  plugins: PropTypes.object.isRequired,
  updatePlugin: PropTypes.func.isRequired,
};

const mapStateToProps = createStructuredSelector({
  plugins: selectPlugins(),
});

function mapDispatchToProps(dispatch) {
  return {
    onHideNotification: (id) => { dispatch(hideNotification(id)); },
    updatePlugin: (pluginId, updatedKey, updatedValue) => { dispatch(updatePlugin(pluginId, updatedKey, updatedValue)); },
    pluginLoaded: (plugin) => { dispatch(pluginLoaded(plugin)); },
    dispatch,
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(AdminPage);
