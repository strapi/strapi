/**
 *
 * Admin
 *
 */

import React from 'react';
// import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { bindActionCreators, compose } from 'redux';
// import { Switch, Route } from 'react-router-dom';

// import FullStory from '../../components/FullStory';
// import LeftMenu from '../../containers/LeftMenu';
// import Header from '../../components/Header/index';

import injectSaga from '../../utils/injectSaga';
import injectReducer from '../../utils/injectReducer';

import {
  getInitData,
  hideLeftMenu,
  setAppError,
  showLeftMenu,
} from './actions';
import makeSelectAdmin from './selectors';
import reducer from './reducer';
import saga from './saga';

export class Admin extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div>
      </div>
    );
  }
}

Admin.propTypes = {};

const mapStateToProps = createStructuredSelector({
  admin: makeSelectAdmin(),
});

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      getInitData,
      hideLeftMenu,
      setAppError,
      showLeftMenu,
    },
    dispatch,
  );
}

const withConnect = connect(mapStateToProps, mapDispatchToProps);

/* Remove this line if the container doesn't have a route and
*  check the documentation to see how to create the container's store
*/
const withReducer = injectReducer({ key: 'admin', reducer });

/* Remove the line below the container doesn't have a route and
*  check the documentation to see how to create the container's store
*/
const withSaga = injectSaga({ key: 'admin', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(Admin);
