import React, { memo, useEffect } from 'react';
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

import { getLayout } from './actions';
import reducer from './reducer';
import saga from './saga';
import makeSelectMain from './selectors';

function Main({ emitEvent, getLayout, layouts, location: { pathname } }) {
  strapi.useInjectReducer({ key: 'main', reducer, pluginId });
  strapi.useInjectSaga({ key: 'main', saga, pluginId });
  const slug = pathname.split('/')[3];
  const shouldShowLoader =
    slug !== 'ctm-configurations' && layouts[slug] === undefined;

  useEffect(() => {
    if (shouldShowLoader) {
      getLayout(slug);
    }
  }, [getLayout, shouldShowLoader, slug]);

  if (shouldShowLoader) {
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
  getLayout: PropTypes.func.isRequired,

  layouts: PropTypes.object.isRequired,
  location: PropTypes.shape({
    pathname: PropTypes.string.isRequired,
  }),
};

const mapStateToProps = makeSelectMain();

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      getLayout,
    },
    dispatch
  );
}
const withConnect = connect(
  mapStateToProps,
  mapDispatchToProps
);

export default compose(
  withConnect,
  memo
)(Main);
