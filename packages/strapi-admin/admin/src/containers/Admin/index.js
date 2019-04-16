/**
 *
 * Admin
 *
 */

import React from 'react';
import ReactGA from 'react-ga';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { bindActionCreators, compose } from 'redux';
import { Switch, Route } from 'react-router-dom';

// Components from strapi-helper-plugin
import {
  LoadingIndicatorPage,
  OverlayBlocker,
  injectHooks,
} from 'strapi-helper-plugin';
// import OverlayBlocker from 'components/OverlayBlocker';

// import injectHooks from 'utils/injectHooks';

import Header from '../../components/Header/index';
import Logout from '../../components/Logout';

import ComingSoonPage from '../ComingSoonPage';
import LeftMenu from '../LeftMenu';
import ListPluginsPage from '../ListPluginsPage';
import LocaleToggle from '../LocaleToggle';
import HomePage from '../HomePage';
import Marketplace from '../Marketplace';
import NotFoundPage from '../NotFoundPage';
import Onboarding from '../Onboarding';
import PluginDispatcher from '../PluginDispatcher';

import {
  disableGlobalOverlayBlocker,
  enableGlobalOverlayBlocker,
  updatePlugin,
} from '../App/actions';
import makeSelecApp from '../App/selectors';

import injectSaga from '../../utils/injectSaga';
import injectReducer from '../../utils/injectReducer';

import localeToggleReducer from '../LocaleToggle/reducer';
import {
  resetLocaleDefaultClassName,
  setLocaleCustomClassName,
} from '../LocaleToggle/actions';

import {
  emitEvent,
  getInitData,
  getSecuredData,
  hideLeftMenu,
  hideLogout,
  setAppError,
  setAppSecured,
  showLeftMenu,
  showLogout,
  unsetAppSecured,
} from './actions';
import makeSelectAdmin from './selectors';
import reducer from './reducer';
import saga from './saga';

import NavTopRightWrapper from './NavTopRightWrapper';

import styles from './styles.scss';

export class Admin extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  state = { shouldSecureAfterAllPluginsAreMounted: true };

  getChildContext = () => ({
    emitEvent: this.props.emitEvent,
    currentEnvironment: this.props.admin.currentEnvironment,
    disableGlobalOverlayBlocker: this.props.disableGlobalOverlayBlocker,
    enableGlobalOverlayBlocker: this.props.enableGlobalOverlayBlocker,
    plugins: this.props.global.plugins,
    updatePlugin: this.props.updatePlugin,
  });

  componentDidMount() {
    // Initialize Google Analytics
    // Refer to ../../../doc/disable-tracking.md for more informations
    /* istanbul ignore next */
    ReactGA.initialize('UA-54313258-9', {
      testMode: process.env.NODE_ENV === 'test',
    });
    // Retrieve the main settings of the application
    this.props.getInitData();
  }

  /* istanbul ignore next */
  componentDidUpdate(prevProps) {
    const {
      admin: { didGetSecuredData, isLoading, isSecured },
      getHook,
      getSecuredData,
      location: { pathname },
    } = this.props;

    if (!isLoading && this.state.shouldSecureAfterAllPluginsAreMounted) {
      if (!this.hasApluginNotReady(this.props)) {
        getHook('willSecure');
      }
    }

    if (prevProps.location.pathname !== pathname) {
      getHook('willSecure');

      /* istanbul ignore if */
      if (this.isAcceptingTracking()) {
        ReactGA.pageview(pathname, {
          testMode: process.env.NODE_ENV === 'test',
        });
      }
    }

    if (prevProps.admin.isSecured !== isSecured && isSecured) {
      getSecuredData();
    }

    if (prevProps.admin.didGetSecuredData !== didGetSecuredData) {
      getHook('didGetSecuredData');
    }
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

  getContentWrapperStyle = () => {
    const {
      admin: { showMenu },
    } = this.props;

    return showMenu
      ? { main: {}, sub: styles.content }
      : { main: { width: '100%' }, sub: styles.wrapper };
  };

  hasApluginNotReady = props => {
    const {
      global: { plugins },
    } = props;

    return !Object.keys(plugins).every(
      plugin => plugins[plugin].isReady === true,
    );
  };

  helpers = {
    hideLeftMenu: this.props.hideLeftMenu,
    hideLogout: this.props.hideLogout,
    setAppSecured: this.props.setAppSecured,
    showLeftMenu: this.props.showLeftMenu,
    showLogout: this.props.showLogout,
    unsetAppSecured: this.props.unsetAppSecured,
    updatePlugin: this.props.updatePlugin,
  };

  isAcceptingTracking = () => {
    const {
      admin: { uuid },
    } = this.props;

    return !!uuid;
  };

  /**
   * Display the app loader until the app is ready
   * @returns {Boolean}
   */
  showLoader = () => {
    const {
      global: { isAppLoading },
    } = this.props;

    if (isAppLoading) {
      return true;
    }

    return this.hasApluginNotReady(this.props);
  };

  renderInitializers = () => {
    const {
      global: { plugins },
    } = this.props;

    return Object.keys(plugins).reduce((acc, current) => {
      const InitializerComponent = plugins[current].initializer;
      const key = plugins[current].id;

      acc.push(
        <InitializerComponent key={key} {...this.props} {...this.helpers} />,
      );

      return acc;
    }, []);
  };

  renderMarketPlace = props => <Marketplace {...props} {...this.props} />;

  renderPluginDispatcher = props => {
    // NOTE: Send the needed props instead of everything...

    return <PluginDispatcher {...this.props} {...props} {...this.helpers} />;
  };

  render() {
    const {
      admin: { isLoading, showLogoutComponent, showMenu, strapiVersion },
      global: { blockApp, overlayBlockerData, plugins, showGlobalAppBlocker },
    } = this.props;

    if (isLoading) {
      return <LoadingIndicatorPage />;
    }

    // We need the admin data in order to make the initializers work
    if (this.showLoader()) {
      return (
        <React.Fragment>
          {this.renderInitializers()}
          <LoadingIndicatorPage />
        </React.Fragment>
      );
    }

    return (
      <div className={styles.adminPage}>
        {showMenu && <LeftMenu version={strapiVersion} plugins={plugins} />}
        <NavTopRightWrapper>
          {/* Injection zone not ready yet */}
          {showLogoutComponent && <Logout />}
          <LocaleToggle isLogged />
        </NavTopRightWrapper>
        <div
          className={styles.adminPageRightWrapper}
          style={this.getContentWrapperStyle().main}
        >
          {showMenu ? <Header /> : ''}
          <div className={this.getContentWrapperStyle().sub}>
            <Switch>
              <Route path="/" component={HomePage} exact />
              <Route
                path="/plugins/:pluginId"
                render={this.renderPluginDispatcher}
              />
              <Route path="/plugins" component={ComingSoonPage} />
              <Route path="/list-plugins" component={ListPluginsPage} exact />
              <Route
                path="/marketplace"
                render={this.renderMarketPlace}
                exact
              />
              <Route path="/configuration" component={ComingSoonPage} exact />
              <Route key="7" path="" component={NotFoundPage} />
              <Route key="8" path="404" component={NotFoundPage} />
            </Switch>
          </div>
        </div>
        <OverlayBlocker
          key="overlayBlocker"
          isOpen={blockApp && showGlobalAppBlocker}
          {...overlayBlockerData}
        />
        {showLogoutComponent && <Onboarding />}
      </div>
    );
  }
}

