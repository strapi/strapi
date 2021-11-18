import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Box } from '@strapi/design-system/Box';
import { KeyboardNavigable } from '@strapi/design-system/KeyboardNavigable';
import { AssetCard } from '../AssetCard/AssetCard';
import { Draggable } from './Draggable';
import { moveElement } from './utils';

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
  sortable,
}) => {
  const [orderedAssets, setOrderedAssets] = useState(assets);

  const handleMoveItem = (hoverIndex, destIndex) => {
    const offset = destIndex - hoverIndex;
    const orderedAssetsClone = [...orderedAssets];
    const nextAssets = moveElement(orderedAssetsClone, hoverIndex, offset);

    setOrderedAssets(nextAssets);
  };

  return (
    <KeyboardNavigable tagName="article">
      <GridLayout size={size}>
        {orderedAssets.map((asset, index) => {
          const isSelected = Boolean(
            selectedAssets.find(currentAsset => currentAsset.id === asset.id)
          );

          if (sortable) {
            return (
              <Draggable key={asset.id} index={index} moveItem={handleMoveItem} id={asset.id}>
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
  sortable: false,
};

AssetList.propTypes = {
  allowedTypes: PropTypes.arrayOf(PropTypes.string),
  assets: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  onEditAsset: PropTypes.func,
  onSelectAsset: PropTypes.func.isRequired,
  selectedAssets: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  size: PropTypes.oneOf(['S', 'M']),
  sortable: PropTypes.bool,
};
