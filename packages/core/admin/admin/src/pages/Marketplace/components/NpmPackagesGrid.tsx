import { Box, BoxComponent, Flex, Grid, Typography } from '@strapi/design-system';
import { EmptyDocuments } from '@strapi/icons/symbols';
import { useIntl } from 'react-intl';
import { styled } from 'styled-components';

import { Layouts } from '../../../components/Layouts/Layout';
import { Page } from '../../../components/PageHelpers';
import { AppInfoContextValue } from '../../../features/AppInfo';

import { NpmPackageCard, NpmPackageCardProps } from './NpmPackageCard';

import type { Plugin, Provider } from '../hooks/useMarketplaceData';

interface NpmPackagesGridProps extends Pick<NpmPackageCardProps, 'npmPackageType' | 'useYarn'> {
  debouncedSearch: string;
  installedPackageNames: string[];
  isInDevelopmentMode: AppInfoContextValue['autoReload'];
  npmPackages?: Array<Plugin | Provider>;
  status: 'idle' | 'loading' | 'error' | 'success';
  strapiAppVersion?: NpmPackageCardProps['strapiAppVersion'];
}

const NpmPackagesGrid = ({
  status,
  npmPackages = [],
  installedPackageNames = [],
  useYarn,
  isInDevelopmentMode,
  npmPackageType,
  strapiAppVersion,
  debouncedSearch,
}: NpmPackagesGridProps) => {
  const { formatMessage } = useIntl();

  if (status === 'error') {
    return <Page.Error />;
  }

  if (status === 'loading') {
    return <Page.Loading />;
  }

  const emptySearchMessage = formatMessage(
    {
      id: 'admin.pages.MarketPlacePage.search.empty',
      defaultMessage: 'No result for "{target}"',
    },
    { target: debouncedSearch }
  );

  if (npmPackages.length === 0) {
    return (
      <Box position="relative">
        <Layouts.Grid size="M">
          {Array(12)
            .fill(null)
            .map((_, idx) => (
              <EmptyPluginCard key={idx} height="234px" hasRadius />
            ))}
        </Layouts.Grid>
        <Box position="absolute" top={11} width="100%">
          <Flex alignItems="center" justifyContent="center" direction="column">
            <EmptyDocuments width="160px" height="88px" />
            <Box paddingTop={6}>
              <Typography variant="delta" tag="p" textColor="neutral600">
                {emptySearchMessage}
              </Typography>
            </Box>
          </Flex>
        </Box>
      </Box>
    );
  }

  return (
    <Grid.Root gap={4}>
      {npmPackages.map((npmPackage) => (
        <Grid.Item
          col={4}
          s={6}
          xs={12}
          style={{ height: '100%' }}
          key={npmPackage.id}
          direction="column"
          alignItems="stretch"
        >
          <NpmPackageCard
            npmPackage={npmPackage}
            isInstalled={installedPackageNames.includes(npmPackage.attributes.npmPackageName)}
            useYarn={useYarn}
            isInDevelopmentMode={isInDevelopmentMode}
            npmPackageType={npmPackageType}
            strapiAppVersion={strapiAppVersion}
          />
        </Grid.Item>
      ))}
    </Grid.Root>
  );
};

const EmptyPluginCard = styled<BoxComponent>(Box)`
  background: ${({ theme }) =>
    `linear-gradient(180deg, rgba(234, 234, 239, 0) 0%, ${theme.colors.neutral150} 100%)`};
  opacity: 0.33;
`;

export { NpmPackagesGrid };
