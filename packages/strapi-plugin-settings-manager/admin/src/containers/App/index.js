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
import { bindActionCreators, compose } from 'redux';
import 'flag-icon-css/css/flag-icon.css';
import 'react-select/dist/react-select.css';
import { Switch, Route } from 'react-router-dom';

import { pluginId } from 'app';

import injectSaga from 'utils/injectSaga';

import HomePage from 'containers/HomePage';

import { menuFetch, environmentsFetch } from './actions';
import { makeSelectLoading } from './selectors';
import styles from './styles.scss';

import saga from './sagas';

class App extends React.Component {
  componentDidMount() {
    this.props.menuFetch();
    this.props.environmentsFetch();
  }

  render() {
    if (this.props.loading) {
      return <div />;
    }

    return (
      <div className={`${pluginId} ${styles.app}`}>
        <Switch>
          <Route path="/plugins/settings-manager/:slug/:env" component={HomePage} />
          <Route path="/plugins/settings-manager/:slug" component={HomePage} />
          <Route path="/plugins/settings-manager" component={HomePage} />
        </Switch>
      </div>
    );
  }
}

App.contextTypes = {
  router: PropTypes.object.isRequired,
};

App.propTypes = {
  environmentsFetch: PropTypes.func.isRequired,
  loading: PropTypes.bool.isRequired,
  menuFetch: PropTypes.func.isRequired,
};

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      menuFetch,
      environmentsFetch,
    },
    dispatch
  );
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
