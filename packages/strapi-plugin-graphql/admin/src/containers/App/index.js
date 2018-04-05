/**
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { Switch, Route } from 'react-router-dom';
import { bindActionCreators, compose } from 'redux';

// Utils
import { pluginId } from 'app';

// Containers
import HomePage from 'containers/HomePage';
import NotFoundPage from 'containers/NotFoundPage';
// When you're done studying the ExamplePage container, remove the following line and delete the ExamplePage container
import ExamplePage from 'containers/ExamplePage';


class App extends React.Component {
  // When you're done studying the ExamplePage container, remove the following lines and delete the ExamplePage container
  componentDidMount() {
    this.props.history.push(`/plugins/${pluginId}/example`);
  }

  render() {
    return (
      <div className={pluginId}>
        <Switch>
          <Route path={`/plugins/${pluginId}`} component={HomePage} exact />
          {/* When you're done studying the ExamplePage container, remove the following line and delete the ExamplePage container  */}
          <Route path={`/plugins/${pluginId}/example`} component={ExamplePage} exact />
          <Route component={NotFoundPage} />
        </Switch>
      </div>
    );
  }
}

App.contextTypes = {
  plugins: PropTypes.object,
  router: PropTypes.object.isRequired,
  updatePlugin: PropTypes.func,
};

App.propTypes = {
  history: PropTypes.object.isRequired,
};

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {},
    dispatch,
  );
}

const mapStateToProps = createStructuredSelector({});

// Wrap the component to inject dispatch and state into it
const withConnect = connect(mapStateToProps, mapDispatchToProps);

export default compose(
  withConnect,
)(App);
