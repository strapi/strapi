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
import { get, includes, isUndefined } from 'lodash';

import { updatePlugin } from 'containers/App/actions';
import { selectPlugins } from 'containers/App/selectors';
import { hideNotification } from 'containers/NotificationProvider/actions';

// Design
import HomePage from 'containers/HomePage';
import PluginPage from 'containers/PluginPage';
import ComingSoonPage from 'containers/ComingSoonPage';
import LeftMenu from 'containers/LeftMenu';
import ListPluginsPage from 'containers/ListPluginsPage';
import Content from 'containers/Content';
import NotFoundPage from 'containers/NotFoundPage';
import Header from 'components/Header/index';

import auth from 'utils/auth';

import styles from './styles.scss';

export class AdminPage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  getChildContext = () => (
    {
      plugins: this.props.plugins,
      updatePlugin: this.props.updatePlugin,
    }
  );

  componentDidMount() {
    if (this.hasUsersPlugin() && this.isUrlProtected(this.props) && !auth.getToken()) {
      this.props.history.push('/plugins/users-permissions/auth/login');
    }
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.location.pathname !== this.props.location.pathname) {
      if (this.hasUsersPlugin() && this.isUrlProtected(nextProps) && !auth.getToken()) {
        this.props.history.push('/plugins/users-permissions/auth/login');
      }
    }
  }

  hasUsersPlugin = () => !isUndefined(get(this.props.plugins.toJS(), 'users-permissions'));

  isUrlProtected = (props) => !includes(props.location.pathname, '/plugins/users-permissions/auth');

  showLeftMenu = () => !includes(this.props.location.pathname, '/plugins/users-permissions/auth');

  render() {
    const leftMenu = this.showLeftMenu() ? <LeftMenu plugins={this.props.plugins} /> : '';
    const header = this.showLeftMenu() ? <Header /> : '';
    const style = this.showLeftMenu() ? {} : { width: '100%' };

    return (
      <div className={styles.adminPage}>
        {leftMenu}
        <div className={styles.adminPageRightWrapper} style={style}>
          {header}
          <Content {...this.props} showLeftMenu={this.showLeftMenu()}>
            <Switch>
              <Route path="/" component={HomePage} exact />
              <Route path="/plugins/:pluginId" component={PluginPage} />
              <Route path="/plugins" component={ComingSoonPage} />
              <Route path="/list-plugins" component={ListPluginsPage} exact />
              <Route path="/install-plugin" component={ComingSoonPage} exact />
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
    dispatch,
  };
}

export default connect(mapStateToProps, mapDispatchToProps)(AdminPage);
