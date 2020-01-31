/**
 *
 * ListPluginsPage
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Helmet } from 'react-helmet';
import { createStructuredSelector } from 'reselect';
import { bindActionCreators, compose } from 'redux';
import { FormattedMessage } from 'react-intl';
import { LoadingIndicatorPage } from 'strapi-helper-plugin';
import { Header } from '@buffetjs/custom';
import ListPlugins from '../../components/ListPlugins';
import injectSaga from '../../utils/injectSaga';
import injectReducer from '../../utils/injectReducer';
import Wrapper from './Wrapper';

import {
  makeSelectPluginDeleteAction,
  makeSelectPlugins,
  makeSelectIsLoading,
} from './selectors';
import {
  getPlugins,
  onDeletePluginClick,
  onDeletePluginConfirm,
} from './actions';
import reducer from './reducer';
import saga from './saga';

export class ListPluginsPage extends React.Component {
  componentDidMount() {
    this.props.getPlugins();
  }

  render() {
    const {
      intl: { formatMessage },
    } = this.props;

    if (this.props.isLoading) {
      return <LoadingIndicatorPage />;
    }

    return (
      <div>
        <FormattedMessage id="app.components.ListPluginsPage.helmet.title">
          {message => (
            <Helmet>
              <title>{message}</title>
              <meta
                name="description"
                content="Description of ListPluginsPage"
              />
            </Helmet>
          )}
        </FormattedMessage>
        <Wrapper className="container-fluid">
          <Header
            title={{
              label: formatMessage({
                id: 'app.components.ListPluginsPage.title',
              }),
            }}
            content={formatMessage({
              id: 'app.components.ListPluginsPage.description',
            })}
            actions={[]}
          />
          <ListPlugins
            history={this.props.history}
            plugins={this.props.plugins}
            pluginActionSucceeded={this.props.pluginActionSucceeded}
            onDeleteClick={this.props.onDeletePluginClick}
            onDeleteConfirm={this.props.onDeletePluginConfirm}
          />
        </Wrapper>
      </div>
    );
  }
}

ListPluginsPage.propTypes = {
  global: PropTypes.shape({
    currentEnvironment: PropTypes.string.isRequired,
  }).isRequired,
  getPlugins: PropTypes.func.isRequired,
  history: PropTypes.object.isRequired,
  intl: PropTypes.shape({
    formatMessage: PropTypes.func.isRequired,
  }).isRequired,
  isLoading: PropTypes.bool.isRequired,
  onDeletePluginClick: PropTypes.func.isRequired,
  onDeletePluginConfirm: PropTypes.func.isRequired,
  pluginActionSucceeded: PropTypes.bool.isRequired,
  plugins: PropTypes.object.isRequired,
};

const mapStateToProps = createStructuredSelector({
  isLoading: makeSelectIsLoading(),
  pluginActionSucceeded: makeSelectPluginDeleteAction(),
  plugins: makeSelectPlugins(),
});

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      getPlugins,
      onDeletePluginClick,
      onDeletePluginConfirm,
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
const withReducer = injectReducer({ key: 'listPluginsPage', reducer });

/* Remove the line below the container doesn't have a route and
 *  check the documentation to see how to create the container's store
 */
const withSaga = injectSaga({ key: 'listPluginsPage', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect
)(ListPluginsPage);
