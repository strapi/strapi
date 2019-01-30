/**
 * 
 * Marketplace
 * 
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Helmet } from 'react-helmet';
import { FormattedMessage } from 'react-intl';
import { bindActionCreators, compose } from 'redux';
import cn from 'classnames';

// Design
import PluginCard from 'components/PluginCard';
import PluginHeader from 'components/PluginHeader';
import LoadingIndicatorPage from 'components/LoadingIndicatorPage';

import injectSaga from 'utils/injectSaga';
import injectReducer from 'utils/injectReducer';

import {
  downloadPlugin,
  getAvailableAndInstalledPlugins,
  resetProps,
} from './actions';
import makeSelectMarketplace from './selectors';

import reducer from './reducer';
import saga from './saga';

import styles from './styles.scss';

class Marketplace extends React.Component {
  getChildContext = () => (
    {
      downloadPlugin: this.props.downloadPlugin,
    }
  );

  componentDidMount() {
    // Fetch the available and installed plugins
    this.props.getAvailableAndInstalledPlugins();
  }

  componentWillUnmount() {
    this.props.resetProps();
  }

  renderHelmet = message => (
    <Helmet>
      <title>{message}</title>
      <meta name="description" content="Description of InstallPluginPage" />
    </Helmet>
  );

  renderPluginCard = plugin => {
    const { adminPage: { currentEnvironment }, availablePlugins, downloadPlugin, history, installedPlugins } = this.props;
    const currentPlugin = availablePlugins[plugin];
    
    return (
      <PluginCard
        currentEnvironment={currentEnvironment}
        history={history}
        key={currentPlugin.id}
        plugin={currentPlugin}
        showSupportUsButton={currentPlugin.id === 'support-us'}
        isAlreadyInstalled={installedPlugins.includes(currentPlugin.id)}
        downloadPlugin={(e) => {
          e.preventDefault();
          e.stopPropagation();

          if (plugin.id !== 'support-us') {
            downloadPlugin(currentPlugin.id);
          }
        }}
      />
    );
  }

  render() {
    const { availablePlugins, isLoading } = this.props;

    if (isLoading) {
      return <LoadingIndicatorPage />;
    }

    return (
      <div>
        <FormattedMessage id="app.components.InstallPluginPage.helmet">
          {this.renderHelmet}
        </FormattedMessage>
        <div className={cn('container-fluid', styles.containerFluid)}>
          <PluginHeader
            title={{ id: 'app.components.InstallPluginPage.title' }}
            description={{ id: 'app.components.InstallPluginPage.description' }}
            actions={[]}
          />
          <div className={cn('row', styles.wrapper)}>
            {Object.keys(availablePlugins).map(this.renderPluginCard)}
          </div>
        </div>
      </div>
    );
  }
}

Marketplace.childContextTypes = {
  downloadPlugin: PropTypes.func.isRequired,
};

Marketplace.defaultProps = {};

Marketplace.propTypes = {
  adminPage: PropTypes.object.isRequired,
  availablePlugins: PropTypes.array.isRequired,
  downloadPlugin: PropTypes.func.isRequired,
  getAvailableAndInstalledPlugins: PropTypes.func.isRequired,
  history: PropTypes.object.isRequired,
  installedPlugins: PropTypes.array.isRequired,
  isLoading: PropTypes.bool.isRequired,
  resetProps: PropTypes.func.isRequired,
};

const mapStateToProps = makeSelectMarketplace();

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      downloadPlugin,
      getAvailableAndInstalledPlugins,
      resetProps,
    },
    dispatch,
  );
}

const withConnect = connect(mapStateToProps, mapDispatchToProps);

/* Remove this line if the container doesn't have a route and
*  check the documentation to see how to create the container's store
*/
const withReducer = injectReducer({ key: 'marketplace', reducer });

/* Remove the line below the container doesn't have a route and
*  check the documentation to see how to create the container's store
*/
const withSaga = injectSaga({ key: 'marketplace', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(Marketplace);
