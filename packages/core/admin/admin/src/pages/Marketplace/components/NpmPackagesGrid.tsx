import {
  Box,
  Flex,
  Grid,
  GridItem,
  GridLayout,
  Icon,
  Loader,
  Typography,
} from '@strapi/design-system';
import { AnErrorOccurred, AppInfoContextValue } from '@strapi/helper-plugin';
import { EmptyDocuments } from '@strapi/icons';
import { useIntl } from 'react-intl';
import styled from 'styled-components';

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
    return (
      <Flex paddingTop={8}>
        <AnErrorOccurred />
      </Flex>
    );
  }

  if (status === 'loading') {
    return (
      <Flex justifyContent="center" paddingTop={8}>
        <Loader>Loading content...</Loader>
      </Flex>
    );
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
        <GridLayout>
          {Array(12)
            .fill(null)
            .map((_, idx) => (
              <EmptyPluginCard key={idx} height="234px" hasRadius />
            ))}
        </GridLayout>
        <Box position="absolute" top={11} width="100%">
          <Flex alignItems="center" justifyContent="center" direction="column">
            <Icon as={EmptyDocuments} color={undefined} width="160px" height="88px" />
            <Box paddingTop={6}>
              <Typography variant="delta" as="p" textColor="neutral600">
                {emptySearchMessage}
              </Typography>
            </Box>
          </Flex>
        </Box>
      </Box>
    );
  }

  return (
    <Grid gap={4}>
      {npmPackages.map((npmPackage) => (
        <GridItem col={4} s={6} xs={12} style={{ height: '100%' }} key={npmPackage.id}>
          <NpmPackageCard
            npmPackage={npmPackage}
            isInstalled={installedPackageNames.includes(npmPackage.attributes.npmPackageName)}
            useYarn={useYarn}
            isInDevelopmentMode={isInDevelopmentMode}
            npmPackageType={npmPackageType}
            strapiAppVersion={strapiAppVersion}
          />
        </GridItem>
      ))}
    </Grid>
  );
};

const EmptyPluginCard = styled(Box)`
  background: ${({ theme }) =>
    `linear-gradient(180deg, rgba(234, 234, 239, 0) 0%, ${theme.colors.neutral150} 100%)`};
  opacity: 0.33;
`;

export { NpmPackagesGrid };
