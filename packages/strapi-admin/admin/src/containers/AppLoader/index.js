/**
 *
 * AppLoader
 *
 */

import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import makeSelectApp from '../App/selectors';

export const AppLoader = ({ children, hasAdminUser, isLoading }) => {
  return children({ hasAdminUser, shouldLoad: isLoading });
};

AppLoader.propTypes = {
  children: PropTypes.func.isRequired,
  hasAdminUser: PropTypes.bool.isRequired,
  isLoading: PropTypes.bool.isRequired,
};

const mapStateToProps = makeSelectApp();

export default connect(
  mapStateToProps,
  null
)(AppLoader);
