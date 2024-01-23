import * as React from 'react';

import { createSelector } from '@reduxjs/toolkit';
import { HeaderLayout, Layout, Main } from '@strapi/design-system';
import {
  AnErrorOccurred,
  CheckPagePermissions,
  LoadingIndicatorPage,
  useGuidedTour,
} from '@strapi/helper-plugin';
import produce from 'immer';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import { Redirect, Route, Switch, useLocation, useRouteMatch } from 'react-router-dom';

import { DragLayer, DragLayerProps } from '../../components/DragLayer';
import { RootState } from '../../core/store/configure';
import { useTypedSelector } from '../../core/store/hooks';
import { CardDragPreview } from '../components/DragPreviews/CardDragPreview';
import { ComponentDragPreview } from '../components/DragPreviews/ComponentDragPreview';
import { RelationDragPreview } from '../components/DragPreviews/RelationDragPreview';
import { LeftMenu } from '../components/LeftMenu';
import { ModelsContext } from '../contexts/models';
import { useContentManagerInitData } from '../hooks/useContentManagerInitData';
import { ItemTypes } from '../utils/dragAndDrop';
import { getTranslation } from '../utils/translations';

import { CollectionTypePages } from './CollectionTypePages';
import { ComponentSettingsView } from './ComponentSettingsView';
import { NoContentType } from './NoContentTypePage';
import { NoPermissions } from './NoPermissionsPage';

import type { ContentManagerLink } from '../hooks/useContentManagerInitData';
import type { Contracts } from '@strapi/plugin-content-manager/_internal/shared';

/* -------------------------------------------------------------------------------------------------
 * App
 * -----------------------------------------------------------------------------------------------*/

const App = () => {
  const contentTypeMatch = useRouteMatch(`/content-manager/:kind/:uid`);
  const { status, collectionTypeLinks, singleTypeLinks, models, refetchData } =
    useContentManagerInitData();
  const authorisedModels = [...collectionTypeLinks, ...singleTypeLinks].sort((a, b) =>
    a.title.localeCompare(b.title)
  );
  const { pathname } = useLocation();
  const { formatMessage } = useIntl();
  const { startSection } = useGuidedTour();
  const startSectionRef = React.useRef(startSection);
  const permissions = useTypedSelector((state) => state.admin_app.permissions);

  React.useEffect(() => {
    if (startSectionRef.current) {
      startSectionRef.current('contentManager');
    }
  }, []);

  if (status === 'loading') {
    return (
      <Main aria-busy="true">
        <Helmet
          title={formatMessage({
            id: getTranslation('plugin.name'),
            defaultMessage: 'Content Manager',
          })}
        />
        <HeaderLayout
          title={formatMessage({
            id: getTranslation('header.name'),
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
        to={{
          pathname: authorisedModels[0].to,
          search: authorisedModels[0].search ?? '',
        }}
      />
    );
  }

  return (
    <>
      <Helmet
        title={formatMessage({
          id: getTranslation('plugin.name'),
          defaultMessage: 'Content Manager',
        })}
      />
      <Layout sideNav={<LeftMenu />}>
        <DragLayer renderItem={renderDraglayerItem} />
        <ModelsContext.Provider value={{ refetchData }}>
          <Switch>
            <Route path="/content-manager/components/:uid/configurations/edit">
              <CheckPagePermissions
                permissions={permissions.contentManager?.componentsConfigurations}
              >
                <ComponentSettingsView />
              </CheckPagePermissions>
            </Route>
            {/* These redirects exist because we've changed to use the same term in `:collectionType` as the admin API for simplicity */}
            <Redirect
              from="/content-manager/collectionType/:slug"
              to="/content-manager/collection-types/:slug"
            />
            <Redirect
              from="/content-manager/singleType/:slug"
              to="/content-manager/single-types/:slug"
            />
            <Route path="/content-manager/:collectionType/:slug" component={CollectionTypePages} />
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
      return <CardDragPreview labelField={item.labelField} />;
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

/* -------------------------------------------------------------------------------------------------
 * reducer
 * -----------------------------------------------------------------------------------------------*/

const GET_INIT_DATA = 'ContentManager/App/GET_INIT_DATA';
const RESET_INIT_DATA = 'ContentManager/App/RESET_INIT_DATA';
const SET_INIT_DATA = 'ContentManager/App/SET_INIT_DATA';

interface GetInitDataAction {
  type: typeof GET_INIT_DATA;
}

interface ResetInitDataAction {
  type: typeof RESET_INIT_DATA;
}

interface SetInitDataAction {
  type: typeof SET_INIT_DATA;
  data: {
    authorizedCollectionTypeLinks: ContentManagerAppState['collectionTypeLinks'];
    authorizedSingleTypeLinks: ContentManagerAppState['singleTypeLinks'];
    components: ContentManagerAppState['components'];
    contentTypeSchemas: ContentManagerAppState['models'];
    fieldSizes: ContentManagerAppState['fieldSizes'];
  };
}

type Action = GetInitDataAction | ResetInitDataAction | SetInitDataAction;

interface ContentManagerAppState {
  collectionTypeLinks: ContentManagerLink[];
  components: Contracts.Init.GetInitData.Response['data']['components'];
  fieldSizes: Contracts.Init.GetInitData.Response['data']['fieldSizes'];
  models: Contracts.Init.GetInitData.Response['data']['contentTypes'];
  singleTypeLinks: ContentManagerLink[];
  status: 'loading' | 'resolved' | 'error';
}

const initialState = {
  collectionTypeLinks: [],
  components: [],
  fieldSizes: {},
  models: [],
  singleTypeLinks: [],
  status: 'loading',
} satisfies ContentManagerAppState;

const selectSchemas = createSelector(
  (state: RootState) => state['content-manager_app'],
  ({ components, models }) => {
    return [...components, ...models];
  }
);

const reducer = (state: ContentManagerAppState = initialState, action: Action) =>
  produce(state, (draftState) => {
    switch (action.type) {
      case GET_INIT_DATA: {
        draftState.status = 'loading';
        break;
      }
      case RESET_INIT_DATA: {
        return initialState;
      }
      case SET_INIT_DATA: {
        draftState.collectionTypeLinks = action.data.authorizedCollectionTypeLinks.filter(
          ({ isDisplayed }) => isDisplayed
        );
        draftState.singleTypeLinks = action.data.authorizedSingleTypeLinks.filter(
          ({ isDisplayed }) => isDisplayed
        );
        draftState.components = action.data.components;
        draftState.models = action.data.contentTypeSchemas;
        draftState.fieldSizes = action.data.fieldSizes;
        draftState.status = 'resolved';
        break;
      }
      default:
        return draftState;
    }
  });

export { App, reducer, selectSchemas };
export type { ContentManagerAppState };
