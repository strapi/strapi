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

import makeSelectAdmin from './selectors';
import reducer from './reducer';
import saga from './saga';

export class Admin extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  render() {
    return <div />;
  }
}

Admin.propTypes = {};

const mapStateToProps = createStructuredSelector({
  admin: makeSelectAdmin(),
});

function mapDispatchToProps(dispatch) {
  return bindActionCreators({}, dispatch);
}

const withConnect = connect(
  mapStateToProps,
  mapDispatchToProps,
);

/* Remove this line if the container doesn't have a route and
 *  check the documentation to see how to create the container's store
 */
const withReducer = strapi.injectReducer({ key: 'admin', reducer });

/* Remove the line below the container doesn't have a route and
 *  check the documentation to see how to create the container's store
 */
const withSaga = strapi.injectSaga({ key: 'admin', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(Admin);
