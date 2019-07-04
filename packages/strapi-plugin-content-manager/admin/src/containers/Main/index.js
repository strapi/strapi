import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { Switch, Route } from 'react-router-dom';
import { LoadingIndicatorPage } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';

import SettingsView from '../SettingsView';

import reducer from './reducer';
import saga from './saga';
import makeSelectMain from './selectors';

function Main({ isLoading }) {
  strapi.useInjectReducer({ key: 'main', reducer, pluginId });
  strapi.useInjectSaga({ key: 'main', saga, pluginId });

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  return (
    <Switch>
      <Route
        path="/plugins/content-manager/ctm-configurations/:type"
        component={SettingsView}
      />
    </Switch>
  );
}

Main.propTypes = {
  isLoading: PropTypes.bool.isRequired,
};

const mapStateToProps = makeSelectMain();

export function mapDispatchToProps(dispatch) {
  return bindActionCreators({}, dispatch);
}
const withConnect = connect(
  mapStateToProps,
  mapDispatchToProps
);

export default compose(
  withConnect,
  memo
)(Main);
