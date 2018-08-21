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

import {
  disableGlobalOverlayBlocker,
  enableGlobalOverlayBlocker,
} from 'actions/overlayBlocker';

// Design
// import Input from 'components/Input';
import DownloadInfo from 'components/DownloadInfo';
import OverlayBlocker from 'components/OverlayBlocker';
import PluginCard from 'components/PluginCard';
import PluginHeader from 'components/PluginHeader';
import SupportUsBanner from 'components/SupportUsBanner';
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
    // Disable the AdminPage OverlayBlocker in order to give it a custom design (children)
    this.props.disableGlobalOverlayBlocker();

    // Don't fetch the available plugins if it has already been done
    if (!this.props.didFetchPlugins) {
      this.props.getAvailablePlugins();
    }

    // Get installed plugins
    this.props.getInstalledPlugins();
  }

  componentWillUnmount() {
    // Enable the AdminPage OverlayBlocker so it is displayed when the server is restarting
    this.props.enableGlobalOverlayBlocker();
  }

  render() {
    if (!this.props.didFetchPlugins || !this.props.didFetchInstalledPlugins) {
      return <LoadingIndicatorPage />;
    }
    
    return (
      <div>
        <OverlayBlocker isOpen={this.props.blockApp}>
          <DownloadInfo />
        </OverlayBlocker>
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
          <div className="row">
            <div className="col-md-12 col-lg-12">
              <SupportUsBanner />
            </div>
          </div>
          {/*}<div className={cn('row', styles.inputContainer)}>
            <Input
              customBootstrapClass="col-md-12"
              label="app.components.InstallPluginPage.InputSearch.label"
              name="search"
              onChange={this.props.onChange}
              placeholder="app.components.InstallPluginPage.InputSearch.placeholder"
              type="search"
              validations={{}}
              value={this.props.search}
            />
          </div>*/}
          <div className={cn('row', styles.wrapper)}>
            {map(this.props.availablePlugins, (plugin) => (
              <PluginCard
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
  availablePlugins: PropTypes.array.isRequired,
  blockApp: PropTypes.bool.isRequired,
  didFetchInstalledPlugins: PropTypes.bool.isRequired,
  didFetchPlugins: PropTypes.bool.isRequired,
  disableGlobalOverlayBlocker: PropTypes.func.isRequired,
  downloadPlugin: PropTypes.func.isRequired,
  enableGlobalOverlayBlocker: PropTypes.func.isRequired,
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
      disableGlobalOverlayBlocker,
      downloadPlugin,
      enableGlobalOverlayBlocker,
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
