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

import FullStory from 'components/FullStory';
import LeftMenu from 'containers/LeftMenu';
// Components from strapi-helper-plugin
import LoadingIndicatorPage from 'components/LoadingIndicatorPage';

import makeSelectApp from 'containers/App/selectors';

import injectSaga from 'utils/injectSaga';
import injectReducer from 'utils/injectReducer';
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

const PLUGINS_TO_BLOCK_PRODUCTION = ['content-type-builder', 'settings-manager'];

export class Admin extends React.Component { // eslint-disable-line react/prefer-stateless-function
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

  isAcceptingTracking = () => {
    const { admin: { uuid } } = this.props;

    return !!uuid;
  }

  /**
   * 
   * Retrieve the installed plugins
   * Note: this should be removed
   */
  retrievePlugins = () => {
    const {
      admin: { currentEnvironment },
      global: { plugins },
    } = this.props;

    if (currentEnvironment === 'production') {
      let pluginsToDisplay = plugins;
      PLUGINS_TO_BLOCK_PRODUCTION.map(plugin => (pluginsToDisplay = pluginsToDisplay.delete(plugin)));

      return pluginsToDisplay;
    }

    return plugins;
  };

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

    return false;
  }

  render() {
    const {
      admin: {
        appError,
        // Should be removed
        layout,
        showLeftMenu,
        strapiVersion,
      },
    } = this.props;

    if (appError) {
      return <div>An error has occured please check your logs</div>;
    }

    if (this.showLoader()) {
      return <LoadingIndicatorPage />;
    }

    return (
      <div className={styles.adminPage}>
        {this.isAcceptingTracking() && <FullStory org="GK708" />}
        {showLeftMenu && (
          <LeftMenu
            layout={layout}
            version={strapiVersion}
            plugins={this.retrievePlugins()}
          />
        )}
      </div>
    );
  }
}

Admin.propTypes = {
  // TODO: change this to shape
  admin: PropTypes.object.isRequired,
  getInitData: PropTypes.func.isRequired,
  global: PropTypes.object.isRequired,
  location: PropTypes.object.isRequired,
  setAppError: PropTypes.func.isRequired,
};

const mapStateToProps = createStructuredSelector({
  admin: makeSelectAdmin(),
  global: makeSelectApp(),
});

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      getInitData,
      hideLeftMenu,
      setAppError,
      showLeftMenu,
    },
    dispatch,
  );
}

const withConnect = connect(mapStateToProps, mapDispatchToProps);

/* Remove this line if the container doesn't have a route and
*  check the documentation to see how to create the container's store
*/
const withReducer = injectReducer({ key: 'admin', reducer });

/* Remove the line below the container doesn't have a route and
*  check the documentation to see how to create the container's store
*/
const withSaga = injectSaga({ key: 'admin', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(Admin);
