/**
 *
 * ConfigPage
 *
 */

import React from 'react';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';

// You can find these utils in either
// ./node_modules/strapi-helper-plugin/lib/src
// or strapi/packages/strapi-helper-plugin/lib/src
import injectReducer from 'utils/injectReducer';
import injectSaga from 'utils/injectSaga';

import reducer from './reducer';
import saga from './saga';
import selectConfigPage from './selectors';

class ConfigPage extends React.PureComponent {
  render() {
    return (
      <div>ConfigPage container</div>
    );
  }
}

ConfigPage.defaultProps = {};
ConfigPage.propTypes = {};

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {},
    dispatch,
  );
}

const mapStateToProps = selectConfigPage;

const withConnect = connect(mapStateToProps, mapDispatchToProps);

const withReducer = injectReducer({ key: 'configPage', reducer });
const withSaga = injectSaga({ key: 'configPage', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(ConfigPage);
