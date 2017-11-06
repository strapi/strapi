/*
 *
 * HomePage
 *
 */

import React from 'react';
// import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { injectIntl } from 'react-intl';
import { bindActionCreators, compose } from 'redux';
import cn from 'classnames';

// Design
import HeaderNav from 'components/HeaderNav';
import PluginHeader from 'components/PluginHeader';

// Utils
import injectReducer from 'utils/injectReducer';
import injectSaga from 'utils/injectSaga';

// Selectors
import selectHomePage from './selectors';

// Styles
import styles from './styles.scss';

import reducer from './reducer';
import saga from './saga';

export class HomePage extends React.Component {
  render() {
    return (
      <div>
        <div className={cn('container-fluid', styles.containerFluid)}>
          <PluginHeader
            title={{ id: 'users-permissions.HomePage.header.title' }}
            description={{ id: 'users-permissions.HomePage.header.description' }}
            actions={[]}
          />
          <HeaderNav />
        </div>
      </div>
    );
  }
}

HomePage.contextTypes = {
  // router: PropTypes.object,
};

HomePage.propTypes = {
  // homePage: PropTypes.object,
};

function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      // Your actions here
    },
    dispatch,
  );
}

const mapStateToProps = createStructuredSelector({
  homePage: selectHomePage(),
});

const withConnect = connect(mapStateToProps, mapDispatchToProps);

const withReducer = injectReducer({ key: 'homePage', reducer });
const withSaga = injectSaga({ key: 'homePage', saga });

export default compose(
  withReducer,
  withSaga,
  withConnect,
)(injectIntl(HomePage));
