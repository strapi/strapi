/**
 *
 * Initializer
 *
 */

import React from 'react';
// import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { bindActionCreators, compose } from 'redux';
import pluginId from 'pluginId';


import makeSelectInitializer from './selectors';
import reducer from './reducer';
import saga from './saga';

export class Initializer extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return null;
  }
}

Initializer.propTypes = {};

const mapStateToProps = createStructuredSelector({
  initializer: makeSelectInitializer(),
});

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {},
    dispatch,
  );
}

const withConnect = connect(mapStateToProps, mapDispatchToProps);

/* Remove this line if the container doesn't have a route and
*  check the documentation to see how to create the container's store
*/
const withReducer = strapi.injectReducer({ key: 'initializer', reducer, pluginId });

/* Remove the line below the container doesn't have a route and
*  check the documentation to see how to create the container's store
*/
const withSaga = strapi.injectSaga({ key: 'initializer', saga, pluginId });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(Initializer);
