/**
 *
 * Admin
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { bindActionCreators, compose } from 'redux';
import { Switch, Route } from 'react-router-dom';

// Actions from strapi-helper-plugin
// Actions required for disabling and enabling the OverlayBlocker
import {
  disableGlobalOverlayBlocker,
  enableGlobalOverlayBlocker,
} from 'actions/overlayBlocker';

// Components from strapi-helper-plugin
// import LoadingIndicatorPage from 'components/LoadingIndicatorPage';
import OverlayBlocker from 'components/OverlayBlocker';

import FullStory from '../../components/FullStory';
import Header from '../../components/Header/index';

import ComingSoonPage from '../ComingSoonPage';
import LeftMenu from '../LeftMenu';
import LocaleToggle from '../LocaleToggle';
import HomePage from '../HomePage/Loadable';
import Marketplace from '../Marketplace/Loadable';
import ListPluginsPage from '../ListPluginsPage/Loadable';
import NotFoundPage from '../NotFoundPage/Loadable';
import PluginDispatcher from '../PluginDispatcher';

import { updatePlugin } from '../App/actions';
import makeSelecApp from '../App/selectors';

import injectSaga from '../../utils/injectSaga';
import injectReducer from '../../utils/injectReducer';

import localeToggleReducer from '../LocaleToggle/reducer';
import {
  resetLocaleDefaultClassName,
  setLocaleCustomClassName,
} from '../LocaleToggle/actions';

import {
  getInitData,
  hideLeftMenu,
  setAppError,
  showLeftMenu,
} from './actions';
import makeSelectAdmin from './selectors';
import reducer from './reducer';
import saga from './saga';

import NavTopRightWrapper from './NavTopRightWrapper';

import styles from './styles.scss';

export class Admin extends React.Component { // eslint-disable-line react/prefer-stateless-function
  // state = { shouldSecureAfterAllPluginsAreMounted: true };

  getChildContext = () => ({
    disableGlobalOverlayBlocker: this.props.disableGlobalOverlayBlocker,
    enableGlobalOverlayBlocker: this.props.enableGlobalOverlayBlocker,
    plugins: this.props.global.plugins,
    updatePlugin: this.props.updatePlugin,
  });

  getContentWrapperStyle = () => {
    const { admin: { showMenu } } = this.props;

    return showMenu
      ? { main: {}, sub: styles.content }
      : { main: { width: '100%' }, sub: styles.wrapper };
  }

  helpers = {
    hideLeftMenu: this.props.hideLeftMenu,
    showLeftMenu: this.props.showLeftMenu,
    updatePlugin: this.props.updatePlugin,
  };

  isAcceptingTracking = () => {
    const { admin: { uuid } } = this.props;

    return !!uuid;
  }

  renderMarketPlace = props => <Marketplace {...props} {...this.props} />;

  renderPluginDispatcher = props => {
    // NOTE: Send the needed props instead of everything...

    return <PluginDispatcher {...this.props} {...props} {...this.helpers} />;
  }

  render() {
    const {
      admin: {
        layout,
        showMenu,
        strapiVersion,
      },
      global: {
        blockApp,
        overlayBlockerData,
        plugins,
        showGlobalAppBlocker,
      },
    } = this.props;

    return (
      <div className={styles.adminPage}>
        {this.isAcceptingTracking() && <FullStory org="GK708" />}
        {showMenu  && (
          <LeftMenu
            layout={layout}
            version={strapiVersion}
            plugins={plugins}
          />
        )}
        <NavTopRightWrapper>
          <LocaleToggle isLogged />
        </NavTopRightWrapper>
        <div className={styles.adminPageRightWrapper} style={this.getContentWrapperStyle().main}>
          {showMenu ? <Header /> : ''}
          <div className={this.getContentWrapperStyle().sub}>
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

Admin.propTypes = {
  admin: PropTypes.shape({
    autoReload: PropTypes.bool,
    appError: PropTypes.bool,
    currentEnvironment: PropTypes.string,
    isLoading: PropTypes.bool,
    layout: PropTypes.object,
    showMenu: PropTypes.bool,
    strapiVersion: PropTypes.string,
    uuid: PropTypes.oneOfType([
      PropTypes.bool,
      PropTypes.string,
    ]),
  }).isRequired,
  disableGlobalOverlayBlocker: PropTypes.func.isRequired,
  enableGlobalOverlayBlocker: PropTypes.func.isRequired,
  getInitData: PropTypes.func.isRequired,
  global: PropTypes.shape({
    appPlugins: PropTypes.array,
    blockApp: PropTypes.bool,
    overlayBlockerData: PropTypes.object,
    isAppLoading: PropTypes.bool,
    plugins: PropTypes.object,
    showGlobalAppBlocker: PropTypes.bool,
  }).isRequired,
  hideLeftMenu: PropTypes.func.isRequired,
  resetLocaleDefaultClassName: PropTypes.func.isRequired,
  setAppError: PropTypes.func.isRequired,
  showLeftMenu: PropTypes.func.isRequired,
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
const withReducer = injectReducer({ key: 'admin', reducer });
const withSaga = injectSaga({ key: 'admin', saga });
const withLocaleToggleReducer = injectReducer({ key: 'localeToggle', reducer: localeToggleReducer });

export default compose(
  withReducer,
  withLocaleToggleReducer,
  withSaga,
  withConnect,
)(Admin);
