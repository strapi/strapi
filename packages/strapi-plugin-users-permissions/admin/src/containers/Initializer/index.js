/**
 *
 * Initializer
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import pluginId from '../../pluginId';

import { initialize } from './actions';

import makeSelectInitializer from './selectors';
import reducer from './reducer';
import saga from './saga';

class Initializer extends React.Component {
  // eslint-disable-line react/prefer-stateless-function
  componentDidMount() {
    this.props.initialize();
    this.props.unsetAppSecured();
  }

  componentDidUpdate(prevProps) {
    const { shouldUpdate, updatePlugin } = this.props;

    if (prevProps.shouldUpdate !== shouldUpdate) {
      // Emit the event 'pluginReady' so the app can start
      updatePlugin('users-permissions', 'isReady', true);
    }
  }

  render() {
    return null;
  }
}

Initializer.propTypes = {
  initialize: PropTypes.func.isRequired,
  shouldUpdate: PropTypes.bool.isRequired,
  unsetAppSecured: PropTypes.func.isRequired,
  updatePlugin: PropTypes.func.isRequired,
};

const mapStateToProps = makeSelectInitializer();

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      initialize,
    },
    dispatch,
  );
}

const withConnect = connect(
  mapStateToProps,
  mapDispatchToProps,
);

/* Remove this line if the container doesn't have a route and
 *  check the documentation to see how to create the container's store
 */

const withReducer = strapi.injectReducer({ key: 'initializer', reducer, pluginId });

/* Remove the line below the container doesn't have a route and
 *  check the documentation to see how to create the container's store
 */
const withSaga = strapi.injectSaga({ key: 'initializer', saga, pluginId });

export { Initializer };
export default compose(
  withReducer,
  withSaga,
  withConnect,
)(Initializer);
