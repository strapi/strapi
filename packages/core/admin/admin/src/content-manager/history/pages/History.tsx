import { Flex } from '@strapi/design-system';
import { LoadingIndicatorPage, useQueryParams } from '@strapi/helper-plugin';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import { Navigate, useParams } from 'react-router-dom';

import { useContentTypeLayout } from '../../hooks/useLayouts';
import { VersionDetails } from '../components/VersionDetails';
import { VersionsList } from '../components/VersionsList';

import type { UID } from '@strapi/types';

const HistoryPage = () => {
  const { formatMessage } = useIntl();
  const { slug, id: documentId } = useParams<{
    slug: UID.ContentType;
    id: string;
  }>();

  const { isLoading, layout } = useContentTypeLayout(slug);

  if (!slug || (!documentId && layout?.contentType.kind === 'collectionType')) {
    return <Navigate to="/content-manager" />;
  }

  if (isLoading) {
    return <LoadingIndicatorPage />;
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
        <VersionDetails />
        <VersionsList contentType={slug} documentId={documentId} />
      </Flex>
    </>
  );
};

export { HistoryPage };
