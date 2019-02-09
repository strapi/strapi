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

import FullStory from 'components/FullStory';
import LeftMenu from 'containers/LeftMenu';
import Header from 'components/Header/index';

import ComingSoonPage from 'containers/ComingSoonPage';
import LocaleToggle from 'containers/LocaleToggle';
import HomePage from 'containers/HomePage/Loadable';
import Marketplace from 'containers/Marketplace/Loadable';
import ListPluginsPage from 'containers/ListPluginsPage/Loadable';
import NotFoundPage from 'containers/NotFoundPage/Loadable';
import PluginDispatcher from 'containers/PluginDispatcher';

// Actions from strapi-helper-plugin
// Actions required for disabling and enabling the OverlayBlocker
import { disableGlobalOverlayBlocker, enableGlobalOverlayBlocker } from 'actions/overlayBlocker';
// Components from strapi-helper-plugin
import LoadingIndicatorPage from 'components/LoadingIndicatorPage';
import OverlayBlocker from 'components/OverlayBlocker';

import { updatePlugin } from 'containers/App/actions';

import makeSelectApp from 'containers/App/selectors';

import localeToggleReducer from 'containers/LocaleToggle/reducer';

import {
  resetLocaleDefaultClassName,
  setLocaleCustomClassName,
} from 'containers/LocaleToggle/actions';

import injectSaga from 'utils/injectSaga';
import injectReducer from 'utils/injectReducer';

import NavTopRightWrapper from './NavTopRightWrapper';

import {
  getInitData,
  hideLeftMenu,
  setAppError,
  showLeftMenu,
} from './actions';

import makeSelectAdmin from './selectors';
import reducer from './reducer';
import saga from './saga';
import styles from './styles.scss';

export class Admin extends React.Component { // eslint-disable-line react/prefer-stateless-function
  // state = { }
  getChildContext = () => ({
    disableGlobalOverlayBlocker: this.props.disableGlobalOverlayBlocker,
    enableGlobalOverlayBlocker: this.props.enableGlobalOverlayBlocker,
    plugins: this.props.global.plugins,
    updatePlugin: this.props.updatePlugin,
  });

  componentDidMount() {
    // Initialize Google Analytics
    // Refer to ../../../doc/disable-tracking.md for more informations
    ReactGA.initialize('UA-54313258-9');
    // Retrieve the main settings of the application
    this.props.getInitData();
  }

  componentDidUpdate(prevProps) {
    const {
      location: { pathname },
    } = this.props;

    if (prevProps.location.pathname !== pathname) {
      if (this.isAcceptingTracking()) {
        ReactGA.pageview(pathname);
      }
    }
  }

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

  helpers = {
    hideLeftMenu: this.props.hideLeftMenu,
    showLeftMenu: this.props.showLeftMenu,
    updatePlugin: this.props.updatePlugin,
  };

  hasApluginNotReady = props => {
    const { global: { plugins } } = props;

    return !Object.keys(plugins).every(plugin => (plugins[plugin].isReady === true));
  } 

  isAcceptingTracking = () => {
    const { admin: { uuid } } = this.props;

    return !!uuid;
  }

  /**
   * Display the app loader until the app is ready
   * @returns {Boolean}
   */
  showLoader = () => {
    const {
      admin: { isLoading },
      global: { isAppLoading },
    } = this.props;

    if (isAppLoading) {
      return true;
    }

    if (isLoading) {
      return true;
    }

    return this.hasApluginNotReady(this.props);
  }

  renderMarketPlace = props => <Marketplace {...props} {...this.props} />;

  renderInitializers = () => {
    const {
      global: { plugins },
    } = this.props;

    return Object.keys(plugins).reduce((acc, current) => {
      const Compo = plugins[current].initializer;
      const key = plugins[current].id;

      if (Compo) {
        // We don't check if the initializer is correct because there's a fallback in cdc
        acc.push(<Compo key={key} {...this.props} {...this.helpers} />);
      }

      return acc;
    }, []);
  };


