import * as React from 'react';

import { Box, Flex, Main } from '@strapi/design-system';
import { useQueryParams } from '@strapi/helper-plugin';
import { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import { stringify } from 'qs';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import { Navigate, useParams } from 'react-router-dom';

import { createContext } from '../../../components/Context';
import { Page } from '../../../components/PageHelpers';
import { COLLECTION_TYPES } from '../../constants/collections';
import { DocumentRBAC } from '../../features/DocumentRBAC';
import { useDocument } from '../../hooks/useDocument';
import { type EditLayout, useDocumentLayout } from '../../hooks/useDocumentLayout';
import { useSyncRbac } from '../../hooks/useSyncRbac';
import { buildValidParams } from '../../utils/api';
import { VersionContent } from '../components/VersionContent';
import { VersionHeader } from '../components/VersionHeader';
import { VersionsList } from '../components/VersionsList';
import { useGetHistoryVersionsQuery } from '../services/historyVersion';

import type { UID } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * HistoryProvider
 * -----------------------------------------------------------------------------------------------*/

interface HistoryContextValue {
  contentType: UID.ContentType;
  id?: string; // null for single types
  layout: EditLayout['layout'];
  selectedVersion: Contracts.HistoryVersions.HistoryVersionDataResponse;
  versions: Contracts.HistoryVersions.GetHistoryVersions.Response;
  page: number;
  mainField: string;
  schema: Contracts.ContentTypes.ContentType;
}

const [HistoryProvider, useHistoryContext] = createContext<HistoryContextValue>('HistoryPage');

/* -------------------------------------------------------------------------------------------------
 * HistoryPage
 * -----------------------------------------------------------------------------------------------*/

const HistoryPage = () => {
  const headerId = React.useId();
  const { formatMessage } = useIntl();
  const {
    slug,
    id: documentId,
    collectionType,
  } = useParams<{
    collectionType: string;
    slug: UID.ContentType;
    id: string;
  }>();

  const { isLoading: isLoadingDocument, schema } = useDocument({
    collectionType: collectionType!,
    model: slug!,
  });

  const {
    isLoading: isLoadingLayout,
    edit: {
      layout,
      settings: { displayName, mainField },
    },
  } = useDocumentLayout(slug!);

  // Parse state from query params
  const [{ query }] = useQueryParams<{
    page?: number;
    id?: string;
    plugins?: Record<string, unknown>;
  }>();
  const { id: selectedVersionId, ...queryWithoutId } = query;
  const validQueryParamsWithoutId = buildValidParams(queryWithoutId);
  const page = validQueryParamsWithoutId.page ? Number(validQueryParamsWithoutId.page) : 1;

  const versionsResponse = useGetHistoryVersionsQuery(
    {
      contentType: slug!,
      ...(documentId ? { documentId } : {}),
      // Omit id since it's not needed by the endpoint and caused extra refetches
      ...validQueryParamsWithoutId,
    },
    { refetchOnMountOrArgChange: true }
  );

  /**
   * Ensure that we have the necessary data to render the page:
   * - slug for single types
   * - slug _and_ documentId for collection types
   */
  if (!slug || (collectionType === COLLECTION_TYPES && !documentId)) {
    return <Navigate to="/content-manager" />;
  }

  if (isLoadingDocument || isLoadingLayout || versionsResponse.isLoading) {
    return <Page.Loading />;
  }

  // It was a success, handle empty data
  if (
    !versionsResponse.isError &&
    (!versionsResponse.data || !versionsResponse.data?.data.length)
  ) {
    return <Page.NoData />;
  }

  // We have data, handle selected version
  if (versionsResponse.data?.data.length && !selectedVersionId) {
    return (
      <Navigate
        to={{ search: stringify({ ...query, id: versionsResponse?.data?.data[0].id }) }}
        replace
      />
    );
  }

  const selectedVersion = versionsResponse.data?.data.find(
    (version) => version.id.toString() === selectedVersionId
  );
  if (versionsResponse.isError || !layout || !schema || !selectedVersion) {
    return <Page.Error />;
  }

  return (
    <>
      <Helmet
        title={formatMessage(
          {
            id: 'content-manager.history.page-title',
            defaultMessage: '{contentType} history',
          },
          {
            contentType: displayName,
          }
        )}
      />
      <HistoryProvider
        contentType={slug}
        id={documentId}
        schema={schema}
        layout={layout}
        selectedVersion={selectedVersion}
        versions={versionsResponse.data}
        page={page}
        mainField={mainField}
      >
        <Flex direction="row" alignItems="flex-start">
          <Main grow={1} overflow="auto" labelledBy={headerId}>
            <VersionHeader headerId={headerId} />
            <VersionContent />
          </Main>
          <VersionsList />
        </Flex>
      </HistoryProvider>
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * ProtectedHistoryPage
 * -----------------------------------------------------------------------------------------------*/

const ProtectedHistoryPage = () => {
  const { slug } = useParams<{
    slug: string;
  }>();
  const [{ query }] = useQueryParams();
  const { permissions = [], isLoading, isError } = useSyncRbac(slug ?? '', query, 'History');

  if (isLoading) {
    return <Page.Loading />;
  }

  if ((!isLoading && isError) || !slug) {
    return (
      <Box height="100vh">
        <Page.Error />
      </Box>
    );
  }

  return (
    <Box height="100vh">
      <Page.Protect permissions={permissions}>
        {({ permissions }) => (
          <DocumentRBAC permissions={permissions}>
            <HistoryPage />
          </DocumentRBAC>
        )}
      </Page.Protect>
    </Box>
  );
};

export { ProtectedHistoryPage, HistoryProvider, useHistoryContext };
export type { HistoryContextValue };
