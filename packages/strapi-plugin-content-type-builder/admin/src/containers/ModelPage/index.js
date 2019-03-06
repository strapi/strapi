/**
 *
 * ModelPage
 *
 */

import React from 'react';
// import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { bindActionCreators, compose } from 'redux';
import pluginId from '../../pluginId';

import PluginLeftMenu from '../../components/PluginLeftMenu';

import makeSelectModelPage from './selectors';
import reducer from './reducer';
import saga from './saga';
import styles from './styles.scss';

export class ModelPage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div className={styles.modelpage}>
        <div className="container-fluid">
          <div className="row">
            <PluginLeftMenu
              sections={[]}
            />
          </div>
        </div>
      </div>
    );
  }
}

ModelPage.propTypes = {};

const mapStateToProps = createStructuredSelector({
  modelpage: makeSelectModelPage(),
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
const withReducer = strapi.injectReducer({ key: 'modelPage', reducer, pluginId });

/* Remove the line below the container doesn't have a route and
*  check the documentation to see how to create the container's store
*/
const withSaga = strapi.injectSaga({ key: 'modelPage', saga, pluginId });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(ModelPage);
