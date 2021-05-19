/**
 *
 * Admin
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { bindActionCreators, compose } from 'redux';
import { Switch, Route } from 'react-router-dom';
import { injectIntl } from 'react-intl';
import { isEmpty } from 'lodash';
// Components from @strapi/helper-plugin
import {
  difference,
  GlobalContextProvider,
  CheckPagePermissions,
  request,
  NotificationsContext,
} from '@strapi/helper-plugin';
import { checkLatestStrapiVersion } from '../../utils';

import adminPermissions from '../../permissions';
import Header from '../../components/Header/index';
import NavTopRightWrapper from '../../components/NavTopRightWrapper';
import LeftMenu from '../../components/LeftMenu';
import InstalledPluginsPage from '../InstalledPluginsPage';
import HomePage from '../HomePage';
import MarketplacePage from '../MarketplacePage';
import NotFoundPage from '../NotFoundPage';
import OnboardingVideos from '../../components/Onboarding';
import PermissionsManager from '../../components/PermissionsManager';
import PluginDispatcher from '../PluginDispatcher';
import ProfilePage from '../ProfilePage';
import SettingsPage from '../SettingsPage';
import Logout from './Logout';
import { getInfosDataSucceeded } from '../App/actions';
import makeSelecApp from '../App/selectors';
import { getStrapiLatestReleaseSucceeded, setAppError } from './actions';
import makeSelectAdmin from './selectors';
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
    this.initApp();
  }

  shouldComponentUpdate(prevProps, prevState) {
    return !isEmpty(difference(prevProps, this.props)) || !isEmpty(prevState, this.state);
  }

  /* istanbul ignore next */
  componentDidCatch(error, info) {
    /* eslint-disable */
    console.log('An error has occured');
    console.log('--------------------');
    console.log(error);
    console.log('Here is some infos');
    console.log(info);
    /* eslint-enable */

    // Display the error log component which is not designed yet
    this.props.setAppError();
  }

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

  fetchAppInfo = async () => {
    try {
      const { data } = await request('/admin/information', { method: 'GET' });

      this.props.getInfosDataSucceeded(data);
    } catch (err) {
      console.error(err);
      this.context.toggleNotification({
        type: 'warning',
        message: { id: 'notification.error' },
      });
    }
  };

  fetchStrapiLatestRelease = async () => {
    const {
      global: { strapiVersion },
      getStrapiLatestReleaseSucceeded,
    } = this.props;

    if (process.env.STRAPI_ADMIN_UPDATE_NOTIFICATION === 'true') {
      try {
        const {
          data: { tag_name },
        } = await axios.get('https://api.github.com/repos/strapi/strapi/releases/latest');
        const shouldUpdateStrapi = checkLatestStrapiVersion(strapiVersion, tag_name);

        getStrapiLatestReleaseSucceeded(tag_name, shouldUpdateStrapi);

        const showUpdateNotif = !JSON.parse(localStorage.getItem('STRAPI_UPDATE_NOTIF'));

        if (!showUpdateNotif) {
          return;
        }

        if (shouldUpdateStrapi) {
          this.context.toggleNotification({
            type: 'info',
            message: { id: 'notification.version.update.message' },
            link: {
              url: `https://github.com/strapi/strapi/releases/tag/${tag_name}`,
              label: {
                id: 'notification.version.update.link',
              },
            },
            blockTransition: true,
            onClose: () => localStorage.setItem('STRAPI_UPDATE_NOTIF', true),
          });
        }
      } catch (err) {
        // Silent
      }
    }
  };

  initApp = async () => {
    await this.fetchAppInfo();
    await this.fetchStrapiLatestRelease();
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
    const {
      admin: { shouldUpdateStrapi },
      global: { autoReload, currentEnvironment, strapiVersion },
      // FIXME
      intl: { formatMessage, locale },
      // FIXME
      plugins,
    } = this.props;

    return (
      <PermissionsManager>
        <GlobalContextProvider
          autoReload={autoReload}
          emitEvent={this.emitEvent}
          currentEnvironment={currentEnvironment}
          currentLocale={locale}
          formatMessage={formatMessage}
          plugins={plugins}
          shouldUpdateStrapi={shouldUpdateStrapi}
          strapiVersion={strapiVersion}
          updateMenu={this.state.updateMenu}
        >
          <Wrapper>
            <LeftMenu
              shouldUpdateStrapi={shouldUpdateStrapi}
              version={strapiVersion}
              plugins={plugins}
              setUpdateMenu={this.setUpdateMenu}
            />
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
      </PermissionsManager>
    );
  }
}

Admin.defaultProps = {
  intl: {
    formatMessage: () => {},
    locale: 'en',
  },
};

Admin.propTypes = {
  admin: PropTypes.shape({
    appError: PropTypes.bool,
    shouldUpdateStrapi: PropTypes.bool.isRequired,
  }).isRequired,
  getInfosDataSucceeded: PropTypes.func.isRequired,
  getStrapiLatestReleaseSucceeded: PropTypes.func.isRequired,
  global: PropTypes.shape({
    autoReload: PropTypes.bool,
    currentEnvironment: PropTypes.string,
    strapiVersion: PropTypes.string,
    uuid: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  }).isRequired,
  intl: PropTypes.shape({
    formatMessage: PropTypes.func,
    locale: PropTypes.string,
  }),
  plugins: PropTypes.object.isRequired,
  setAppError: PropTypes.func.isRequired,
};

const mapStateToProps = createStructuredSelector({
  admin: makeSelectAdmin(),
  global: makeSelecApp(),
});

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      getInfosDataSucceeded,
      getStrapiLatestReleaseSucceeded,
      setAppError,
    },
    dispatch
  );
}

const withConnect = connect(mapStateToProps, mapDispatchToProps);

export default compose(injectIntl, withConnect)(Admin);
