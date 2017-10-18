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

import HomePage from 'containers/HomePage';
import PluginPage from 'containers/PluginPage';
import ComingSoonPage from 'containers/ComingSoonPage';
import LeftMenu from 'containers/LeftMenu';
import Content from 'containers/Content';
import NotFoundPage from 'containers/NotFoundPage';

import { updatePlugin } from 'containers/App/actions';
import { selectPlugins } from 'containers/App/selectors';
import { hideNotification } from 'containers/NotificationProvider/actions';

import Header from 'components/Header/index';

import styles from './styles.scss';

export class AdminPage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  getChildContext = () => (
    {
      plugins: this.props.plugins,
      updatePlugin: this.props.updatePlugin,
    }
  )

  render() {
    return (
      <div className={styles.adminPage}>
        <LeftMenu plugins={this.props.plugins} />
        <div className={styles.adminPageRightWrapper}>
          <Header />
          <Content {...this.props}>
            <Switch>
              <Route path="/" component={HomePage} exact />
              <Route path="/plugins/:pluginId" component={PluginPage} />
              <Route path="/plugins" component={ComingSoonPage} />
              <Route path="/list-plugins" component={ComingSoonPage} exact />
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
