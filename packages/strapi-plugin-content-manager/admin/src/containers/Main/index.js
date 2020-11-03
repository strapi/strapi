import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { bindActionCreators, compose } from 'redux';
import { Switch, Route } from 'react-router-dom';
import { LoadingIndicatorPage, request, CheckPagePermissions } from 'strapi-helper-plugin';
import { DndProvider } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import pluginId from '../../pluginId';
import pluginPermissions from '../../permissions';
import DragLayer from '../../components/DragLayer';
import getRequestUrl from '../../utils/getRequestUrl';
import CollectionTypeRecursivePath from '../CollectionTypeRecursivePath';
import EditSettingsView from '../EditSettingsView';
import SingleTypeRecursivePath from '../SingleTypeRecursivePath';
// import createPossibleMainFieldsForModelsAndComponents from './utils/createPossibleMainFieldsForModelsAndComponents';
import { getData, getDataSucceeded, resetProps } from './actions';
import makeSelectMain from './selectors';

// const EditSettingsView = lazy(() => import('../EditSettingsView'));
// const CollectionTypeRecursivePath = lazy(() => import('../CollectionTypeRecursivePath'));
// const SingleTypeRecursivePath = lazy(() => import('../SingleTypeRecursivePath'));

function Main({ getData, getDataSucceeded, isLoading, resetProps }) {
  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    const fetchData = async signal => {
      getData();
      console.log('up');

      try {
        const [{ data: components }, { data: models }] = await Promise.all(
          ['components', 'content-types'].map(endPoint =>
            request(getRequestUrl(endPoint), { method: 'GET', signal })
          )
        );

        getDataSucceeded(models, components);
      } catch (err) {
        console.error('CM/main', err);
        // TODO: new notif API
        strapi.notification.error('notification.error');
      }
    };

    fetchData(signal);

    return () => {
      abortController.abort();
      resetProps();
    };
  }, [getData, getDataSucceeded, resetProps]);

  if (isLoading) {
    return <LoadingIndicatorPage />;
  }

  const routes = [
    { path: 'singleType/:slug', comp: SingleTypeRecursivePath },
    { path: 'collectionType/:slug', comp: CollectionTypeRecursivePath },
  ].map(({ path, comp }) => (
    <Route key={path} path={`/plugins/${pluginId}/${path}`} component={comp} />
  ));

  return (
    <DndProvider backend={HTML5Backend}>
      <DragLayer />

      <Switch>
        <Route
          path={`/plugins/${pluginId}/ctm-configurations/edit-settings/:type/:componentSlug`}
          render={routeProps => (
            <CheckPagePermissions permissions={pluginPermissions.componentsConfigurations}>
              <EditSettingsView
                // currentEnvironment={currentEnvironment}
                // deleteLayout={deleteLayout}
                // deleteLayouts={deleteLayouts}
                // emitEvent={emitEvent}
                // components={components}
                // componentsAndModelsMainPossibleMainFields={
                //   componentsAndModelsMainPossibleMainFields
                // }
                // layouts={layouts}
                // models={models}
                // plugins={plugins}
                {...routeProps}
              />
            </CheckPagePermissions>
          )}
        />
        {routes}
      </Switch>
    </DndProvider>
  );
}

Main.propTypes = {
  getData: PropTypes.func.isRequired,
  getDataSucceeded: PropTypes.func.isRequired,
  isLoading: PropTypes.bool.isRequired,
  resetProps: PropTypes.func.isRequired,
};

const mapStateToProps = makeSelectMain();

export function mapDispatchToProps(dispatch) {
  return bindActionCreators(
    {
      getData,
      getDataSucceeded,
      resetProps,
    },
    dispatch
  );
}
const withConnect = connect(mapStateToProps, mapDispatchToProps);

export default compose(withConnect)(Main);
