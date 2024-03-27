/* eslint-disable check-file/filename-naming-convention */
import * as React from 'react';

import { AnyAction } from '@reduxjs/toolkit';
import { Layout as DSLayout } from '@strapi/design-system';
import { produce } from 'immer';
import { useIntl } from 'react-intl';
import { Navigate, Outlet, useLocation, useMatch } from 'react-router-dom';

import { DragLayer, DragLayerProps } from '../components/DragLayer';
import { useGuidedTour } from '../components/GuidedTour/Provider';
import { Page } from '../components/PageHelpers';

import { CardDragPreview } from './components/DragPreviews/CardDragPreview';
import { ComponentDragPreview } from './components/DragPreviews/ComponentDragPreview';
import { RelationDragPreview } from './components/DragPreviews/RelationDragPreview';
import { LeftMenu } from './components/LeftMenu';
import { ItemTypes } from './constants/dragAndDrop';
import { useIsHistoryRoute } from './history/routes';
import { useContentManagerInitData } from './hooks/useContentManagerInitData';
import { getTranslation } from './utils/translations';

import type { ContentManagerLink } from './hooks/useContentManagerInitData';
import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';

/* -------------------------------------------------------------------------------------------------
 * Layout
 * -----------------------------------------------------------------------------------------------*/

const Layout = () => {
  const contentTypeMatch = useMatch('/content-manager/:kind/:uid/*');

  const { isLoading, collectionTypeLinks, models, singleTypeLinks } = useContentManagerInitData();
  const authorisedModels = [...collectionTypeLinks, ...singleTypeLinks].sort((a, b) =>
    a.title.localeCompare(b.title)
  );

  const { pathname } = useLocation();
  const { formatMessage } = useIntl();
  const startSection = useGuidedTour('Layout', (state) => state.startSection);
  const startSectionRef = React.useRef(startSection);

  // Check if we're on a history route to known if we should render the left menu
  const isHistoryRoute = useIsHistoryRoute();

  React.useEffect(() => {
    if (startSectionRef.current) {
      startSectionRef.current('contentManager');
    }
  }, []);

  if (isLoading) {
    return (
      <>
        <Page.Title>
          {formatMessage({
            id: getTranslation('plugin.name'),
            defaultMessage: 'Content Manager',
          })}
        </Page.Title>
        <Page.Loading />
      </>
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
    return <Navigate to="/403" />;
  }

  // Redirect the user to the create content type page
  if (supportedModelsToDisplay.length === 0 && pathname !== '/no-content-types') {
    return <Navigate to="/no-content-types" />;
  }

  if (!contentTypeMatch && authorisedModels.length > 0) {
    return (
      <Navigate
        to={{
          pathname: authorisedModels[0].to,
          search: authorisedModels[0].search ?? '',
        }}
      />
    );
  }

  return (
    <>
      <Page.Title>
        {formatMessage({
          id: getTranslation('plugin.name'),
          defaultMessage: 'Content Manager',
        })}
      </Page.Title>
      {isHistoryRoute ? (
        <Outlet />
      ) : (
        <DSLayout sideNav={<LeftMenu />}>
          <DragLayer renderItem={renderDraglayerItem} />
          <Outlet />
        </DSLayout>
      )}
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * renderDraglayerItem
 * -----------------------------------------------------------------------------------------------*/

function renderDraglayerItem({ type, item }: Parameters<DragLayerProps['renderItem']>[0]) {
  if (!type || (type && typeof type !== 'string')) {
    return null;
  }

  /**
   * Because a user may have multiple relations / dynamic zones / repeable fields in the same content type,
   * we append the fieldName for the item type to make them unique, however, we then want to extract that
   * first type to apply the correct preview.
   */
  const [actualType] = type.split('_');

  switch (actualType) {
    case ItemTypes.EDIT_FIELD:
    case ItemTypes.FIELD:
      return <CardDragPreview label={item.label} />;
    case ItemTypes.COMPONENT:
    case ItemTypes.DYNAMIC_ZONE:
      return <ComponentDragPreview displayedValue={item.displayedValue} />;

    case ItemTypes.RELATION:
      return <RelationDragPreview {...item} />;

    default:
      return null;
  }
}

/* -------------------------------------------------------------------------------------------------
 * reducer
 * -----------------------------------------------------------------------------------------------*/

export const SET_INIT_DATA = 'ContentManager/App/SET_INIT_DATA';

interface SetInitDataAction {
  type: typeof SET_INIT_DATA;
  authorizedCollectionTypeLinks: ContentManagerAppState['collectionTypeLinks'];
  authorizedSingleTypeLinks: ContentManagerAppState['singleTypeLinks'];
  components: ContentManagerAppState['components'];
  contentTypeSchemas: ContentManagerAppState['models'];
  fieldSizes: ContentManagerAppState['fieldSizes'];
}

interface ContentManagerAppState {
  collectionTypeLinks: ContentManagerLink[];
  components: Contracts.Init.GetInitData.Response['data']['components'];
  fieldSizes: Contracts.Init.GetInitData.Response['data']['fieldSizes'];
  models: Contracts.Init.GetInitData.Response['data']['contentTypes'];
  singleTypeLinks: ContentManagerLink[];
  isLoading: boolean;
}

const initialState = {
  collectionTypeLinks: [],
  components: [],
  fieldSizes: {},
  models: [],
  singleTypeLinks: [],
  isLoading: true,
} satisfies ContentManagerAppState;

const reducer = (state: ContentManagerAppState = initialState, action: AnyAction) =>
  produce(state, (draftState) => {
    switch (action.type) {
      case SET_INIT_DATA: {
        const initDataAction = action as SetInitDataAction;
        draftState.collectionTypeLinks = initDataAction.authorizedCollectionTypeLinks.filter(
          ({ isDisplayed }) => isDisplayed
        );
        draftState.singleTypeLinks = initDataAction.authorizedSingleTypeLinks.filter(
          ({ isDisplayed }) => isDisplayed
        );
        draftState.components = initDataAction.components;
        draftState.models = initDataAction.contentTypeSchemas;
        draftState.fieldSizes = initDataAction.fieldSizes;
        draftState.isLoading = false;
        break;
      }
      default:
        return draftState;
    }
  });

export { Layout, reducer };
export type { ContentManagerAppState };
