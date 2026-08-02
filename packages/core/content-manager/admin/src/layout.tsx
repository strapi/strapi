/* eslint-disable check-file/filename-naming-convention */
import * as React from 'react';

import { Page, Layouts, SubNav, useIsMobile, LazyOutlet } from '@strapi/admin/strapi-admin';
import { useIntl } from 'react-intl';
import { Navigate, useLocation, useMatch } from 'react-router-dom';

import { DragLayer, DragLayerProps } from './components/DragLayer';
import { CardDragPreview } from './components/DragPreviews/CardDragPreview';
import { ComponentDragPreview } from './components/DragPreviews/ComponentDragPreview';
import { RelationDragPreview } from './components/DragPreviews/RelationDragPreview';
import { LeftMenu } from './components/LeftMenu';
import { ItemTypes } from './constants/dragAndDrop';
import { useContentManagerInitData } from './hooks/useContentManagerInitData';
import { getTranslation } from './utils/translations';

import type { CardDragPreviewProps } from './components/DragPreviews/CardDragPreview';
import type { ComponentDragPreviewProps } from './components/DragPreviews/ComponentDragPreview';
import type { RelationDragPreviewProps } from './components/DragPreviews/RelationDragPreview';

/* -------------------------------------------------------------------------------------------------
 * Layout
 * -----------------------------------------------------------------------------------------------*/

const Layout = () => {
  const contentTypeMatch = useMatch('/content-manager/:kind/:uid/*');
  const isMobile = useIsMobile();

  const { isLoading, collectionTypeLinks, models, singleTypeLinks } = useContentManagerInitData();
  const authorisedModels = [...collectionTypeLinks, ...singleTypeLinks].sort((a, b) =>
    a.title.localeCompare(b.title)
  );

  const { pathname } = useLocation();
  const { formatMessage } = useIntl();

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
    return <Navigate to="/content-manager/403" />;
  }

  // Redirect the user to the create content type page
  if (supportedModelsToDisplay.length === 0 && pathname !== '/no-content-types') {
    return <Navigate to="/no-content-types" />;
  }

  // On /content-manager base route
  if (!contentTypeMatch && authorisedModels.length > 0) {
    // On desktop: redirect to first collection type
    if (!isMobile) {
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

    // On mobile: show navigation page
    return (
      <>
        <Page.Title>
          {formatMessage({
            id: getTranslation('plugin.name'),
            defaultMessage: 'Content Manager',
          })}
        </Page.Title>
        <SubNav.PageWrapper>
          <LeftMenu isFullPage />
        </SubNav.PageWrapper>
      </>
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
        <LazyOutlet nested />
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
      return isCardDragItem(item) ? <CardDragPreview label={item.label} /> : null;
    case ItemTypes.COMPONENT:
    case ItemTypes.DYNAMIC_ZONE:
      return isComponentDragItem(item) ? (
        <ComponentDragPreview displayedValue={item.displayedValue} />
      ) : null;

    case ItemTypes.RELATION:
      return isRelationDragItem(item) ? <RelationDragPreview {...item} /> : null;

    default:
      return null;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return value !== null && typeof value === 'object';
};

const isCardDragItem = (item: unknown): item is CardDragPreviewProps => {
  return isRecord(item) && typeof item.label === 'string';
};

const isComponentDragItem = (item: unknown): item is ComponentDragPreviewProps => {
  return isRecord(item) && typeof item.displayedValue === 'string';
};

const isRelationDragItem = (item: unknown): item is RelationDragPreviewProps => {
  return (
    isRecord(item) &&
    typeof item.displayedValue === 'string' &&
    (typeof item.id === 'string' || typeof item.id === 'number') &&
    typeof item.index === 'number' &&
    typeof item.width === 'number' &&
    (item.status === undefined || typeof item.status === 'string')
  );
};

export { Layout };
