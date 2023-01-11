import { useState, useEffect } from 'react';
import { useIntl } from 'react-intl';
import { useNotifyAT } from '@strapi/design-system/LiveRegions';
import useFetchMarketplacePlugins from '../../../hooks/useFetchMarketplacePlugins';
import useFetchMarketplaceProviders from '../../../hooks/useFetchMarketplaceProviders';

function useMarketplaceData({ npmPackageType, debouncedSearch, query, tabQuery }) {
  const { notifyStatus } = useNotifyAT();
  const { formatMessage } = useIntl();
  const marketplaceTitle = formatMessage({
    id: 'global.marketplace',
    defaultMessage: 'Marketplace',
  });

  const notifyMarketplaceLoad = () => {
    notifyStatus(
      formatMessage(
        {
          id: 'app.utils.notify.data-loaded',
          defaultMessage: 'The {target} has loaded',
        },
        { target: marketplaceTitle }
      )
    );
  };

  const paginationParams = {
    page: query?.page || 1,
    pageSize: query?.pageSize || 24,
  };

  const { data: pluginsResponse, status: pluginsStatus } = useFetchMarketplacePlugins(
    notifyMarketplaceLoad,
    {
      ...tabQuery.plugin,
      pagination: paginationParams,
      search: debouncedSearch,
    }
  );

  const { data: providersResponse, status: providersStatus } = useFetchMarketplaceProviders(
    notifyMarketplaceLoad,
    {
      ...tabQuery.provider,
      pagination: paginationParams,
      search: debouncedSearch,
    }
  );

  const relevantResponse = npmPackageType === 'plugin' ? pluginsResponse : providersResponse;
  const relevantStatus = npmPackageType === 'plugin' ? pluginsStatus : providersStatus;

  const [possibleCollections, setPossibleCollections] = useState([]);
  const [possibleCategories, setPossibleCategories] = useState([]);

  // Keep possible filters up to date, but don't lose them while loading
  useEffect(() => {
    if (relevantStatus === 'success') {
      setPossibleCollections(relevantResponse.meta.collections);
    }

    if (pluginsStatus === 'success') {
      setPossibleCategories(pluginsResponse.meta.categories);
    }
  }, [
    pluginsResponse?.meta.categories,
    pluginsStatus,
    relevantResponse?.meta.collections,
    relevantStatus,
  ]);

  const { pagination } = relevantStatus === 'success' ? relevantResponse.meta : {};

  return {
    pluginsResponse,
    providersResponse,
    pluginsStatus,
    providersStatus,
    possibleCollections,
    possibleCategories,
    pagination,
  };
}

export default useMarketplaceData;
