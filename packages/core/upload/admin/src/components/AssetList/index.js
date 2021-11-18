import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Box } from '@strapi/design-system/Box';
import { KeyboardNavigable } from '@strapi/design-system/KeyboardNavigable';
import { AssetCard } from '../AssetCard/AssetCard';
import { Draggable } from './Draggable';

const GridColSize = {
  S: 180,
  M: 250,
};

const GridLayout = styled(Box)`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(${({ size }) => `${GridColSize[size]}px`}, 1fr));
  grid-gap: ${({ theme }) => theme.spaces[4]};
`;

export const AssetList = ({
  allowedTypes,
  assets,
  onEditAsset,
  onSelectAsset,
  selectedAssets,
  size,
  onReorderAsset,
}) => {
  return (
    <KeyboardNavigable tagName="article">
      <GridLayout size={size}>
        {assets.map((asset, index) => {
          const isSelected = Boolean(
            selectedAssets.find(currentAsset => currentAsset.id === asset.id)
          );

          if (onReorderAsset) {
            return (
              <Draggable key={asset.id} index={index} moveItem={onReorderAsset} id={asset.id}>
                <AssetCard
                  allowedTypes={allowedTypes}
                  asset={asset}
                  isSelected={isSelected}
                  onEdit={onEditAsset ? () => onEditAsset(asset) : undefined}
                  onSelect={() => onSelectAsset(asset)}
                  size={size}
                />
              </Draggable>
            );
          }

          return (
            <AssetCard
              key={asset.id}
              allowedTypes={allowedTypes}
              asset={asset}
              isSelected={isSelected}
              onEdit={onEditAsset ? () => onEditAsset(asset) : undefined}
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
  allowedTypes: ['images', 'files', 'videos'],
  onEditAsset: undefined,
  size: 'M',
  onReorderAsset: undefined,
};

AssetList.propTypes = {
  allowedTypes: PropTypes.arrayOf(PropTypes.string),
  assets: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  onEditAsset: PropTypes.func,
  onSelectAsset: PropTypes.func.isRequired,
  selectedAssets: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  size: PropTypes.oneOf(['S', 'M']),
  onReorderAsset: PropTypes.func,
};
