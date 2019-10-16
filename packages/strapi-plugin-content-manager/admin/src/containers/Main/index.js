import React, { memo, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { Switch, Route } from 'react-router-dom';
import {
  LoadingIndicatorPage,
  getQueryParameters,
  useGlobalContext,
} from 'strapi-helper-plugin';
import { DndProvider } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

import pluginId from '../../pluginId';

import DragLayer from '../../components/DragLayer';
import EditView from '../EditView';
import ListView from '../ListView';
import ListSettingsView from '../ListSettingsView';
import SettingViewModel from '../SettingViewModel';
import SettingViewGroup from '../SettingViewGroup';
import SettingsView from '../SettingsView';

import { deleteLayout, getData, getLayout, resetProps } from './actions';
import reducer from './reducer';
import saga from './saga';
import makeSelectMain from './selectors';

function Main({
  deleteLayout,
  getData,
  getLayout,
  groups,
  groupsAndModelsMainPossibleMainFields,
  isLoading,
  layouts,
  location: { pathname, search },
  global: { currentEnvironment, plugins },
  models,
  resetProps,
}) {
  strapi.useInjectReducer({ key: 'main', reducer, pluginId });
  strapi.useInjectSaga({ key: 'main', saga, pluginId });
  const { emitEvent } = useGlobalContext();
  const slug = pathname.split('/')[3];
  const source = getQueryParameters(search, 'source');
  const getDataRef = useRef();
  const getLayoutRef = useRef();
  const resetPropsRef = useRef();

  getDataRef.current = getData;
  getLayoutRef.current = getLayout;
  resetPropsRef.current = resetProps;

  const shouldShowLoader =
    slug !== 'ctm-configurations' && layouts[slug] === undefined;

  useEffect(() => {
    getDataRef.current();

    return () => {
      resetPropsRef.current();
    };
  }, [getDataRef]);
  useEffect(() => {
    if (shouldShowLoader) {
      getLayoutRef.current(slug, source);
    }
  }, [getLayoutRef, shouldShowLoader, slug, source]);

  if (isLoading || shouldShowLoader) {
    return <LoadingIndicatorPage />;
  }

  const renderRoute = (props, Component) => (
    <Component
      currentEnvironment={currentEnvironment}
      deleteLayout={deleteLayout}
      emitEvent={emitEvent}
      groups={groups}
      groupsAndModelsMainPossibleMainFields={
        groupsAndModelsMainPossibleMainFields
      }
      layouts={layouts}
      models={models}
      plugins={plugins}
      {...props}
    />
  );
  const routes = [
    {
      path: 'ctm-configurations/list-settings/:slug',
      comp: ListSettingsView,
    },
    {
      path: 'ctm-configurations/models/:name/:settingType',
      comp: SettingViewModel,
    },
    { path: 'ctm-configurations/groups/:name', comp: SettingViewGroup },
    { path: 'ctm-configurations/:type', comp: SettingsView },
    { path: ':slug/:id', comp: EditView },
    { path: ':slug', comp: ListView },
  ].map(({ path, comp }) => (
    <Route
      key={path}
      path={`/plugins/${pluginId}/${path}`}
      render={props => renderRoute(props, comp)}
    />
  ));

  return (
    <DndProvider backend={HTML5Backend}>
      <DragLayer />
      <Switch>{routes}</Switch>
    </DndProvider>
  );
}

Main.propTypes = {
  deleteLayout: PropTypes.func.isRequired,
  getData: PropTypes.func.isRequired,
  getLayout: PropTypes.func.isRequired,
  global: PropTypes.shape({
    currentEnvironment: PropTypes.string.isRequired,
    plugins: PropTypes.object,
  }),
  groups: PropTypes.array.isRequired,
  groupsAndModelsMainPossibleMainFields: PropTypes.object.isRequired,
  isLoading: PropTypes.bool,
  layouts: PropTypes.object.isRequired,
  location: PropTypes.shape({
    pathname: PropTypes.string.isRequired,
    search: PropTypes.string,
  }),
  models: PropTypes.array.isRequired,
  resetProps: PropTypes.func.isRequired,
};

const mapStateToProps = makeSelectMain();

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      deleteLayout,
      getData,
      getLayout,
      resetProps,
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
