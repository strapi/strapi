import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { Grid, GridItem } from '@strapi/design-system';
import NpmPackageCard from '../NpmPackageCard';

const NpmPackagesGrid = ({
  npmPackages,
  installedPackageNames,
  useYarn,
  isInDevelopmentMode,
  npmPackageType,
  strapiAppVersion,
}) => {
  // Check if an individual package is in the dependencies
  const isAlreadyInstalled = useCallback(
    (npmPackageName) => installedPackageNames.includes(npmPackageName),
    [installedPackageNames]
  );

  return (
    <Grid gap={4}>
      {npmPackages.map((npmPackage) => (
        <GridItem col={4} s={6} xs={12} style={{ height: '100%' }} key={npmPackage.id}>
          <NpmPackageCard
            npmPackage={npmPackage}
            isInstalled={isAlreadyInstalled(npmPackage.attributes.npmPackageName)}
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
  installedPackageNames: [],
  strapiAppVersion: null,
};

NpmPackagesGrid.propTypes = {
  npmPackages: PropTypes.array.isRequired,
  installedPackageNames: PropTypes.arrayOf(PropTypes.string),
  useYarn: PropTypes.bool.isRequired,
  isInDevelopmentMode: PropTypes.bool.isRequired,
  npmPackageType: PropTypes.string.isRequired,
  strapiAppVersion: PropTypes.string,
};

export default NpmPackagesGrid;
