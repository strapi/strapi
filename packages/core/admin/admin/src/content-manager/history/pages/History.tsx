import * as React from 'react';

import { Flex, Main } from '@strapi/design-system';
import { LoadingIndicatorPage, useQueryParams } from '@strapi/helper-plugin';
import { stringify } from 'qs';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import { Navigate, useNavigate, useParams } from 'react-router-dom';

import { useContentTypeLayout } from '../../hooks/useLayouts';
import { buildValidGetParams } from '../../utils/api';
import { VersionContent } from '../components/VersionContent';
import { VersionHeader } from '../components/VersionHeader';
import { VersionsList } from '../components/VersionsList';
import { useGetHistoryVersionsQuery } from '../services/historyVersion';

import type { UID } from '@strapi/types';

const HistoryPage = () => {
  const headerId = React.useId();
  const { formatMessage } = useIntl();
  const navigate = useNavigate();
  const { slug, id: documentId } = useParams<{
    slug: UID.ContentType;
    id: string;
  }>();

  const { isLoading: isLoadingLayout, layout } = useContentTypeLayout(slug);

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

  if (isLoadingLayout || versionsResponse.isLoading) {
    return <LoadingIndicatorPage />;
  }

  if (!slug || (!documentId && layout?.contentType.kind === 'collectionType')) {
    return <Navigate to="/content-manager" />;
  }

  // TODO: real error state when designs are ready
  if (versionsResponse.isError || !versionsResponse.data || !layout) {
    return null;
  }

  const selectedVersion = versionsResponse.data?.data.find(
    (version) => version.id.toString() === query.id
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
            contentType: layout?.contentType.info.displayName,
          }
        )}
      />
      <Flex direction="row" alignItems="flex-start">
        <Main grow={1} labelledBy={headerId}>
          <VersionHeader version={selectedVersion} layout={layout} headerId={headerId} />
          <VersionContent version={selectedVersion} />
        </Main>
        <VersionsList versions={versionsResponse.data} page={page} />
      </Flex>
    </>
  );
};

export { HistoryPage };
