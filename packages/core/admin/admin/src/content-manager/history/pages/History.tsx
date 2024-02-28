import * as React from 'react';

import { Flex, Main } from '@strapi/design-system';
import { LoadingIndicatorPage, useQueryParams } from '@strapi/helper-plugin';
import { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import { stringify } from 'qs';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { createContext } from '../../../components/Context';
import { COLLECTION_TYPES } from '../../constants/collections';
import { useDocument } from '../../hooks/useDocument';
import { type EditLayout, useDocumentLayout } from '../../hooks/useDocumentLayout';
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
  const navigate = useNavigate();
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

  // Make sure the user lands on a selected history version
  React.useEffect(() => {
    const versions = versionsResponse.data?.data;

    if (!query.id && !versionsResponse.isLoading && versions?.[0]) {
      navigate({ search: stringify({ ...query, id: versions[0].id }) }, { replace: true });
    }
  }, [versionsResponse.isLoading, navigate, query.id, versionsResponse.data?.data, query]);

  if (isLoadingDocument || isLoadingLayout || versionsResponse.isLoading) {
    return <LoadingIndicatorPage />;
  }

  /**
   * Ensure that we have the necessary data to render the page:
   * - slug for single types
   * - slug _and_ documentId for collection types
   */
  if (!slug || (!documentId && collectionType === COLLECTION_TYPES)) {
    return <Navigate to="/content-manager" />;
  }

  // TODO: real error state when designs are ready
  if (versionsResponse.isError || !versionsResponse.data || !layout || !schema) {
    return null;
  }

  const selectedVersion = versionsResponse.data.data.find(
    (version) => version.id.toString() === selectedVersionId
  );

  if (!selectedVersion) {
    // TODO: handle selected version not found when the designs are ready
    return <Main />;
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
          <Main grow={1} height="100vh" overflow="auto" labelledBy={headerId}>
            <VersionHeader headerId={headerId} />
            <VersionContent />
          </Main>
          <VersionsList />
        </Flex>
      </HistoryProvider>
    </>
  );
};

export { HistoryPage, HistoryProvider, useHistoryContext };
export type { HistoryContextValue };
