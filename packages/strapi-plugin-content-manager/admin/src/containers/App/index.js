/**
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { compose } from 'redux';
import { createStructuredSelector } from 'reselect';
import _ from 'lodash';
import { Switch, Route } from 'react-router-dom';

import Edit from 'containers/Edit';
import List from 'containers/List';
import Home from 'containers/Home';

import injectSaga from 'utils/injectSaga';
import saga from './sagas';

import { loadModels, updateSchema } from './actions';
import { makeSelectLoading } from './selectors';

const tryRequire = (path) => {
  try {
    return require(`containers/${path}.js`); // eslint-disable-line global-require
  } catch (err) {
    return null;
  }
};

class App extends React.Component {
  componentWillMount() {
    const config = tryRequire('../../../../config/admin.json');
    if (!_.isEmpty(_.get(config, 'admin.schema'))) {
      this.props.updateSchema(config.admin.schema);
    } else {
      this.props.loadModels();
    }
  }

  render() {
    if (this.props.loading) {
      return <div />;
    }

    return (
      <div className="content-manager">
        <Switch>
          <Route path="/plugins/content-manager/:slug/:id" component={Edit} />
          <Route path="/plugins/content-manager/:slug" component={List} />
          <Route path="/plugins/content-manager" component={Home} />
        </Switch>
      </div>
    );
  }
}

App.contextTypes = {
  router: React.PropTypes.object.isRequired,
};

App.propTypes = {
  loading: React.PropTypes.bool.isRequired,
  loadModels: React.PropTypes.func.isRequired,
  updateSchema: React.PropTypes.func.isRequired,
};

export function mapDispatchToProps(dispatch) {
  return {
    loadModels: () => dispatch(loadModels()),
    updateSchema: (schema) => dispatch(updateSchema(schema)),
    dispatch,
  };
}

const mapStateToProps = createStructuredSelector({
  loading: makeSelectLoading(),
});


// Wrap the component to inject dispatch and state into it
const withConnect = connect(mapStateToProps, mapDispatchToProps);

const withSaga = injectSaga({ key: 'global', saga });

export default compose(
  withSaga,
  withConnect,
)(App);
