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
// Components from strapi-helper-plugin
import {
  difference,
  GlobalContextProvider,
  LoadingIndicatorPage,
  OverlayBlocker,
} from 'strapi-helper-plugin';
import { SETTINGS_BASE_URL, SHOW_TUTORIALS } from '../../config';

import Header from '../../components/Header/index';
import Logout from '../../components/Logout';
import NavTopRightWrapper from '../../components/NavTopRightWrapper';
import LeftMenu from '../LeftMenu';
import InstalledPluginsPage from '../InstalledPluginsPage';
import LocaleToggle from '../LocaleToggle';
import HomePage from '../HomePage';
import MarketplacePage from '../MarketplacePage';
import NotFoundPage from '../NotFoundPage';
import OnboardingVideos from '../Onboarding';
import SettingsPage from '../SettingsPage';
import PluginDispatcher from '../PluginDispatcher';
import {
  disableGlobalOverlayBlocker,
  enableGlobalOverlayBlocker,
  updatePlugin,
} from '../App/actions';
import makeSelecApp from '../App/selectors';
import injectReducer from '../../utils/injectReducer';
import { setAppError } from './actions';
import makeSelectAdmin from './selectors';
import reducer from './reducer';
import Wrapper from './Wrapper';
import Content from './Content';

export class Admin extends React.Component {
  // eslint-disable-line react/prefer-stateless-function

  helpers = {
    updatePlugin: this.props.updatePlugin,
  };

  componentDidMount() {
    this.emitEvent('didAccessAuthenticatedAdministration');
  }

  shouldComponentUpdate(prevProps) {
    return !isEmpty(difference(prevProps, this.props));
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
          properties,
          uuid,
        });
      } catch (err) {
        // Silent
      }
    }
  };

  hasApluginNotReady = props => {
    const {
      global: { plugins },
    } = props;

    return !Object.keys(plugins).every(plugin => plugins[plugin].isReady === true);
  };

  /**
   * Display the app loader until the app is ready
   * @returns {Boolean}
   */
  showLoader = () => {
    return this.hasApluginNotReady(this.props);
  };

  renderInitializers = () => {
    const {
      global: { plugins },
    } = this.props;

    return Object.keys(plugins).reduce((acc, current) => {
      const InitializerComponent = plugins[current].initializer;
      const key = plugins[current].id;

      acc.push(<InitializerComponent key={key} {...this.props} {...this.helpers} />);

      return acc;
    }, []);
  };

  renderPluginDispatcher = props => {
    // NOTE: Send the needed props instead of everything...

    return <PluginDispatcher {...this.props} {...props} {...this.helpers} />;
  };

  renderRoute = (props, Component) => <Component {...this.props} {...props} />;

  render() {
    const {
      global: {
        autoReload,
        blockApp,
        currentEnvironment,
        overlayBlockerData,
        plugins,
        showGlobalAppBlocker,
        strapiVersion,
      },
      disableGlobalOverlayBlocker,
      enableGlobalOverlayBlocker,
      intl: { formatMessage, locale },
      updatePlugin,
    } = this.props;

    // We need the admin data in order to make the initializers work
    if (this.showLoader()) {
      return (
        <>
          {this.renderInitializers()}
          <LoadingIndicatorPage />
        </>
      );
    }

    return (
      <GlobalContextProvider
        autoReload={autoReload}
        emitEvent={this.emitEvent}
        currentEnvironment={currentEnvironment}
        currentLocale={locale}
        disableGlobalOverlayBlocker={disableGlobalOverlayBlocker}
        enableGlobalOverlayBlocker={enableGlobalOverlayBlocker}
        formatMessage={formatMessage}
        plugins={plugins}
        settingsBaseURL={SETTINGS_BASE_URL || '/settings'}
        updatePlugin={updatePlugin}
      >
        <Wrapper>
          <LeftMenu version={strapiVersion} plugins={plugins} />
          <NavTopRightWrapper>
            {/* Injection zone not ready yet */}
            <Logout />
            <LocaleToggle isLogged />
          </NavTopRightWrapper>
          <div className="adminPageRightWrapper">
            <Header />
            <Content>
              <Switch>
                <Route path="/" render={props => this.renderRoute(props, HomePage)} exact />
                <Route path="/plugins/:pluginId" render={this.renderPluginDispatcher} />
                <Route
                  path="/list-plugins"
                  render={props => this.renderRoute(props, InstalledPluginsPage)}
                  exact
                />
                <Route
                  path="/marketplace"
                  render={props => this.renderRoute(props, MarketplacePage)}
                />
                <Route
                  path={`${SETTINGS_BASE_URL || '/settings'}/:settingId`}
                  render={props => this.renderRoute(props, SettingsPage)}
                />
                <Route
                  path={SETTINGS_BASE_URL || '/settings'}
                  render={props => this.renderRoute(props, SettingsPage)}
                  exact
                />
                <Route key="7" path="" component={NotFoundPage} />
                <Route key="8" path="404" component={NotFoundPage} />
              </Switch>
            </Content>
          </div>
          <OverlayBlocker
            key="overlayBlocker"
            isOpen={blockApp && showGlobalAppBlocker}
            {...overlayBlockerData}
          />
          {SHOW_TUTORIALS && <OnboardingVideos />}
        </Wrapper>
      </GlobalContextProvider>
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
  }).isRequired,
  disableGlobalOverlayBlocker: PropTypes.func.isRequired,
  enableGlobalOverlayBlocker: PropTypes.func.isRequired,
  global: PropTypes.shape({
    autoReload: PropTypes.bool,
    blockApp: PropTypes.bool,
    currentEnvironment: PropTypes.string,
    overlayBlockerData: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
    plugins: PropTypes.object,
    showGlobalAppBlocker: PropTypes.bool,
    strapiVersion: PropTypes.string,
    uuid: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  }).isRequired,
  intl: PropTypes.shape({
    formatMessage: PropTypes.func,
    locale: PropTypes.string,
  }),
  location: PropTypes.object.isRequired,
  setAppError: PropTypes.func.isRequired,
  updatePlugin: PropTypes.func.isRequired,
};

const mapStateToProps = createStructuredSelector({
  admin: makeSelectAdmin(),
  global: makeSelecApp(),
});

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      disableGlobalOverlayBlocker,
      enableGlobalOverlayBlocker,
      setAppError,
      updatePlugin,
    },
    dispatch
  );
}

const withConnect = connect(mapStateToProps, mapDispatchToProps);
const withReducer = injectReducer({ key: 'admin', reducer });

export default compose(injectIntl, withReducer, withConnect)(Admin);
