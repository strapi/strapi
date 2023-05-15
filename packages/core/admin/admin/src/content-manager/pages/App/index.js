import React, { useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Switch, Route, useRouteMatch, Redirect, useLocation } from 'react-router-dom';
import {
  CheckPagePermissions,
  LoadingIndicatorPage,
  AnErrorOccurred,
  useGuidedTour,
} from '@strapi/helper-plugin';
import { Layout, HeaderLayout, Main } from '@strapi/design-system';
import { useIntl } from 'react-intl';
import sortBy from 'lodash/sortBy';
import permissions from '../../../permissions';
import getTrad from '../../utils/getTrad';
import { DragLayer } from '../../../components/DragLayer';
import ModelsContext from '../../contexts/ModelsContext';
import CollectionTypeRecursivePath from '../CollectionTypeRecursivePath';
import ComponentSettingsView from '../ComponentSetttingsView';
import NoContentType from '../NoContentType';
import NoPermissions from '../NoPermissions';
import SingleTypeRecursivePath from '../SingleTypeRecursivePath';
import LeftMenu from './LeftMenu';
import useContentManagerInitData from './useContentManagerInitData';

import ItemTypes from '../../utils/ItemTypes';

import { CardDragPreview } from './components/CardDragPreview';
import { ComponentDragPreview } from './components/ComponentDragPreview';
import { RelationDragPreview } from './components/RelationDragPreview';

const cmPermissions = permissions.contentManager;

function renderDraglayerItem({ type, item }) {
  if ([ItemTypes.EDIT_FIELD, ItemTypes.FIELD].includes(type)) {
    return <CardDragPreview labelField={item.labelField} />;
  }

  /**
   * Because a user may have multiple relations / dynamic zones / repeable fields in the same content type,
   * we append the fieldName for the item type to make them unique, however, we then want to extract that
   * first type to apply the correct preview.
   */
  const [actualType] = type.split('_');

  switch (actualType) {
    case ItemTypes.COMPONENT:
    case ItemTypes.DYNAMIC_ZONE:
      return <ComponentDragPreview displayedValue={item.displayedValue} />;

    case ItemTypes.RELATION:
      return (
        <RelationDragPreview
          displayedValue={item.displayedValue}
          status={item.status}
          width={item.width}
        />
      );

    default:
      return null;
  }
}

const App = () => {
  const contentTypeMatch = useRouteMatch(`/content-manager/:kind/:uid`);
  const { status, collectionTypeLinks, singleTypeLinks, models, refetchData } =
    useContentManagerInitData();
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
      <DragLayer renderItem={renderDraglayerItem} />
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
          <Route path="" component={AnErrorOccurred} />
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
