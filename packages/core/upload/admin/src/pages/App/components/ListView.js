import React from 'react';
import PropTypes from 'prop-types';
import { GridLayout } from '@strapi/parts/Layout';
import { KeyboardNavigable } from '@strapi/parts/KeyboardNavigable';
import { prefixFileUrlWithBackendUrl, getFileExtension } from '@strapi/helper-plugin';
import { ImageAssetCard } from '../../../components/AssetCard/ImageAssetCard';
import { VideoAssetCard } from '../../../components/AssetCard/VideoAssetCard';
import { DocAssetCard } from '../../../components/AssetCard/DocAssetCard';
import { AssetType } from '../../../constants';

export const ListView = ({ assets, onEditAsset, onSelectAsset, selectedAssets }) => {
  return (
    <KeyboardNavigable tagName="article">
      <GridLayout>
        {assets.map(asset => {
          const isSelected = (selectedAssets || []).indexOf(asset.id) > -1;

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
              />
            );
          }

          if (asset.mime.includes(AssetType.Image)) {
            return (
              <ImageAssetCard
                id={asset.id}
                key={asset.id}
                name={asset.name}
                extension={getFileExtension(asset.ext)}
                height={asset.height}
                width={asset.width}
                thumbnail={prefixFileUrlWithBackendUrl(asset?.formats?.thumbnail?.url || asset.url)}
                onEdit={() => onEditAsset(asset)}
                onSelect={() => onSelectAsset(asset)}
                selected={isSelected}
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
            />
          );
        })}
      </GridLayout>
    </KeyboardNavigable>
  );
};

ListView.propTypes = {
  assets: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  onEditAsset: PropTypes.func.isRequired,
  onSelectAsset: PropTypes.func.isRequired,
  selectedAssets: PropTypes.arrayOf(PropTypes.number).isRequired,
};
