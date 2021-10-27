import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { Box } from '@strapi/parts/Box';
import { KeyboardNavigable } from '@strapi/parts/KeyboardNavigable';
import { prefixFileUrlWithBackendUrl, getFileExtension } from '@strapi/helper-plugin';
import { ImageAssetCard } from '../AssetCard/ImageAssetCard';
import { VideoAssetCard } from '../AssetCard/VideoAssetCard';
import { DocAssetCard } from '../AssetCard/DocAssetCard';
import { AssetType } from '../../constants';

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
          const isSelected = selectedAssets.indexOf(asset) > -1;

          if (asset.mime.includes(AssetType.Video)) {
            return (
              <VideoAssetCard
                id={asset.id}
                key={asset.id}
                name={asset.name}
                extension={getFileExtension(asset.ext)}
                url={prefixFileUrlWithBackendUrl(asset.url)}
                mime={asset.mime}
                onEdit={() => onEditAsset(asset)}
                onSelect={() => onSelectAsset(asset)}
                selected={isSelected}
                size={size}
              />
            );
          }

          if (asset.mime.includes(AssetType.Image)) {
            return (
              <ImageAssetCard
                id={asset.id}
                key={asset.id}
                name={asset.name}
                alt={asset.alternativeText || asset.name}
                extension={getFileExtension(asset.ext)}
                height={asset.height}
                width={asset.width}
                thumbnail={prefixFileUrlWithBackendUrl(asset?.formats?.thumbnail?.url || asset.url)}
                onEdit={() => onEditAsset(asset)}
                onSelect={() => onSelectAsset(asset)}
                selected={isSelected}
                size={size}
              />
            );
          }

          return (
            <DocAssetCard
              id={asset.id}
              key={asset.id}
              name={asset.name}
              extension={getFileExtension(asset.ext)}
              onEdit={() => onEditAsset(asset)}
              onSelect={() => onSelectAsset(asset)}
              selected={isSelected}
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
