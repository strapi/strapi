/**
 *
 * Initializer
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';


export class Initializer extends React.PureComponent { // eslint-disable-line react/prefer-stateless-function
  componentDidMount() {
    this.props.updatePlugin('upload', 'isReady', true);
  }

  render() {
    return null;
  }
}

Initializer.propTypes = {
  updatePlugin: PropTypes.func.isRequired,
};


function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {},
    dispatch,
  );
}

const withConnect = connect(null, mapDispatchToProps);

export default compose(
  withConnect,
)(Initializer);
