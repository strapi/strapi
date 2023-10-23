import React from 'react';

import { Flex, Grid, GridItem, Loader } from '@strapi/design-system';
import { AnErrorOccurred } from '@strapi/helper-plugin';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import EmptyNpmPackageSearch from '../EmptyNpmPackageSearch';
import NpmPackageCard from '../NpmPackageCard';

const NpmPackagesGrid = ({
  status,
  npmPackages,
  installedPackageNames,
  useYarn,
  isInDevelopmentMode,
  npmPackageType,
  strapiAppVersion,
  debouncedSearch,
}) => {
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
    return <EmptyNpmPackageSearch content={emptySearchMessage} />;
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

NpmPackagesGrid.defaultProps = {
  npmPackages: [],
  installedPackageNames: [],
  strapiAppVersion: null,
  debouncedSearch: '',
};

NpmPackagesGrid.propTypes = {
  status: PropTypes.string.isRequired,
  npmPackages: PropTypes.array,
  installedPackageNames: PropTypes.arrayOf(PropTypes.string),
  useYarn: PropTypes.bool.isRequired,
  isInDevelopmentMode: PropTypes.bool.isRequired,
  npmPackageType: PropTypes.string.isRequired,
  strapiAppVersion: PropTypes.string,
  debouncedSearch: PropTypes.string,
};

export default NpmPackagesGrid;
