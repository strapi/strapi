import React, { useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Helmet } from 'react-helmet';
import {
  CheckPagePermissions,
  useFocusWhenNavigate,
  useTracking,
  useNotification,
  useAppInfo,
  useQueryParams,
} from '@strapi/helper-plugin';
import {
  Layout,
  ContentLayout,
  Main,
  Searchbar,
  Box,
  Flex,
  Tabs,
  Tab,
  TabGroup,
  TabPanels,
  TabPanel,
} from '@strapi/design-system';

import PageHeader from './components/PageHeader';
import adminPermissions from '../../permissions';
import useNavigatorOnLine from '../../hooks/useNavigatorOnLine';
import MissingPluginBanner from './components/MissingPluginBanner';
import NpmPackagesGrid from './components/NpmPackagesGrid';
import SortSelect from './components/SortSelect';
import NpmPackagesFilters from './components/NpmPackagesFilters';
import NpmPackagesPagination from './components/NpmPackagesPagination';
import useDebounce from '../../hooks/useDebounce';
import OfflineLayout from './components/OfflineLayout';
import useMarketplaceData from './utils/useMarketplaceData';

const MarketPlacePage = () => {
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const trackUsageRef = useRef(trackUsage);
  const toggleNotification = useNotification();
  const [{ query }, setQuery] = useQueryParams();
  const debouncedSearch = useDebounce(query?.search, 500) || '';

  const { autoReload: isInDevelopmentMode, dependencies, useYarn, strapiVersion } = useAppInfo();
  const isOnline = useNavigatorOnLine();

  const npmPackageType = query?.npmPackageType || 'plugin';

  const [tabQuery, setTabQuery] = useState({
    plugin: npmPackageType === 'plugin' ? { ...query } : {},
    provider: npmPackageType === 'provider' ? { ...query } : {},
  });

  useFocusWhenNavigate();

  useEffect(() => {
    trackUsageRef.current('didGoToMarketplace');
  }, []);

  useEffect(() => {
    if (!isInDevelopmentMode) {
      toggleNotification({
        type: 'info',
        message: {
          id: 'admin.pages.MarketPlacePage.production',
          defaultMessage: 'Manage plugins from the development environment',
        },
        blockTransition: true,
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

  if (!isOnline) {
    return <OfflineLayout />;
  }

  const handleTabChange = (selected) => {
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

  const handleSelectChange = (update) => {
    setQuery({ ...update, page: 1 });
    setTabQuery((prev) => ({
      ...prev,
      [npmPackageType]: { ...prev[npmPackageType], ...update },
    }));
  };

  const handleSelectClear = (filterType) => {
    setQuery({ [filterType]: [], page: null }, 'remove');
    setTabQuery((prev) => ({ ...prev, [npmPackageType]: {} }));
  };

  // Check if plugins and providers are installed already
  const installedPackageNames = Object.keys(dependencies);

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
            initialSelectedTabIndex={['plugin', 'provider'].indexOf(npmPackageType)}
            onTabChange={handleTabChange}
          >
            <Flex justifyContent="space-between" paddingBottom={4}>
              <Tabs>
                <Tab>
                  {formatMessage({
                    id: 'admin.pages.MarketPlacePage.plugins',
                    defaultMessage: 'Plugins',
                  })}{' '}
                  {pluginsStatus === 'success'
                    ? `(${pluginsResponse.meta.pagination.total})`
                    : '...'}
                </Tab>
                <Tab>
                  {formatMessage({
                    id: 'admin.pages.MarketPlacePage.providers',
                    defaultMessage: 'Providers',
                  })}{' '}
                  {providersStatus === 'success'
                    ? `(${providersResponse.meta.pagination.total})`
                    : '...'}
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
                handleSelectChange={handleSelectChange}
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
          {pagination && <NpmPackagesPagination pagination={pagination} />}
          <Box paddingTop={8}>
            <MissingPluginBanner />
          </Box>
        </ContentLayout>
      </Main>
    </Layout>
  );
};

const ProtectedMarketPlace = () => (
  <CheckPagePermissions permissions={adminPermissions.marketplace.main}>
    <MarketPlacePage />
  </CheckPagePermissions>
);

export { MarketPlacePage };
export default ProtectedMarketPlace;
