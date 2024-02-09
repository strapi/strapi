import * as React from 'react';

import { createContext } from '@radix-ui/react-context';
import { Flex } from '@strapi/design-system';
import { LoadingIndicatorPage, useQueryParams } from '@strapi/helper-plugin';
import { Contracts } from '@strapi/plugin-content-manager/_internal/shared';
import { stringify } from 'qs';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { useContentTypeLayout } from '../../hooks/useLayouts';
import { buildValidGetParams } from '../../utils/api';
import { FormattedLayouts } from '../../utils/layouts';
import { VersionDetails } from '../components/VersionDetails';
import { VersionsList } from '../components/VersionsList';
import { useGetHistoryVersionsQuery } from '../services/historyVersion';

import type { UID } from '@strapi/types';

/* -------------------------------------------------------------------------------------------------
 * HistoryProvider
 * -----------------------------------------------------------------------------------------------*/

interface HistoryContextValue {
  contentType: UID.ContentType;
  id?: string; // null for single types
  layout: FormattedLayouts;
  selectedVersion: Contracts.HistoryVersions.HistoryVersionDataResponse;
  versions: Contracts.HistoryVersions.GetHistoryVersions.Response;
  page: number;
}

const [HistoryProvider, useHistoryContext] = createContext<HistoryContextValue>('HistoryPage');

/* -------------------------------------------------------------------------------------------------
 * HistoryPage
 * -----------------------------------------------------------------------------------------------*/

const HistoryPage = () => {
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { slug, id: documentId } = useParams<{
    slug: UID.ContentType;
    id: string;
  }>();

  const { layout } = useContentTypeLayout(slug);

  // Parse state from query params
  const [{ query }] = useQueryParams<{
    page?: number;
    id?: string;
    plugins?: Record<string, unknown>;
  }>();
  const validQueryParams = buildValidGetParams(query);
  const page = validQueryParams.page ? Number(validQueryParams.page) : 1;

  const versionsResponse = useGetHistoryVersionsQuery({
    contentType: slug!,
    ...(documentId ? { documentId } : {}),
    ...validQueryParams,
  });

  // Make sure the user lands on a selected history version
  React.useEffect(() => {
    const versions = versionsResponse.data?.data;

    if (!query.id && versions?.[0]) {
      navigate({ search: stringify({ ...query, id: versions[0].id }) }, { replace: true });
    }
  }, [versionsResponse.isLoading, navigate, query.id, versionsResponse.data?.data, query]);

  if (!layout || versionsResponse.isLoading) {
    return <LoadingIndicatorPage />;
  }

  if (!slug || (!documentId && layout?.contentType.kind === 'collectionType')) {
    return <Navigate to="/content-manager" />;
  }

  const selectedVersion = versionsResponse.data?.data.find(
    (version) => version.id.toString() === query.id
  );

  // TODO: real error state when designs are ready
  if (versionsResponse.isError || !versionsResponse.data || !selectedVersion) {
    return null;
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
            contentType: layout.contentType.info.displayName,
          }
        )}
      />
      <HistoryProvider
        contentType={slug}
        id={documentId}
        layout={layout}
        selectedVersion={selectedVersion}
        versions={versionsResponse.data}
        page={page}
      >
        <Flex direction="row" alignItems="flex-start">
          <VersionDetails />
          <VersionsList />
        </Flex>
      </HistoryProvider>
    </>
  );
};

export { HistoryPage, HistoryProvider, useHistoryContext };
