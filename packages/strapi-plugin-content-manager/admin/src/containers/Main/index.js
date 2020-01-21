import React, { Suspense, lazy, useEffect, useRef } from 'react';
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
import {
  deleteLayout,
  deleteLayouts,
  getData,
  getLayout,
  resetProps,
} from './actions';
import reducer from './reducer';
import saga from './saga';
import makeSelectMain from './selectors';

const EditSettingsView = lazy(() => import('../EditSettingsView'));
const RecursivePath = lazy(() => import('../RecursivePath'));

function Main({
  deleteLayout,
  deleteLayouts,
  getData,
  getLayout,
  components,
  componentsAndModelsMainPossibleMainFields,
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
    !pathname.includes('ctm-configurations/') && layouts[slug] === undefined;

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
      deleteLayouts={deleteLayouts}
      emitEvent={emitEvent}
      components={components}
      componentsAndModelsMainPossibleMainFields={
        componentsAndModelsMainPossibleMainFields
      }
      layouts={layouts}
      models={models}
      plugins={plugins}
      {...props}
    />
  );
  const routes = [
    {
      path: 'ctm-configurations/edit-settings/:type/:componentSlug',
      comp: EditSettingsView,
    },
    { path: ':slug', comp: RecursivePath },
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
      <Suspense fallback={<LoadingIndicatorPage />}>
        <Switch>{routes}</Switch>
      </Suspense>
    </DndProvider>
  );
}

Main.propTypes = {
  deleteLayout: PropTypes.func.isRequired,
  deleteLayouts: PropTypes.func.isRequired,
  getData: PropTypes.func.isRequired,
  getLayout: PropTypes.func.isRequired,
  global: PropTypes.shape({
    currentEnvironment: PropTypes.string.isRequired,
    plugins: PropTypes.object,
  }).isRequired,
  components: PropTypes.array.isRequired,
  componentsAndModelsMainPossibleMainFields: PropTypes.object.isRequired,
  isLoading: PropTypes.bool.isRequired,
  layouts: PropTypes.object.isRequired,
  location: PropTypes.shape({
    pathname: PropTypes.string.isRequired,
    search: PropTypes.string,
  }).isRequired,
  models: PropTypes.array.isRequired,
  resetProps: PropTypes.func.isRequired,
};

const mapStateToProps = makeSelectMain();

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      deleteLayout,
      deleteLayouts,
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

export default compose(withConnect)(Main);
