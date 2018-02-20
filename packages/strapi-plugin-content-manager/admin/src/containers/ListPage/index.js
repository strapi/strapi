/**
 *
 * ListPage
 *
 */

import React from 'react';
// import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { createStructuredSelector } from 'reselect';
import cn from 'classnames';

// You can find these components in either
// ./node_modules/strapi-helper-plugin/lib/src
// or strapi/packages/strapi-helper-plugin/lib/src
import PluginHeader from 'components/PluginHeader';

// Utils located in `strapi/packages/strapi-helper-plugin/lib/src/utils`;
import injectReducer from 'utils/injectReducer';
import injectSaga from 'utils/injectSaga';
// import getQueryParameters from 'utils/getQueryParameters';

import reducer from './reducer';
import saga from './saga';
import makeSelectListPage from './selectors';

import styles from './styles.scss';

export class ListPage extends React.PureComponent {
  render() {
    return (
      <div>
        <div className={cn('container-fluid', styles.containerFluid)}>
          <PluginHeader
            title={{
              id: 'Content Manager',
            }}
          />
        </div>
      </div>
    );
  }
}

ListPage.contextTypes = {};

ListPage.defaultProps = {};

ListPage.propTypes = {};

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
    },
    dispatch,
  );
}

const mapStateToProps = createStructuredSelector({
  listPage: makeSelectListPage(),
});

const withConnect = connect(mapStateToProps, mapDispatchToProps);

const withReducer = injectReducer({ key: 'listPage', reducer });
const withSaga = injectSaga({ key: 'listPage', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(ListPage);
