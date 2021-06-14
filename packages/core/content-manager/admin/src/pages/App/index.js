import React from 'react';
import { Switch, Route, useRouteMatch, Redirect } from 'react-router-dom';
import { CheckPagePermissions, LoadingIndicatorPage, NotFound } from '@strapi/helper-plugin';
import { DndProvider } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import pluginId from '../../pluginId';
import pluginPermissions from '../../permissions';
import DragLayer from '../../components/DragLayer';
import CollectionTypeRecursivePath from '../CollectionTypeRecursivePath';
import ComponentSettingsView from '../ComponentSetttingsView';
import SingleTypeRecursivePath from '../SingleTypeRecursivePath';
import LeftMenu from './LeftMenu';
import useModels from './useModels';

const App = () => {
  const contentTypeMatch = useRouteMatch(`/plugins/${pluginId}/:kind/:uid`);
  const { status, collectionTypeLinks, singleTypeLinks } = useModels();
  const models = [...collectionTypeLinks, ...singleTypeLinks];

  if (status === 'loading') {
    return <LoadingIndicatorPage />;
  }

  if (!contentTypeMatch && models.length > 0) {
    return <Redirect to={`${models[0].to}${models[0].search ? `?${models[0].search}` : ''}`} />;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <DragLayer />

      <div className="container-fluid">
        <div className="row">
          <LeftMenu />
          <div className="col-md-9 content" style={{ padding: '0 30px' }}>
            <Switch>
              <Route path={`/plugins/${pluginId}/components/:uid/configurations/edit`}>
                <CheckPagePermissions permissions={pluginPermissions.componentsConfigurations}>
                  <ComponentSettingsView />
                </CheckPagePermissions>
              </Route>
              <Route
                path={`/plugins/${pluginId}/collectionType/:slug`}
                component={CollectionTypeRecursivePath}
              />
              <Route
                path={`/plugins/${pluginId}/singleType/:slug`}
                component={SingleTypeRecursivePath}
              />
              <Route path="" component={NotFound} />
            </Switch>
          </div>
        </div>
      </div>
    </DndProvider>
  );
};

export default App;
