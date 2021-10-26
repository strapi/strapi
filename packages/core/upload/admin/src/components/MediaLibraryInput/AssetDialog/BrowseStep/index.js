import React from 'react';
import PropTypes from 'prop-types';
import { AssetList } from '../../../AssetList';

export const BrowseStep = ({ assets, onEditAsset, onSelectAsset, selectedAssets }) => {
  return (
    <AssetList
      assets={assets}
      onSelectAsset={onSelectAsset}
      selectedAssets={selectedAssets}
      onEditAsset={onEditAsset}
    />
  );
};

BrowseStep.propTypes = {
  assets: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  onEditAsset: PropTypes.func.isRequired,
  onSelectAsset: PropTypes.func.isRequired,
  selectedAssets: PropTypes.arrayOf(PropTypes.number).isRequired,
};
