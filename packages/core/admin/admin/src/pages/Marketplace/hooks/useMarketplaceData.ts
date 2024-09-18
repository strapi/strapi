import { useNotifyAT } from '@strapi/design-system';
import * as qs from 'qs';
import { useIntl } from 'react-intl';
import { useQuery } from 'react-query';

import { useNotification } from '../../../features/Notifications';

import type { MarketplacePageQuery, NpmPackageType, TabQuery } from '../MarketplacePage';

const MARKETPLACE_API_URL = 'https://market-api.strapi.io';

interface UseMarketplaceDataParams {
  npmPackageType: NpmPackageType;
  debouncedSearch: string;
  query?: MarketplacePageQuery;
  tabQuery: TabQuery;
  strapiVersion?: string | null;
}

type Collections =
  | 'Verified'
  | 'Made by the community'
  | 'Made by Strapi'
  | 'Made by official partners';

type Categories = 'Custom fields' | 'Deployment' | 'Monitoring';

type FilterTypes = 'categories' | 'collections';

interface Plugin {
  id: string;
  attributes: {
    name: string;
    description: string;
    slug: string;
    npmPackageName: string;
    npmPackageUrl: string;
    npmDownloads: number;
    repositoryUrl: string;
    githubStars: number;
    logo: {
      url: string;
    };
    developerName: string;
    validated: boolean;
    madeByStrapi: boolean;
    strapiCompatibility: string;
    submissionDate: string;
    collections: Collections[];
    categories: Categories[];
    strapiVersion: string;
    screenshots: Array<{
      url: string;
    }>;
  };
}

interface Provider {
  id: string;
  attributes: {
    name: string;
    description: string;
    slug: string;
    npmPackageName: string;
    npmPackageUrl: string;
    npmDownloads: number;
    repositoryUrl: string;
    githubStars: number;
    pluginName: string;
    logo: {
      url: string;
    };
    developerName: string;
    validated: boolean;
    madeByStrapi: boolean;
    strapiCompatibility: string;
    strapiVersion?: never;
    submissionDate: string;
    collections: Collections[];
  };
}

interface MarketplaceMeta {
  collections: Record<Collections, number>;
  pagination: {
    page: number;
    pageSize: number;
    pageCount: number;
    total: number;
  };
}

interface MarketplaceResponse<TData extends Plugin | Provider> {
  data: TData[];
  meta: TData extends Provider
    ? MarketplaceMeta
    : MarketplaceMeta & { categories: Record<Categories, number> };
}

function useMarketplaceData({
  npmPackageType,
  debouncedSearch,
  query,
  tabQuery,
  strapiVersion,
}: UseMarketplaceDataParams) {
  const { notifyStatus } = useNotifyAT();
  const { formatMessage } = useIntl();
  const { toggleNotification } = useNotification();
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

  const pluginParams = {
    ...tabQuery.plugin,
    pagination: paginationParams,
    search: debouncedSearch,
    version: strapiVersion,
  };

  const { data: pluginsResponse, status: pluginsStatus } = useQuery(
    ['marketplace', 'plugins', pluginParams],
    async () => {
      try {
        const queryString = qs.stringify(pluginParams);
        const res = await fetch(`${MARKETPLACE_API_URL}/plugins?${queryString}`);

        if (!res.ok) {
          throw new Error('Failed to fetch marketplace plugins.');
        }

        const data = (await res.json()) as MarketplaceResponse<Plugin>;
        return data;
      } catch (error) {
        // silence
      }

      return null;
    },
    {
      onSuccess() {
        notifyMarketplaceLoad();
      },
      onError() {
        toggleNotification({
          type: 'danger',
          message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occured' }),
        });
      },
    }
  );

  const providerParams = {
    ...tabQuery.provider,
    pagination: paginationParams,
    search: debouncedSearch,
    version: strapiVersion,
  };

  const { data: providersResponse, status: providersStatus } = useQuery(
    ['marketplace', 'providers', providerParams],
    async () => {
      const queryString = qs.stringify(providerParams);
      const res = await fetch(`${MARKETPLACE_API_URL}/providers?${queryString}`);

      if (!res.ok) {
        throw new Error('Failed to fetch marketplace providers.');
      }

      const data = (await res.json()) as MarketplaceResponse<Provider>;

      return data;
    },
    {
      onSuccess() {
        notifyMarketplaceLoad();
      },
      onError() {
        toggleNotification({
          type: 'danger',
          message: formatMessage({ id: 'notification.error', defaultMessage: 'An error occured' }),
        });
      },
    }
  );

  const npmPackageTypeResponse = npmPackageType === 'plugin' ? pluginsResponse : providersResponse;

  const possibleCollections = npmPackageTypeResponse?.meta.collections ?? {};
  const possibleCategories = pluginsResponse?.meta.categories ?? {};

  const { pagination } = npmPackageTypeResponse?.meta ?? {};

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

export { useMarketplaceData };
export type {
  MarketplaceResponse,
  Plugin,
  Provider,
  MarketplaceMeta,
  Collections,
  Categories,
  FilterTypes,
  UseMarketplaceDataParams,
};
