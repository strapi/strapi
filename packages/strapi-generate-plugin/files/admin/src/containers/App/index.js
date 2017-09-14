/**
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { Switch, Route } from 'react-router-dom';
import { compose } from 'redux';

import HomePage from 'containers/HomePage';

import { pluginId } from 'app';

class App extends React.Component {
  render() {
    return (
      <div className={pluginId}>
        <Switch>
          <Route path="" component={HomePage} exact />
        </Switch>
      </div>
    );
  }
}

App.propTypes = {
  match: React.PropTypes.object,
};

export function mapDispatchToProps(dispatch) {
  return {
    dispatch,
  };
}

const mapStateToProps = createStructuredSelector({});

// Wrap the component to inject dispatch and state into it
const withConnect = connect(mapStateToProps, mapDispatchToProps);

export default compose(
  withConnect,
)(App);