  renderPluginDispatcher = props => {
    // NOTE: Send the needed props instead of everything...

    return <PluginDispatcher {...this.props} {...props} {...this.helpers} />;
  }

  render() {
    const {
      admin: {
        appError,
        isLoading,
        // Should be removed
        layout,
        showLeftMenu,
        strapiVersion,
      },
      global: {
        blockApp,
        overlayBlockerData,
        plugins,
        showGlobalAppBlocker,
      },
    } = this.props;

    if (appError) {
      return <div>An error has occured please check your logs</div>;
    }

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

    const contentWrapperStyle = showLeftMenu ? { main: {}, sub: styles.content } : { main: { width: '100%' }, sub: styles.wrapper };

    return (
      <div className={styles.adminPage}>
        {this.isAcceptingTracking() && <FullStory org="GK708" />}
        {showLeftMenu && (
          <LeftMenu
            layout={layout}
            version={strapiVersion}
            plugins={plugins}
          />
        )}
        <NavTopRightWrapper>
          <LocaleToggle isLogged />
        </NavTopRightWrapper>
        <div className={styles.adminPageRightWrapper} style={contentWrapperStyle.main}>
          {showLeftMenu ? <Header /> : ''}
          <div className={contentWrapperStyle.sub}>
            <Switch>
              <Route path="/" component={HomePage} exact />
              <Route path="/plugins/:pluginId" render={this.renderPluginDispatcher} />
              <Route path="/plugins" component={ComingSoonPage} />
              <Route path="/list-plugins" component={ListPluginsPage} exact />
              <Route path="/marketplace" render={this.renderMarketPlace} exact />
              <Route path="/configuration" component={ComingSoonPage} exact />
              <Route path="" component={NotFoundPage} />
              <Route path="404" component={NotFoundPage} />
            </Switch>
          </div>
        </div>
        <OverlayBlocker
          isOpen={blockApp && showGlobalAppBlocker}
          {...overlayBlockerData}
        />
      </div>
    );
  }
}

Admin.childContextTypes = {
  disableGlobalOverlayBlocker: PropTypes.func,
  enableGlobalOverlayBlocker: PropTypes.func,
  plugins: PropTypes.object,
  updatePlugin: PropTypes.func,
};

Admin.contextTypes = {
  router: PropTypes.object.isRequired,
};


Admin.propTypes = {
  // TODO: change this to shape
  admin: PropTypes.object.isRequired,
  disableGlobalOverlayBlocker: PropTypes.func.isRequired,
  enableGlobalOverlayBlocker: PropTypes.func.isRequired,
  getInitData: PropTypes.func.isRequired,
  global: PropTypes.object.isRequired,
  hideLeftMenu: PropTypes.func.isRequired,
  location: PropTypes.object.isRequired,
  resetLocaleDefaultClassName: PropTypes.func.isRequired,
  setAppError: PropTypes.func.isRequired,
  setLocaleCustomClassName: PropTypes.func.isRequired,
  showLeftMenu: PropTypes.func.isRequired,
  updatePlugin: PropTypes.func.isRequired,
};

const mapStateToProps = createStructuredSelector({
  admin: makeSelectAdmin(),
  global: makeSelectApp(),
});

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      disableGlobalOverlayBlocker,
      enableGlobalOverlayBlocker,
      getInitData,
      hideLeftMenu,
      resetLocaleDefaultClassName,
      setAppError,
      setLocaleCustomClassName,
      showLeftMenu,
      updatePlugin,
    },
    dispatch,
  );
}

const withConnect = connect(mapStateToProps, mapDispatchToProps);

/* Remove this line if the container doesn't have a route and
*  check the documentation to see how to create the container's store
*/
const withReducer = injectReducer({ key: 'admin', reducer });
const withLocaleToggleReducer = injectReducer({ key: 'localeToggle', reducer: localeToggleReducer });

/* Remove the line below the container doesn't have a route and
*  check the documentation to see how to create the container's store
*/
const withSaga = injectSaga({ key: 'admin', saga });

export default compose(
  withReducer,
  withLocaleToggleReducer,
  withSaga,
  withConnect,
)(Admin);
