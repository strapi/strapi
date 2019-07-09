import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { Switch, Route } from 'react-router-dom';
import { LoadingIndicatorPage } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';

import SettingViewModel from '../SettingViewModel';
import SettingViewGroup from '../SettingViewGroup';
import SettingsView from '../SettingsView';

import reducer from './reducer';
import saga from './saga';
import makeSelectMain from './selectors';

function Main({ isLoading, emitEvent }) {
  strapi.useInjectReducer({ key: 'main', reducer, pluginId });
  strapi.useInjectSaga({ key: 'main', saga, pluginId });

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  const renderRoute = props => (
    <SettingsView emitEvent={emitEvent} {...props} />
  );

  return (
    <Switch>
      <Route
        path="/plugins/content-manager/ctm-configurations/models/:name/:settingType"
        component={SettingViewModel}
      />
      <Route
        path="/plugins/content-manager/ctm-configurations/groups/:name"
        component={SettingViewGroup}
      />
      <Route
        path="/plugins/content-manager/ctm-configurations/:type"
        render={renderRoute}
      />
    </Switch>
  );
}

Main.propTypes = {
  emitEvent: PropTypes.func.isRequired,
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
