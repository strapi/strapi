import * as React from 'react';

import {
  Box,
  ContentLayout,
  Flex,
  Icon,
  Layout,
  Main,
  Searchbar,
  Tab,
  TabGroup,
  TabPanel,
  TabPanels,
  Tabs,
} from '@strapi/design-system';
import {
  CheckPagePermissions,
  ContentBox,
  PageSizeURLQuery,
  PaginationURLQuery,
  useAppInfo,
  useFocusWhenNavigate,
  useNotification,
  useQueryParams,
  useTracking,
} from '@strapi/helper-plugin';
import { ExternalLink, GlassesSquare } from '@strapi/icons';
import { Helmet } from 'react-helmet';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

import { useDebounce } from '../../hooks/useDebounce';
import { selectAdminPermissions } from '../../selectors';

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

const MarketplacePage = () => {
  const tabRef = React.useRef<any>(null);
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const toggleNotification = useNotification();
  const [{ query }, setQuery] = useQueryParams<MarketplacePageQuery>();
  const debouncedSearch = useDebounce(query?.search, 500) || '';

  const { autoReload: isInDevelopmentMode, dependencies, useYarn, strapiVersion } = useAppInfo();
  const isOnline = useNavigatorOnline();

  const npmPackageType = query?.npmPackageType || 'plugin';

  const [tabQuery, setTabQuery] = React.useState<TabQuery>({
    plugin: npmPackageType === 'plugin' ? { ...query } : {},
    provider: npmPackageType === 'provider' ? { ...query } : {},
  });

  useFocusWhenNavigate();

  React.useEffect(() => {
    trackUsage('didGoToMarketplace');
  }, [trackUsage]);

  React.useEffect(() => {
    if (!isInDevelopmentMode) {
      toggleNotification({
        type: 'info',
        message: {
          id: 'admin.pages.MarketPlacePage.production',
          defaultMessage: 'Manage plugins from the development environment',
        },
      });
    }
  }, [toggleNotification, isInDevelopmentMode]);

  const {
    pluginsResponse,
    providersResponse,
    pluginsStatus,
    providersStatus,
    possibleCollections,
    possibleCategories,
    pagination,
  } = useMarketplaceData({ npmPackageType, debouncedSearch, query, tabQuery });

  const indexOfNpmPackageType = ['plugin', 'provider'].indexOf(npmPackageType);

  // TODO: Replace this solution with v2 of the Design System
  // Check if the active tab index changes and call the handler of the ref to update the tab group component
  React.useEffect(() => {
    if (tabRef.current) {
      tabRef.current._handlers.setSelectedTabIndex(indexOfNpmPackageType);
    }
  }, [indexOfNpmPackageType]);

  if (!isOnline) {
    return <OfflineLayout />;
  }

  const handleTabChange = (selected: number) => {
    const selectedTab = selected === 0 ? 'plugin' : 'provider';
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
    <Layout>
      <Main>
        <Helmet
          title={formatMessage({
            id: 'admin.pages.MarketPlacePage.helmet',
            defaultMessage: 'Marketplace - Plugins',
          })}
        />
        <PageHeader isOnline={isOnline} npmPackageType={npmPackageType} />
        <ContentLayout>
          <TabGroup
            label={formatMessage({
              id: 'admin.pages.MarketPlacePage.tab-group.label',
              defaultMessage: 'Plugins and Providers for Strapi',
            })}
            id="tabs"
            variant="simple"
            initialSelectedTabIndex={indexOfNpmPackageType}
            onTabChange={handleTabChange}
            ref={tabRef}
          >
            <Flex justifyContent="space-between" paddingBottom={4}>
              <Tabs>
                <Tab>
                  {formatMessage({
                    id: 'admin.pages.MarketPlacePage.plugins',
                    defaultMessage: 'Plugins',
                  })}{' '}
                  {pluginsResponse ? `(${pluginsResponse.meta.pagination.total})` : '...'}
                </Tab>
                <Tab>
                  {formatMessage({
                    id: 'admin.pages.MarketPlacePage.providers',
                    defaultMessage: 'Providers',
                  })}{' '}
                  {providersResponse ? `(${providersResponse.meta.pagination.total})` : '...'}
                </Tab>
              </Tabs>
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

            <TabPanels>
              {/* Plugins panel */}
              <TabPanel>
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
              </TabPanel>
              {/* Providers panel */}
              <TabPanel>
                <NpmPackagesGrid
                  npmPackages={providersResponse?.data}
                  status={providersStatus}
                  installedPackageNames={installedPackageNames}
                  useYarn={useYarn}
                  isInDevelopmentMode={isInDevelopmentMode}
                  npmPackageType="provider"
                  debouncedSearch={debouncedSearch}
                />
              </TabPanel>
            </TabPanels>
          </TabGroup>
          {pagination ? (
            <Box paddingTop={4}>
              <Flex alignItems="flex-end" justifyContent="space-between">
                <PageSizeURLQuery options={['12', '24', '50', '100']} defaultValue="24" />
                <PaginationURLQuery pagination={pagination} />
              </Flex>
            </Box>
          ) : null}
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
                  <Icon as={ExternalLink} color="neutral600" width={3} height={3} marginLeft={2} />
                }
              />
            </a>
          </Box>
        </ContentLayout>
      </Main>
    </Layout>
  );
};

const ProtectedMarketplacePage = () => {
  const permissions = useSelector(selectAdminPermissions);

  return (
    // @ts-expect-error – the selector is not typed.
    <CheckPagePermissions permissions={permissions.marketplace.main}>
      <MarketplacePage />
    </CheckPagePermissions>
  );
};

export { MarketplacePage, ProtectedMarketplacePage };
export type { NpmPackageType, MarketplacePageQuery, TabQuery };
