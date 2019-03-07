/**
 *
 * App
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { Switch, Route } from 'react-router-dom';

import Loader from './Loader';
import pluginId from '../../pluginId';

import HomePage from '../HomePage';
import ModelPage from '../ModelPage';
import NotFoundPage from '../NotFoundPage';

import { getData, deleteModel } from './actions';

import reducer from './reducer';
import saga from './saga';
import makeSelectApp from './selectors';

import styles from './styles.scss';

const ROUTES = [
  {
    component: HomePage,
    to: `/plugins/${pluginId}`,
  },
  {
    component: ModelPage,
    to: `/plugins/${pluginId}/models/:modelName`,
  },
];

export class App extends React.Component { // eslint-disable-line react/prefer-stateless-function
  componentDidMount() {
    this.props.getData();
  }

  renderRoute = (route) => {
    const { component: Component, to } = route;

    /* istanbul ignore next */
    return (
      <Route
        key={to}
        path={to}
        render={props => <Component {...this.props} {...props} />}
        exact
      />
    );
  }

  render() {
    const { isLoading } = this.props;

    if (isLoading) {
      return <Loader />;
    }

    return (
      <div className={styles.app}>
        <Switch>
          {ROUTES.map(this.renderRoute)}
          <Route component={NotFoundPage} />
        </Switch>
      </div>
    );
  }
}

App.propTypes = {
  deleteModel: PropTypes.func.isRequired,
  getData: PropTypes.func.isRequired,
};

const mapStateToProps = makeSelectApp();

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      deleteModel,
      getData,
    },
    dispatch,
  );
}

const withConnect = connect(mapStateToProps, mapDispatchToProps);
const withReducer = strapi.injectReducer({ key: 'app', reducer, pluginId });
const withSaga = strapi.injectSaga({ key: 'app', saga, pluginId });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(App);
