/**
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
// import { withRouter } from 'react-router';
import { createStructuredSelector } from 'reselect';
import { Switch, Route } from 'react-router-dom';
import PropTypes from 'prop-types';
import { pluginId } from 'app';

import HomePage from 'containers/HomePage';
import ModelPage from 'containers/ModelPage';
import formSaga from 'containers/Form/sagas';
import formReducer from 'containers/Form/reducer';

import { makeSelectShouldRefetchContentType } from 'containers/Form/selectors';

// Utils
import injectSaga from 'utils/injectSaga';
import injectReducer from 'utils/injectReducer';
import { storeData } from '../../utils/storeData';

import styles from './styles.scss';
import { modelsFetch } from './actions';
import { makeSelectMenu } from './selectors';
import saga from './sagas';

/* eslint-disable consistent-return */
class App extends React.Component {
  componentDidMount() {
    this.props.modelsFetch();
    // TODO change to router V4
    // this.props.router.setRouteLeaveHook(this.props.route, () => {
    //   if (storeData.getContentType()) {
    //     return 'You have unsaved Content Type, are you sure you wan\'t to leave?';
    //   }
    // });
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.shouldRefetchContentType !== this.props.shouldRefetchContentType) {
      this.props.modelsFetch();
    }
  }


  componentWillUnmount() {
    // Empty the app localStorage
    storeData.clearAppStorage();
  }

  render() {
    // Assign plugin component to children
    // const content = React.Children.map(this.props.children, child =>
    //   React.cloneElement(child, {
    //     exposedComponents: this.props.exposedComponents,
    //     menu: this.props.menu,
    //   })
    // );

    // return (
    //   <div className={`${pluginId} ${styles.app}`}>
    //     {React.Children.toArray(content)}
    //   </div>
    // );
    return (
      <div className={`${pluginId} ${styles.app}`}>
        <Switch>
          <Route exact path="/plugins/content-type-builder" component={HomePage} menu={this.props.menu} />
          <Route path="/plugins/content-type-builder/models/:modelName" component={ModelPage} menu={this.props.menu} />
        </Switch>
      </div>
    );
  }
}

App.contextTypes = {
  router: PropTypes.object.isRequired,
};

App.propTypes = {
  menu: PropTypes.array,
  modelsFetch: PropTypes.func,
  shouldRefetchContentType: PropTypes.bool,
};

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      modelsFetch,
    },
    dispatch
  )
}

const mapStateToProps = createStructuredSelector({
  menu: makeSelectMenu(),
  shouldRefetchContentType: makeSelectShouldRefetchContentType(),
});

const withConnect = connect(mapStateToProps, mapDispatchToProps);
const withSaga = injectSaga({ key: 'global', saga });
const withFormReducer = injectReducer({ key: 'form', reducer: formReducer });
const withFormSaga = injectSaga({ key: 'form', saga: formSaga });
export default compose(
  withFormReducer,
  withFormSaga,
  withSaga,
  withConnect,
)(App);
