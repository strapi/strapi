import * as React from 'react';

import { Box, Flex, Searchbar, Tabs } from '@strapi/design-system';
import { ExternalLink } from '@strapi/icons';
import { GlassesSquare } from '@strapi/icons/symbols';
import { useIntl } from 'react-intl';

import { ContentBox } from '../../components/ContentBox';
import { Layouts } from '../../components/Layouts/Layout';
import { Page } from '../../components/PageHelpers';
import { Pagination } from '../../components/Pagination';
import { useTypedSelector } from '../../core/store/hooks';
import { useAppInfo } from '../../features/AppInfo';
import { useNotification } from '../../features/Notifications';
import { useTracking } from '../../features/Tracking';
import { useDebounce } from '../../hooks/useDebounce';
import { useQueryParams } from '../../hooks/useQueryParams';

import { NpmPackagesFilters } from './components/NpmPackagesFilters';
import { NpmPackagesGrid } from './components/NpmPackagesGrid';
import { OfflineLayout } from './components/OfflineLayout';
import { PageHeader } from './components/PageHeader';
import { SortSelect, SortSelectProps } from './components/SortSelect';
import { FilterTypes, useMarketplaceData } from './hooks/useMarketplaceData';
import { useNavigatorOnline } from './hooks/useNavigatorOnline';

type NpmPackageType = 'plugin' | 'provider';

interface MarketplacePageQuery {
  collections?: string[];
  categories?: string[];
  npmPackageType?: NpmPackageType;
  page?: number;
  pageSize?: number;
  search?: string;
  sort?: SortSelectProps['sortQuery'];
}

interface TabQuery {
  plugin: MarketplacePageQuery;
  provider: MarketplacePageQuery;
}

const PLUGIN = 'plugin';
const PROVIDER = 'provider';

