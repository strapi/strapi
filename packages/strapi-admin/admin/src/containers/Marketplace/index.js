/**
 *
 * Marketplace
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { FormattedMessage } from 'react-intl';
import { bindActionCreators, compose } from 'redux';
import { LoadingIndicatorPage } from 'strapi-helper-plugin';
import { Header } from '@buffetjs/custom';
import { MarketPlaceContextProvider } from '../../contexts/MarketPlace';
// Design
import PageTitle from '../../components/PageTitle';
import PluginCard from '../../components/PluginCard';
import injectSaga from '../../utils/injectSaga';
import injectReducer from '../../utils/injectReducer';
import Wrapper from './Wrapper';
import {
  downloadPlugin,
  getAvailableAndInstalledPlugins,
  resetProps,
} from './actions';
import makeSelectMarketplace from './selectors';
import reducer from './reducer';
import saga from './saga';

class Marketplace extends React.Component {
  componentDidMount() {
    // Fetch the available and installed plugins
    this.props.getAvailableAndInstalledPlugins();
  }

  componentWillUnmount() {
    this.props.resetProps();
  }

  renderHelmet = message => <PageTitle title={message} />;

  renderPluginCard = plugin => {
    const {
      global: { autoReload, currentEnvironment },
      availablePlugins,
      downloadPlugin,
      history,
      installedPlugins,
    } = this.props;
    const currentPlugin = availablePlugins[plugin];

    return (
      <PluginCard
        autoReload={autoReload}
        currentEnvironment={currentEnvironment}
        history={history}
        key={currentPlugin.id}
        plugin={currentPlugin}
        showSupportUsButton={currentPlugin.id === 'support-us'}
        isAlreadyInstalled={installedPlugins.includes(currentPlugin.id)}
        downloadPlugin={e => {
          e.preventDefault();
          e.stopPropagation();

          if (plugin.id !== 'support-us') {
            downloadPlugin(currentPlugin.id);
          }
        }}
      />
    );
  };

  render() {
    const {
      availablePlugins,
      intl: { formatMessage },
      isLoading,
    } = this.props;

    if (isLoading) {
      return <LoadingIndicatorPage />;
    }

    return (
      <MarketPlaceContextProvider downloadPlugin={this.props.downloadPlugin}>
        <div>
          <FormattedMessage id="app.components.InstallPluginPage.helmet">
            {this.renderHelmet}
          </FormattedMessage>
          <Wrapper className="container-fluid">
            <Header
              title={{
                label: formatMessage({
                  id: 'app.components.InstallPluginPage.title',
                }),
              }}
              content={formatMessage({
                id: 'app.components.InstallPluginPage.description',
              })}
              actions={[]}
            />
            <div className="row" style={{ paddingTop: '4.1rem' }}>
              {Object.keys(availablePlugins).map(this.renderPluginCard)}
            </div>
          </Wrapper>
        </div>
      </MarketPlaceContextProvider>
    );
  }
}

Marketplace.defaultProps = {};

Marketplace.propTypes = {
  availablePlugins: PropTypes.array.isRequired,
  downloadPlugin: PropTypes.func.isRequired,
  getAvailableAndInstalledPlugins: PropTypes.func.isRequired,
  global: PropTypes.shape({
    autoReload: PropTypes.bool.isRequired,
    currentEnvironment: PropTypes.string.isRequired,
  }).isRequired,
  history: PropTypes.object.isRequired,
  installedPlugins: PropTypes.array.isRequired,
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
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
    dispatch
  );
}

const withConnect = connect(
  mapStateToProps,
  mapDispatchToProps
);

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
  withConnect
)(Marketplace);
