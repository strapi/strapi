import React, { memo } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { Switch, Route } from 'react-router-dom';
import { LoadingIndicatorPage } from 'strapi-helper-plugin';

import pluginId from '../../pluginId';

import ListView from '../ListView';
import SettingViewModel from '../SettingViewModel';
import SettingViewGroup from '../SettingViewGroup';
import SettingsView from '../SettingsView';

import reducer from './reducer';
import saga from './saga';
import makeSelectMain from './selectors';

function Main({ isLoading, emitEvent, layouts }) {
  strapi.useInjectReducer({ key: 'main', reducer, pluginId });
  strapi.useInjectSaga({ key: 'main', saga, pluginId });

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  const renderRoute = (props, Component) => (
    <Component emitEvent={emitEvent} layouts={layouts} {...props} />
  );

  return (
    <Switch>
      <Route
        path={`/plugins/${pluginId}/ctm-configurations/models/:name/:settingType`}
        render={props => renderRoute(props, SettingViewModel)}
      />
      <Route
        path={`/plugins/${pluginId}/ctm-configurations/groups/:name`}
        component={SettingViewGroup}
      />
      <Route
        path={`/plugins/${pluginId}/ctm-configurations/:type`}
        render={props => renderRoute(props, SettingsView)}
      />
      <Route
        path={`/plugins/${pluginId}/:slug`}
        render={props => renderRoute(props, ListView)}
      />
    </Switch>
  );
}

Main.propTypes = {
  emitEvent: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  layouts: PropTypes.object.isRequired,
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
