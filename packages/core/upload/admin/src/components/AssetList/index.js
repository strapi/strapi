import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Box } from '@strapi/parts/Box';
import { KeyboardNavigable } from '@strapi/parts/KeyboardNavigable';
import { AssetCard } from '../AssetCard/AssetCard';

const GridColSize = {
  S: 180,
  M: 250,
};

const GridLayout = styled(Box)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(${({ size }) => `${GridColSize[size]}px`}, 1fr));
  grid-gap: ${({ theme }) => theme.spaces[4]};
`;

export const AssetList = ({ assets, onEditAsset, onSelectAsset, selectedAssets, size }) => {
  return (
    <KeyboardNavigable tagName="article">
      <GridLayout size={size}>
        {assets.map(asset => {
          const isSelected = Boolean(
            selectedAssets.find(currentAsset => currentAsset.id === asset.id)
          );

          return (
            <AssetCard
              key={asset.id}
              asset={asset}
              isSelected={isSelected}
              onEdit={() => onEditAsset(asset)}
              onSelect={() => onSelectAsset(asset)}
              size={size}
            />
          );
        })}

        {/* TODO: Remove this when we have media queries */}
        <div aria-hidden />
        <div aria-hidden />
        <div aria-hidden />
        <div aria-hidden />
        <div aria-hidden />
        <div aria-hidden />
      </GridLayout>
    </KeyboardNavigable>
  );
};

AssetList.defaultProps = {
  size: 'M',
};

AssetList.propTypes = {
  assets: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  onEditAsset: PropTypes.func.isRequired,
  onSelectAsset: PropTypes.func.isRequired,
  selectedAssets: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  size: PropTypes.oneOf(['S', 'M']),
};
