import React, { useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Switch, Route, useRouteMatch, Redirect, useLocation } from 'react-router-dom';
import {
  CheckPagePermissions,
  LoadingIndicatorPage,
  NotFound,
  useGuidedTour,
} from '@strapi/helper-plugin';
import { Layout, HeaderLayout, Main } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import sortBy from 'lodash/sortBy';
import permissions from '../../../permissions';
import getTrad from '../../utils/getTrad';
import DragLayer from '../../components/DragLayer';
import ModelsContext from '../../contexts/ModelsContext';
import CollectionTypeRecursivePath from '../CollectionTypeRecursivePath';
import ComponentSettingsView from '../ComponentSetttingsView';
import NoContentType from '../NoContentType';
import NoPermissions from '../NoPermissions';
import SingleTypeRecursivePath from '../SingleTypeRecursivePath';
import LeftMenu from './LeftMenu';
import useModels from './useModels';

const cmPermissions = permissions.contentManager;

const App = () => {
  const contentTypeMatch = useRouteMatch(`/content-manager/:kind/:uid`);
  const { status, collectionTypeLinks, singleTypeLinks, models, refetchData } = useModels();
  const authorisedModels = sortBy([...collectionTypeLinks, ...singleTypeLinks], (model) =>
    model.title.toLowerCase()
  );
  const { pathname } = useLocation();
  const { formatMessage } = useIntl();
  const { startSection } = useGuidedTour();
  const startSectionRef = useRef(startSection);

  useEffect(() => {
    if (startSectionRef.current) {
      startSectionRef.current('contentManager');
    }
  }, []);

  if (status === 'loading') {
    return (
      <Main aria-busy="true">
        <HeaderLayout
          title={formatMessage({
            id: getTrad('header.name'),
            defaultMessage: 'Content',
          })}
        />
        <LoadingIndicatorPage />
      </Main>
    );
  }

  // Array of models that are displayed in the content manager
  const supportedModelsToDisplay = models.filter(({ isDisplayed }) => isDisplayed);

  // Redirect the user to the 403 page
  if (
    authorisedModels.length === 0 &&
    supportedModelsToDisplay.length > 0 &&
    pathname !== '/content-manager/403'
  ) {
    return <Redirect to="/content-manager/403" />;
  }

  // Redirect the user to the create content type page
  if (supportedModelsToDisplay.length === 0 && pathname !== '/content-manager/no-content-types') {
    return <Redirect to="/content-manager/no-content-types" />;
  }

  if (!contentTypeMatch && authorisedModels.length > 0) {
    return (
      <Redirect
        to={`${authorisedModels[0].to}${
          authorisedModels[0].search ? `?${authorisedModels[0].search}` : ''
        }`}
      />
    );
  }

  return (
    <Layout sideNav={<LeftMenu />}>
      <DragLayer />
      <ModelsContext.Provider value={{ refetchData }}>
        <Switch>
          <Route path="/content-manager/components/:uid/configurations/edit">
            <CheckPagePermissions permissions={cmPermissions.componentsConfigurations}>
              <ComponentSettingsView />
            </CheckPagePermissions>
          </Route>
          <Route
            path="/content-manager/collectionType/:slug"
            component={CollectionTypeRecursivePath}
          />
          <Route path="/content-manager/singleType/:slug" component={SingleTypeRecursivePath} />

          <Route path="/content-manager/403">
            <NoPermissions />
          </Route>
          <Route path="/content-manager/no-content-types">
            <NoContentType />
          </Route>
          <Route path="" component={NotFound} />
        </Switch>
      </ModelsContext.Provider>
    </Layout>
  );
};

export { App };

export default function () {
  const { formatMessage } = useIntl();

  return (
    <>
      <Helmet
        title={formatMessage({ id: getTrad('plugin.name'), defaultMessage: 'Content Manager' })}
      />
      <App />
    </>
  );
}