const MarketplacePage = () => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const { toggleNotification } = useNotification();
  const [{ query }, setQuery] = useQueryParams<MarketplacePageQuery>();
  const debouncedSearch = useDebounce(query?.search, 500) || '';

  const {
    autoReload: isInDevelopmentMode,
    dependencies,
    useYarn,
    strapiVersion,
  } = useAppInfo('MarketplacePage', (state) => state);
  const isOnline = useNavigatorOnline();

  const npmPackageType = query?.npmPackageType || PLUGIN;

  const [tabQuery, setTabQuery] = React.useState<TabQuery>({
    plugin: npmPackageType === PLUGIN ? { ...query } : {},
    provider: npmPackageType === PROVIDER ? { ...query } : {},
  });

  React.useEffect(() => {
    trackUsage('didGoToMarketplace');
  }, [trackUsage]);

  React.useEffect(() => {
    if (!isInDevelopmentMode) {
      toggleNotification({
        type: 'info',
        message: formatMessage({
          id: 'admin.pages.MarketPlacePage.production',
          defaultMessage: 'Manage plugins from the development environment',
        }),
      });
    }
  }, [toggleNotification, isInDevelopmentMode, formatMessage]);

  const {
    pluginsResponse,
    providersResponse,
    pluginsStatus,
    providersStatus,
    possibleCollections,
    possibleCategories,
    pagination,
  } = useMarketplaceData({ npmPackageType, debouncedSearch, query, tabQuery, strapiVersion });

  if (!isOnline) {
    return <OfflineLayout />;
  }

  const handleTabChange = (tab: string) => {
    const selectedTab = tab === PLUGIN || tab === PROVIDER ? tab : PLUGIN;

    const hasTabQuery = tabQuery[selectedTab] && Object.keys(tabQuery[selectedTab]).length;

    if (hasTabQuery) {
      setQuery({
        // Keep filters and search
        ...tabQuery[selectedTab],
        search: query?.search || '',
        // Set tab and reset page
        npmPackageType: selectedTab,
        page: 1,
      });
    } else {
      setQuery({
        // Set tab
        npmPackageType: selectedTab,
        // Clear filters
        collections: [],
        categories: [],
        sort: 'name:asc',
        page: 1,
        // Keep search
        search: query?.search || '',
      });
    }
  };

  const handleSelectChange = (update: Partial<MarketplacePageQuery>) => {
    setQuery({ ...update, page: 1 });
    setTabQuery((prev) => ({
      ...prev,
      [npmPackageType]: { ...prev[npmPackageType], ...update },
    }));
  };

  const handleSelectClear = (filterType: FilterTypes) => {
    setQuery({ [filterType]: [], page: undefined }, 'remove');
    setTabQuery((prev) => ({ ...prev, [npmPackageType]: {} }));
  };

  const handleSortSelectChange: SortSelectProps['handleSelectChange'] = ({ sort }) =>
    // @ts-expect-error - this is a narrowing issue.
    handleSelectChange({ sort });

  // Check if plugins and providers are installed already
  const installedPackageNames = Object.keys(dependencies ?? {});

  return (
    <Layouts.Root>
      <Page.Main>
        <Page.Title>
          {formatMessage({
            id: 'admin.pages.MarketPlacePage.head',
            defaultMessage: 'Marketplace - Plugins',
          })}
        </Page.Title>
        <PageHeader isOnline={isOnline} npmPackageType={npmPackageType} />
        <Layouts.Content>
          <Tabs.Root variant="simple" onValueChange={handleTabChange} value={npmPackageType}>
            <Flex justifyContent="space-between" paddingBottom={4}>
              <Tabs.List
                aria-label={formatMessage({
                  id: 'admin.pages.MarketPlacePage.tab-group.label',
                  defaultMessage: 'Plugins and Providers for Strapi',
                })}
              >
                <Tabs.Trigger value={PLUGIN}>
                  {formatMessage({
                    id: 'admin.pages.MarketPlacePage.plugins',
                    defaultMessage: 'Plugins',
                  })}{' '}
                  {pluginsResponse ? `(${pluginsResponse.meta.pagination.total})` : '...'}
                </Tabs.Trigger>
                <Tabs.Trigger value={PROVIDER}>
                  {formatMessage({
                    id: 'admin.pages.MarketPlacePage.providers',
                    defaultMessage: 'Providers',
                  })}{' '}
                  {providersResponse ? `(${providersResponse.meta.pagination.total})` : '...'}
                </Tabs.Trigger>
              </Tabs.List>

              <Box width="25%">
                <Searchbar
                  name="searchbar"
                  onClear={() => setQuery({ search: '', page: 1 })}
                  value={query?.search}
                  onChange={(e) => setQuery({ search: e.target.value, page: 1 })}
                  clearLabel={formatMessage({
                    id: 'admin.pages.MarketPlacePage.search.clear',
                    defaultMessage: 'Clear the search',
                  })}
                  placeholder={formatMessage({
                    id: 'admin.pages.MarketPlacePage.search.placeholder',
                    defaultMessage: 'Search',
                  })}
                >
                  {formatMessage({
                    id: 'admin.pages.MarketPlacePage.search.placeholder',
                    defaultMessage: 'Search',
                  })}
                </Searchbar>
              </Box>
            </Flex>
            <Flex paddingBottom={4} gap={2}>
              <SortSelect
                sortQuery={query?.sort || 'name:asc'}
                handleSelectChange={handleSortSelectChange}
              />
              <NpmPackagesFilters
                npmPackageType={npmPackageType}
                possibleCollections={possibleCollections}
                possibleCategories={possibleCategories}
                query={query || {}}
                handleSelectChange={handleSelectChange}
                handleSelectClear={handleSelectClear}
              />
            </Flex>
            <Tabs.Content value={PLUGIN}>
              <NpmPackagesGrid
                npmPackages={pluginsResponse?.data}
                status={pluginsStatus}
                installedPackageNames={installedPackageNames}
                useYarn={useYarn}
                isInDevelopmentMode={isInDevelopmentMode}
                npmPackageType="plugin"
                strapiAppVersion={strapiVersion}
                debouncedSearch={debouncedSearch}
              />
            </Tabs.Content>
            <Tabs.Content value={PROVIDER}>
              <NpmPackagesGrid
                npmPackages={providersResponse?.data}
                status={providersStatus}
                installedPackageNames={installedPackageNames}
                useYarn={useYarn}
                isInDevelopmentMode={isInDevelopmentMode}
                npmPackageType="provider"
                debouncedSearch={debouncedSearch}
              />
            </Tabs.Content>
            <Pagination.Root {...pagination} defaultPageSize={24}>
              <Pagination.PageSize options={['12', '24', '50', '100']} />
              <Pagination.Links />
            </Pagination.Root>
            <Box paddingTop={8}>
              <a
                href="https://strapi.canny.io/plugin-requests"
                target="_blank"
                rel="noopener noreferrer nofollow"
                style={{ textDecoration: 'none' }}
                onClick={() => trackUsage('didMissMarketplacePlugin')}
              >
                <ContentBox
                  title={formatMessage({
                    id: 'admin.pages.MarketPlacePage.missingPlugin.title',
                    defaultMessage: 'Documentation',
                  })}
                  subtitle={formatMessage({
                    id: 'admin.pages.MarketPlacePage.missingPlugin.description',
                    defaultMessage:
                      "Tell us what plugin you are looking for and we'll let our community plugin developers know in case they are in search for inspiration!",
                  })}
                  icon={<GlassesSquare />}
                  iconBackground="alternative100"
                  endAction={
                    <ExternalLink
                      fill="neutral600"
                      width="1.2rem"
                      height="1.2rem"
                      style={{ marginLeft: '0.8rem' }}
                    />
                  }
                />
              </a>
            </Box>
          </Tabs.Root>
        </Layouts.Content>
      </Page.Main>
    </Layouts.Root>
  );
};

const ProtectedMarketplacePage = () => {
  const permissions = useTypedSelector((state) => state.admin_app.permissions.marketplace?.main);

  return (
    <Page.Protect permissions={permissions}>
      <MarketplacePage />
    </Page.Protect>
  );
};

export { MarketplacePage, ProtectedMarketplacePage };
export type { NpmPackageType, MarketplacePageQuery, TabQuery };
