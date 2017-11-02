/**
 *
 * ListPluginsPage
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { Helmet } from 'react-helmet';
import { createStructuredSelector } from 'reselect';
import { bindActionCreators, compose } from 'redux';
import { FormattedMessage } from 'react-intl';
import cn from 'classnames';

import PluginHeader from 'components/PluginHeader';

import injectSaga from 'utils/injectSaga';
import injectReducer from 'utils/injectReducer';
import makeSelectListPluginsPage from './selectors';
import reducer from './reducer';
import saga from './saga';
import styles from './styles.scss';

export class ListPluginsPage extends React.Component { // eslint-disable-line react/prefer-stateless-function
  render() {
    return (
      <div>
        <FormattedMessage id="app.components.ListPluginsPage.helmet.title">
          {(message) => (
            <Helmet>
              <title>{message}</title>
              <meta name="description" content="Description of ListPluginsPage" />
            </Helmet>
          )}
        </FormattedMessage>
        <div className={cn('container-fluid', styles.listPluginsPage)}>
          <PluginHeader
            title={{
              id: 'app.components.ListPluginsPage.title',
            }}
            description={{
              id: 'app.components.ListPluginsPage.description',
            }}
            actions={[]}
          />
        </div>
      </div>
    );
  }
}

ListPluginsPage.contextTypes = {
  plugins: PropTypes.object,
};

ListPluginsPage.propTypes = {
  // dispatch: PropTypes.func.isRequired,
};

const mapStateToProps = createStructuredSelector({
  listpluginspage: makeSelectListPluginsPage(),
});

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {},
    dispatch
  );
}

const withConnect = connect(mapStateToProps, mapDispatchToProps);

/* Remove this line if the container doesn't have a route and
*  check the documentation to see how to create the container's store
*/
const withReducer = injectReducer({ key: 'listPluginsPage', reducer });

/* Remove the line below the container doesn't have a route and
*  check the documentation to see how to create the container's store
*/
const withSaga = injectSaga({ key: 'listPluginsPage', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(ListPluginsPage);
