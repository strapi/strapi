import React from 'react';
import PropTypes from 'prop-types';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import NpmPackageCard from '../NpmPackageCard';

const NpmPackagesGrid = ({
  npmPackages,
  installedPackageNames,
  useYarn,
  isInDevelopmentMode,
  npmPackageType,
}) => {
  return (
    <Grid gap={4}>
      {npmPackages.map(npmPackage => (
        <GridItem col={4} s={6} xs={12} style={{ height: '100%' }} key={npmPackage.id}>
          <NpmPackageCard
            npmPackage={npmPackage}
            installedPackageNames={installedPackageNames}
            useYarn={useYarn}
            isInDevelopmentMode={isInDevelopmentMode}
            npmPackageType={npmPackageType}
          />
        </GridItem>
      ))}
    </Grid>
  );
};

NpmPackagesGrid.defaultProps = {
  installedPackageNames: [],
};

NpmPackagesGrid.propTypes = {
  npmPackages: PropTypes.array.isRequired,
  installedPackageNames: PropTypes.arrayOf(PropTypes.string),
  useYarn: PropTypes.bool.isRequired,
  isInDevelopmentMode: PropTypes.bool.isRequired,
  npmPackageType: PropTypes.string.isRequired,
};

export default NpmPackagesGrid;
