import React from 'react';
import PropTypes from 'prop-types';
import { Grid, GridItem } from '@strapi/design-system/Grid';
import PackageCard from '../PluginCard';

const PackagesGrid = ({ packages, installedPackageNames, useYarn, isInDevelopmentMode }) => {
  return (
    <Grid gap={4}>
      {packages.map((plugin) => (
        <GridItem col={4} s={6} xs={12} style={{ height: '100%' }} key={plugin.id}>
          <PackageCard
            plugin={plugin}
            installedPackageNames={installedPackageNames}
            useYarn={useYarn}
            isInDevelopmentMode={isInDevelopmentMode}
          />
        </GridItem>
      ))}
    </Grid>
  );
};

PackagesGrid.defaultProps = {
  installedPackageNames: [],
};

PackagesGrid.propTypes = {
  packages: PropTypes.array.isRequired,
  installedPackageNames: PropTypes.arrayOf(PropTypes.string),
  useYarn: PropTypes.bool.isRequired,
  isInDevelopmentMode: PropTypes.bool.isRequired,
};

export default PackagesGrid;
