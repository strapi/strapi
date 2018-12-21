/**
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { createStructuredSelector } from 'reselect';
import PropTypes from 'prop-types';
import { isEmpty, get } from 'lodash';
import { Switch, Route } from 'react-router-dom';

import injectSaga from 'utils/injectSaga';
import getQueryParameters from 'utils/getQueryParameters';

import EditPage from 'containers/EditPage';
import ListPage from 'containers/ListPage';
import SettingsPage from 'containers/SettingsPage';
import SettingPage from 'containers/SettingPage';
import LoadingIndicatorPage from 'components/LoadingIndicatorPage';
import EmptyAttributesView from 'components/EmptyAttributesView';

import {
  loadModels,
} from './actions';
import { makeSelectLoading, makeSelectModelEntries, makeSelectSchema } from './selectors';

import saga from './sagas';

class App extends React.Component {
  componentDidMount() {
    this.props.loadModels();
  }

  render() {
    if (this.props.loading) {
      return <LoadingIndicatorPage />;
    }

    const currentModelName = this.props.location.pathname.split('/')[3];
    const source = getQueryParameters(this.props.location.search, 'source');
    const attrPath = source === 'content-manager' ? ['models', currentModelName, 'editDisplay', 'availableFields'] : ['models', 'plugins', source, currentModelName, 'editDisplay', 'availableFields'];
    
    if (currentModelName && source && isEmpty(get(this.props.schema, attrPath))) {
      return <EmptyAttributesView currentModelName={currentModelName} history={this.props.history} modelEntries={this.props.modelEntries} />;
    }

    return (
      <div className="content-manager">
        <Switch>
          <Route path="/plugins/content-manager/ctm-configurations/:slug/:source?/:endPoint?" component={SettingPage} />
          <Route path="/plugins/content-manager/ctm-configurations" component={SettingsPage} />
          <Route path="/plugins/content-manager/:slug/:id" component={EditPage} />
          <Route path="/plugins/content-manager/:slug" component={ListPage} />
        </Switch>
      </div>
    );
  }
}

App.contextTypes = {
  router: PropTypes.object.isRequired,
};

App.propTypes = {
  history: PropTypes.object.isRequired,
  loading: PropTypes.bool.isRequired,
  loadModels: PropTypes.func.isRequired,
  location: PropTypes.object.isRequired,
  modelEntries: PropTypes.number.isRequired,
  schema: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.object,
  ]).isRequired,
};

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      loadModels,
    },
    dispatch,
  );
}

const mapStateToProps = createStructuredSelector({
  loading: makeSelectLoading(),
  modelEntries: makeSelectModelEntries(),
  schema: makeSelectSchema(),
});

const withConnect = connect(mapStateToProps, mapDispatchToProps);
const withSaga = injectSaga({ key: 'global', saga });

export default compose(
  withSaga,
  withConnect,
)(App);
