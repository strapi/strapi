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

import Home from 'containers/Home';
import EditPage from 'containers/EditPage';
import ListPage from 'containers/ListPage';
import EmptyAttributesView from 'components/EmptyAttributesView';

import {
  emptyStore,
  loadModels,
} from './actions';
import { makeSelectLoading, makeSelectModels, makeSelectModelEntries } from './selectors';

import saga from './sagas';

class App extends React.Component {
  componentDidMount() {
    this.props.loadModels();
  }

  componentWillUnmount() {
    this.props.emptyStore();
  }

  render() {
    if (this.props.loading) {
      return <div />;
    }

    const currentModelName = this.props.location.pathname.split('/')[3];
    const source = getQueryParameters(this.props.location.search, 'source');

    if (currentModelName && source && isEmpty(get(this.props.models.plugins, [source, 'models', currentModelName, 'attributes']))) {
      if (currentModelName && isEmpty(get(this.props.models.models, [currentModelName, 'attributes']))) {
        return <EmptyAttributesView currentModelName={currentModelName} history={this.props.history} modelEntries={this.props.modelEntries} />;
      }
    }

    return (
      <div className="content-manager">
        <Switch>
          <Route path="/plugins/content-manager/:slug/:id" component={EditPage} />
          <Route path="/plugins/content-manager/:slug" component={ListPage} />
          <Route path="/plugins/content-manager" component={Home} />
        </Switch>
      </div>
    );
  }
}

App.contextTypes = {
  router: PropTypes.object.isRequired,
};

App.propTypes = {
  emptyStore: PropTypes.func.isRequired,
  history: PropTypes.object.isRequired,
  loading: PropTypes.bool.isRequired,
  loadModels: PropTypes.func.isRequired,
  location: PropTypes.object.isRequired,
  modelEntries: PropTypes.number.isRequired,
  models: PropTypes.oneOfType([
    PropTypes.bool,
    PropTypes.object,
  ]).isRequired,
};

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      emptyStore,
      // getModelEntries,
      loadModels,
    },
    dispatch,
  );
}

const mapStateToProps = createStructuredSelector({
  loading: makeSelectLoading(),
  modelEntries: makeSelectModelEntries(),
  models: makeSelectModels(),
});

const withConnect = connect(mapStateToProps, mapDispatchToProps);
const withSaga = injectSaga({ key: 'global', saga });

export default compose(
  withSaga,
  withConnect,
)(App);
