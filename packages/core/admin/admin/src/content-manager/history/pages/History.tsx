import { Flex } from '@strapi/design-system';
import { LoadingIndicatorPage } from '@strapi/helper-plugin';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import { useParams } from 'react-router-dom';

import { useContentTypeLayout } from '../../hooks/useLayouts';
import { VersionDetails } from '../components/VersionDetails';
import { VersionsList } from '../components/VersionsList';

const HistoryPage = () => {
  const { formatMessage } = useIntl();
  const { slug } = useParams<{
    collectionType: string;
    singleType: string;
    slug: string;
  }>();

  const { isLoading, layout } = useContentTypeLayout(slug);

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
        <VersionsList />
      </Flex>
    </>
  );
};

export { HistoryPage };
