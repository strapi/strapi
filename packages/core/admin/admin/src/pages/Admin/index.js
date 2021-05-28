/**
 *
 * Admin
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { Switch, Route } from 'react-router-dom';
import { isEmpty } from 'lodash';
// Components from @strapi/helper-plugin
import {
  difference,
  GlobalContextProvider,
  CheckPagePermissions,
  NotificationsContext,
} from '@strapi/helper-plugin';
import adminPermissions from '../../permissions';
import Header from '../../components/Header/index';
import NavTopRightWrapper from '../../components/NavTopRightWrapper';
import LeftMenu from '../../components/LeftMenu';
import InstalledPluginsPage from '../InstalledPluginsPage';
import HomePage from '../HomePage';
import MarketplacePage from '../MarketplacePage';
import NotFoundPage from '../NotFoundPage';
import OnboardingVideos from '../../components/Onboarding';
import PluginDispatcher from '../PluginDispatcher';
import ProfilePage from '../ProfilePage';
import SettingsPage from '../SettingsPage';
import Logout from './Logout';

import Wrapper from './Wrapper';
import Content from './Content';

export class Admin extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  static contextType = NotificationsContext;

  // This state is really temporary until we create a menu API
  state = { updateMenu: null };

  helpers = {};

  componentDidMount() {
    this.emitEvent('didAccessAuthenticatedAdministration');
  }

  shouldComponentUpdate(prevProps, prevState) {
    return !isEmpty(difference(prevProps, this.props)) || !isEmpty(prevState, this.state);
  }

  // FIXME
  // use the hook when migration to functionnal component
  emitEvent = async (event, properties) => {
    const {
      global: { uuid },
    } = this.props;

    if (uuid) {
      try {
        await axios.post('https://analytics.strapi.io/track', {
          event,
          // PROJECT_TYPE is an env variable defined in the webpack config
          // eslint-disable-next-line no-undef
          properties: { ...properties, projectType: process.env.STRAPI_ADMIN_PROJECT_TYPE },
          uuid,
        });
      } catch (err) {
        // Silent
      }
    }
  };

  renderPluginDispatcher = props => {
    // NOTE: Send the needed props instead of everything...

    return <PluginDispatcher {...this.props} {...props} {...this.helpers} />;
  };

  renderRoute = (props, Component) => <Component {...this.props} {...props} />;

  setUpdateMenu = updateMenuFn => {
    this.setState({ updateMenu: updateMenuFn });
  };

  render() {
    const { plugins } = this.props;

    return (
      <GlobalContextProvider updateMenu={this.state.updateMenu}>
        <Wrapper>
          <LeftMenu plugins={plugins} setUpdateMenu={this.setUpdateMenu} />
          <NavTopRightWrapper>
            {/* Injection zone not ready yet */}
            <Logout />
          </NavTopRightWrapper>
          <div className="adminPageRightWrapper">
            <Header />
            <Content>
              <Switch>
                <Route path="/" render={props => this.renderRoute(props, HomePage)} exact />
                <Route path="/me" component={ProfilePage} />
                <Route path="/plugins/:pluginId" render={this.renderPluginDispatcher} />
                <Route path="/list-plugins" exact>
                  <CheckPagePermissions permissions={adminPermissions.marketplace.main}>
                    <InstalledPluginsPage />
                  </CheckPagePermissions>
                </Route>
                <Route path="/marketplace">
                  <CheckPagePermissions permissions={adminPermissions.marketplace.main}>
                    <MarketplacePage />
                  </CheckPagePermissions>
                </Route>
                <Route path="/settings/:settingId" component={SettingsPage} />
                <Route path="/settings" component={SettingsPage} exact />
                <Route key="7" path="" component={NotFoundPage} />
                <Route key="8" path="/404" component={NotFoundPage} />
              </Switch>
            </Content>
          </div>

          {process.env.STRAPI_ADMIN_SHOW_TUTORIALS === 'true' && <OnboardingVideos />}
        </Wrapper>
      </GlobalContextProvider>
    );
  }
}

// TODO
Admin.defaultProps = {
  global: {
    uuid: false,
  },
};

Admin.propTypes = {
  global: PropTypes.shape({
    uuid: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  }),

  plugins: PropTypes.object.isRequired,
};

export default Admin;
