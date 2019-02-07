/**
 *
 * Initializer
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';

import { initialize } from './actions';

import makeSelectInitializer from './selectors';
import reducer from './reducer';
import saga from './saga';

export class Initializer extends React.Component { // eslint-disable-line react/prefer-stateless-function
  componentDidMount() {
    this.props.initialize();
  }

  componentDidUpdate(prevProps) {
    const { shouldUpdate } = this.props;

    if (prevProps.shouldUpdate !== shouldUpdate) {
      // Emit the event 'pluginReady' so the app can start
      this.props.updatePlugin('users-permissions', 'isReady', true);
      // TODO: Should be improved
      const links = {
        links: [{
          label: 'Users',
          destination: 'user',
          plugin: 'content-manager',
        }],
        name: 'Content Types',
      };
      this.props.updatePlugin('users-permissions', 'leftMenuSections', [links]);

    }
  }

  render() {
    return null;
  }
}

Initializer.propTypes = {
  initialize: PropTypes.func.isRequired,
  shouldUpdate: PropTypes.bool.isRequired,
  updatePlugin: PropTypes.func.isRequired,
};

const mapStateToProps = makeSelectInitializer();

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      initialize,
    },
    dispatch,
  );
}

const withConnect = connect(mapStateToProps, mapDispatchToProps);

/* Remove this line if the container doesn't have a route and
*  check the documentation to see how to create the container's store
*/
const withReducer = strapi.injectReducer({ key: 'initializer', reducer, pluginId: 'users-permissions' });

/* Remove the line below the container doesn't have a route and
*  check the documentation to see how to create the container's store
*/
const withSaga = strapi.injectSaga({ key: 'initializer', saga, pluginId: 'users-permissions' });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(Initializer);
