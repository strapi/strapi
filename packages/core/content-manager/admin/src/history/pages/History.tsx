import * as React from 'react';

import {
  useQueryParams,
  Page,
  createContext,
  useRBAC,
  BackButton,
} from '@strapi/admin/strapi-admin';
import { Box, Flex, FocusTrap, Main, Portal, Link } from '@strapi/design-system';
import { stringify } from 'qs';
import { useIntl } from 'react-intl';
import { Navigate, useParams, NavLink } from 'react-router-dom';

import { COLLECTION_TYPES } from '../../constants/collections';
import { PERMISSIONS } from '../../constants/plugin';
import { DocumentRBAC } from '../../features/DocumentRBAC';
import { useDocument } from '../../hooks/useDocument';
import { type EditLayout, useDocumentLayout } from '../../hooks/useDocumentLayout';
import { useGetContentTypeConfigurationQuery } from '../../services/contentTypes';
import { buildValidParams } from '../../utils/api';
import { VersionContent } from '../components/VersionContent';
import { VersionHeader } from '../components/VersionHeader';
import { VersionsList } from '../components/VersionsList';
import { useGetHistoryVersionsQuery } from '../services/historyVersion';

import type {
  ContentType,
  FindContentTypeConfiguration,
} from '../../../../shared/contracts/content-types';
import type {
  HistoryVersionDataResponse,
  GetHistoryVersions,
} from '../../../../shared/contracts/history-versions';
import type { UID } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * HistoryProvider
 * -----------------------------------------------------------------------------------------------*/

interface HistoryContextValue {
  contentType: UID.ContentType;
  id?: string; // null for single types
  layout: EditLayout['layout'];
  configuration: FindContentTypeConfiguration.Response['data'];
  selectedVersion: HistoryVersionDataResponse;
  // Errors are handled outside of the provider, so we exclude errors from the response type
  versions: Extract<GetHistoryVersions.Response, { data: Array<HistoryVersionDataResponse> }>;
  page: number;
  mainField: string;
  schema: ContentType;
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
  const { data: configuration, isLoading: isLoadingConfiguration } =
    useGetContentTypeConfigurationQuery(slug!);

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
   * When the page is first mounted, if there's already data in the cache, RTK has a fullfilled
   * status for the first render, right before it triggers a new request. This means the code
   * briefly reaches the part that redirects to the first history version (if none is set).
   * But since that data is stale, that means auto-selecting a version that may not be the most
   * recent. To avoid this, we identify through requestId if the query is stale despite the
   * fullfilled status, and show the loader in that case.
   * This means we essentially don't want cache. We always refetch when the page mounts, and
   * we always show the loader until we have the most recent data. That's fine for this page.
   */
  const initialRequestId = React.useRef(versionsResponse.requestId);
  const isStaleRequest = versionsResponse.requestId === initialRequestId.current;

  /**
   * Ensure that we have the necessary data to render the page:
   * - slug for single types
   * - slug _and_ documentId for collection types
   */
  if (!slug || (collectionType === COLLECTION_TYPES && !documentId)) {
    return <Navigate to="/content-manager" />;
  }

  if (
    isLoadingDocument ||
    isLoadingLayout ||
    versionsResponse.isFetching ||
    isStaleRequest ||
    isLoadingConfiguration
  ) {
    return <Page.Loading />;
  }

  // It was a success, handle empty data
  if (!versionsResponse.isError && !versionsResponse.data?.data?.length) {
    return (
      <>
        <Page.NoData
          action={
            <Link
              tag={NavLink}
              to={`/content-manager/${collectionType}/${slug}${documentId ? `/${documentId}` : ''}`}
            >
              {formatMessage({
                id: 'global.back',
                defaultMessage: 'Back',
              })}
            </Link>
          }
        />
      </>
    );
  }

  // We have data, handle selected version
  if (versionsResponse.data?.data?.length && !selectedVersionId) {
    return (
      <Navigate
        to={{ search: stringify({ ...query, id: versionsResponse.data.data[0].id }) }}
        replace
      />
    );
  }

  const selectedVersion = versionsResponse.data?.data?.find(
    (version) => version.id.toString() === selectedVersionId
  );
  if (
    versionsResponse.isError ||
    !layout ||
    !schema ||
    !selectedVersion ||
    !configuration ||
    // This should not happen as it's covered by versionsResponse.isError, but we need it for TS
    versionsResponse.data.error
  ) {
    return <Page.Error />;
  }

  return (
    <>
      <Page.Title>
        {formatMessage(
          {
            id: 'content-manager.history.page-title',
            defaultMessage: '{contentType} history',
          },
          {
            contentType: displayName,
          }
        )}
      </Page.Title>
      <HistoryProvider
        contentType={slug}
        id={documentId}
        schema={schema}
        layout={layout}
        configuration={configuration}
        selectedVersion={selectedVersion}
        versions={versionsResponse.data}
        page={page}
        mainField={mainField}
      >
        <Flex direction="row" alignItems="flex-start">
          <Main
            grow={1}
            height="100vh"
            background="neutral100"
            paddingBottom={6}
            overflow="auto"
            labelledBy={headerId}
          >
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

const ProtectedHistoryPageImpl = () => {
  const { slug } = useParams<{
    slug: string;
  }>();
  const {
    permissions = [],
    isLoading,
    error,
  } = useRBAC(PERMISSIONS.map((action) => ({ action, subject: slug })));

  if (isLoading) {
    return <Page.Loading />;
  }

  if (error || !slug) {
    return (
      <Box
        height="100vh"
        width="100vw"
        position="fixed"
        top={0}
        left={0}
        zIndex={2}
        background="neutral0"
      >
        <Page.Error />
      </Box>
    );
  }

  return (
    <Box
      height="100vh"
      width="100vw"
      position="fixed"
      top={0}
      left={0}
      zIndex={2}
      background="neutral0"
    >
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

const ProtectedHistoryPage = () => {
  return (
    <Portal>
      <FocusTrap>
        <ProtectedHistoryPageImpl />
      </FocusTrap>
    </Portal>
  );
};

export { ProtectedHistoryPage, HistoryProvider, useHistoryContext };
export type { HistoryContextValue };