Admin.childContextTypes = {
  emitEvent: PropTypes.func,
  currentEnvironment: PropTypes.string,
  disableGlobalOverlayBlocker: PropTypes.func,
  enableGlobalOverlayBlocker: PropTypes.func,
  plugins: PropTypes.object,
  updatePlugin: PropTypes.func,
};

Admin.propTypes = {
  admin: PropTypes.shape({
    autoReload: PropTypes.bool,
    appError: PropTypes.bool,
    currentEnvironment: PropTypes.string,
    didGetSecuredData: PropTypes.bool,
    isLoading: PropTypes.bool,
    isSecured: PropTypes.bool,
    layout: PropTypes.object,
    showLogoutComponent: PropTypes.bool,
    showMenu: PropTypes.bool,
    strapiVersion: PropTypes.string,
    uuid: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  }).isRequired,
  disableGlobalOverlayBlocker: PropTypes.func.isRequired,
  emitEvent: PropTypes.func.isRequired,
  enableGlobalOverlayBlocker: PropTypes.func.isRequired,
  getHook: PropTypes.func.isRequired,
  getInitData: PropTypes.func.isRequired,
  getSecuredData: PropTypes.func.isRequired,
  global: PropTypes.shape({
    appPlugins: PropTypes.array,
    blockApp: PropTypes.bool,
    overlayBlockerData: PropTypes.oneOfType([PropTypes.bool, PropTypes.object]),
    isAppLoading: PropTypes.bool,
    plugins: PropTypes.object,
    showGlobalAppBlocker: PropTypes.bool,
  }).isRequired,
  hideLeftMenu: PropTypes.func.isRequired,
  hideLogout: PropTypes.func.isRequired,
  location: PropTypes.object.isRequired,
  resetLocaleDefaultClassName: PropTypes.func.isRequired,
  setAppError: PropTypes.func.isRequired,
  setAppSecured: PropTypes.func.isRequired,
  showLeftMenu: PropTypes.func.isRequired,
  showLogout: PropTypes.func.isRequired,
  unsetAppSecured: PropTypes.func.isRequired,
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
      emitEvent,
      enableGlobalOverlayBlocker,
      getInitData,
      getSecuredData,
      hideLeftMenu,
      hideLogout,
      resetLocaleDefaultClassName,
      setAppError,
      setAppSecured,
      setLocaleCustomClassName,
      showLeftMenu,
      showLogout,
      unsetAppSecured,
      updatePlugin,
    },
    dispatch,
  );
}

const withConnect = connect(
  mapStateToProps,
  mapDispatchToProps,
);
const withReducer = injectReducer({ key: 'admin', reducer });
const withSaga = injectSaga({ key: 'admin', saga });
const withLocaleToggleReducer = injectReducer({
  key: 'localeToggle',
  reducer: localeToggleReducer,
});
const withHooks = injectHooks({ key: 'admin' });

export default compose(
  withReducer,
  withLocaleToggleReducer,
  withSaga,
  withConnect,
  withHooks,
)(Admin);
