/* eslint-disable check-file/filename-naming-convention */
import * as React from 'react';

import { Page, useGuidedTour, Layouts } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';
import { Navigate, Outlet, useLocation, useMatch } from 'react-router-dom';

import { DragLayer, DragLayerProps } from './components/DragLayer';
import { CardDragPreview } from './components/DragPreviews/CardDragPreview';
import { ComponentDragPreview } from './components/DragPreviews/ComponentDragPreview';
import { RelationDragPreview } from './components/DragPreviews/RelationDragPreview';
import { LeftMenu } from './components/LeftMenu';
import { ItemTypes } from './constants/dragAndDrop';
import { useContentManagerInitData } from './hooks/useContentManagerInitData';
import { getTranslation } from './utils/translations';

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
        replace
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
      <Layouts.Root sideNav={<LeftMenu />}>
        <DragLayer renderItem={renderDraglayerItem} />
        <Outlet />
      </Layouts.Root>
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

export { Layout };
