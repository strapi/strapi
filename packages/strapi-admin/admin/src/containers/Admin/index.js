/**
 *
 * Admin
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { createStructuredSelector } from 'reselect';
import { bindActionCreators, compose } from 'redux';
// import { Switch, Route } from 'react-router-dom';

import FullStory from '../../components/FullStory';
import Header from '../../components/Header/index';
import LeftMenu from '../../containers/LeftMenu';
import LocaleToggle from '../LocaleToggle';

import makeSelecApp from '../App/selectors';

import injectSaga from '../../utils/injectSaga';
import injectReducer from '../../utils/injectReducer';

import localeToggleReducer from '../LocaleToggle/reducer';
import {
  resetLocaleDefaultClassName,
  setLocaleCustomClassName,
} from '../LocaleToggle/actions';

import {
  getInitData,
  hideLeftMenu,
  setAppError,
  showLeftMenu,
} from './actions';
import makeSelectAdmin from './selectors';
import reducer from './reducer';
import saga from './saga';

import NavTopRightWrapper from './NavTopRightWrapper';

import styles from './styles.scss';

export class Admin extends React.Component { // eslint-disable-line react/prefer-stateless-function
  isAcceptingTracking = () => {
    const { admin: { uuid } } = this.props;

    return !!uuid;
  }

  render() {
    const {
      admin: {
        layout,
        showLeftMenu,
        strapiVersion,
      },
      global: {
        plugins,
      },
    } = this.props;
    const contentWrapperStyle = showLeftMenu ? { main: {}, sub: styles.content } : { main: { width: '100%' }, sub: styles.wrapper };

    return (
      <div className={styles.adminPage}>
        {this.isAcceptingTracking() && <FullStory org="GK708" />}
        {showLeftMenu  && (
          <LeftMenu
            layout={layout}
            version={strapiVersion}
            plugins={plugins}
          />
        )}
        <NavTopRightWrapper>
          <LocaleToggle isLogged />
        </NavTopRightWrapper>
        <div className={styles.adminPageRightWrapper} style={contentWrapperStyle.main}>
          {showLeftMenu ? <Header /> : ''}
          <div className={contentWrapperStyle.sub}></div>
        </div>
      </div>
    );
  }
}

Admin.propTypes = {
  admin: PropTypes.shape({
    autoReload: PropTypes.bool,
    appError: PropTypes.bool,
    currentEnvironment: PropTypes.string,
    isLoading: PropTypes.bool,
    layout: PropTypes.object,
    showLeftMenu: PropTypes.bool,
    strapiVersion: PropTypes.string,
    uuid: PropTypes.oneOfType([
      PropTypes.bool,
      PropTypes.string,
    ]),
  }).isRequired,
  global: PropTypes.shape({
    appPlugins: PropTypes.array,
    blockApp: PropTypes.bool,
    overlayBlockerData: PropTypes.object,
    isAppLoading: PropTypes.bool,
    plugins: PropTypes.object,
    showGlobalAppBlocker: PropTypes.bool,
  }).isRequired,
};

const mapStateToProps = createStructuredSelector({
  admin: makeSelectAdmin(),
  global: makeSelecApp(),
});

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      getInitData,
      hideLeftMenu,
      resetLocaleDefaultClassName,
      setAppError,
      setLocaleCustomClassName,
      showLeftMenu,
    },
    dispatch,
  );
}

const withConnect = connect(mapStateToProps, mapDispatchToProps);
const withReducer = injectReducer({ key: 'admin', reducer });
const withSaga = injectSaga({ key: 'admin', saga });
const withLocaleToggleReducer = injectReducer({ key: 'localeToggle', reducer: localeToggleReducer });

export default compose(
  withReducer,
  withLocaleToggleReducer,
  withSaga,
  withConnect,
)(Admin);
