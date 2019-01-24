/**
 *
 * InstallPluginPage
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Helmet } from 'react-helmet';
import { FormattedMessage } from 'react-intl';
import { bindActionCreators, compose } from 'redux';
import cn from 'classnames';
import { map } from 'lodash';

// Design
import PluginCard from 'components/PluginCard';
import PluginHeader from 'components/PluginHeader';
import LoadingIndicatorPage from 'components/LoadingIndicatorPage';

import injectSaga from 'utils/injectSaga';
import injectReducer from 'utils/injectReducer';

import {
  downloadPlugin,
  getAvailablePlugins,
  getInstalledPlugins,
  onChange,
} from './actions';

import makeSelectInstallPluginPage from './selectors';
import reducer from './reducer';
import saga from './saga';

import styles from './styles.scss';

export class InstallPluginPage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  getChildContext = () => (
    {

      downloadPlugin: this.props.downloadPlugin,
    }
  );

  componentDidMount() {
    // Don't fetch the available plugins if it has already been done
    if (!this.props.didFetchPlugins) {
      this.props.getAvailablePlugins();
    }

    // Get installed plugins
    this.props.getInstalledPlugins();
  }

  render() {
    if (!this.props.didFetchPlugins || !this.props.didFetchInstalledPlugins) {
      return <LoadingIndicatorPage />;
    }
    
    return (
      <div>
        <FormattedMessage id="app.components.InstallPluginPage.helmet">
          {message => (
            <Helmet>
              <title>{message}</title>
              <meta name="description" content="Description of InstallPluginPage" />
            </Helmet>
          )}
        </FormattedMessage>
        <div className={cn('container-fluid', styles.containerFluid)}>
          <PluginHeader
            title={{ id: 'app.components.InstallPluginPage.title' }}
            description={{ id: 'app.components.InstallPluginPage.description' }}
            actions={[]}
          />
          <div className={cn('row', styles.wrapper)}>
            {map(this.props.availablePlugins, (plugin) => (
              <PluginCard
                currentEnvironment={this.props.adminPage.currentEnvironment}
                history={this.props.history}
                key={plugin.id}
                plugin={plugin}
                showSupportUsButton={plugin.id === 'support-us'}
                isAlreadyInstalled={this.props.installedPlugins.includes(plugin.id)}
                downloadPlugin={(e) => {
                  e.preventDefault();
                  e.stopPropagation();

                  if (plugin.id !== 'support-us') {
                    this.props.downloadPlugin(plugin.id);
                  }
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
}

InstallPluginPage.childContextTypes = {
  downloadPlugin: PropTypes.func.isRequired,
};

InstallPluginPage.propTypes = {
  adminPage: PropTypes.shape({
    currentEnvironment: PropTypes.string.isRequired,
  }).object.isRequired,
  availablePlugins: PropTypes.array.isRequired,
  didFetchInstalledPlugins: PropTypes.bool.isRequired,
  didFetchPlugins: PropTypes.bool.isRequired,
  downloadPlugin: PropTypes.func.isRequired,
  getAvailablePlugins: PropTypes.func.isRequired,
  getInstalledPlugins: PropTypes.func.isRequired,
  history: PropTypes.object.isRequired,
  installedPlugins: PropTypes.array.isRequired,
  // onChange: PropTypes.func.isRequired,
  // search: PropTypes.string.isRequired,
};

const mapStateToProps = makeSelectInstallPluginPage();

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      downloadPlugin,
      getAvailablePlugins,
      getInstalledPlugins,
      onChange,
    },
    dispatch,
  );
}

const withConnect = connect(mapStateToProps, mapDispatchToProps);

/* Remove this line if the container doesn't have a route and
*  check the documentation to see how to create the container's store
*/
const withReducer = injectReducer({ key: 'installPluginPage', reducer });

/* Remove the line below the container doesn't have a route and
*  check the documentation to see how to create the container's store
*/
const withSaga = injectSaga({ key: 'installPluginPage', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(InstallPluginPage);
