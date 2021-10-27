import React from 'react';
import PropTypes from 'prop-types';
import { prefixFileUrlWithBackendUrl, getFileExtension } from '@strapi/helper-plugin';
import { ImageAssetCard } from './ImageAssetCard';
import { VideoAssetCard } from './VideoAssetCard';
import { DocAssetCard } from './DocAssetCard';
import { AssetType } from '../../constants';

export const AssetCard = ({ asset, isSelected, onSelect, onEdit, size }) => {
  if (asset.mime.includes(AssetType.Video)) {
    return (
      <VideoAssetCard
        id={asset.id}
        key={asset.id}
        name={asset.name}
        extension={getFileExtension(asset.ext)}
        url={prefixFileUrlWithBackendUrl(asset.url)}
        mime={asset.mime}
        onEdit={() => onEdit(asset)}
        onSelect={() => onSelect(asset)}
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
        onEdit={() => onEdit(asset)}
        onSelect={() => onSelect(asset)}
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
      onEdit={() => onEdit(asset)}
      onSelect={() => onSelect(asset)}
      selected={isSelected}
      size={size}
    />
  );
};

AssetCard.defaultProps = {
  isSelected: false,
  onSelect: undefined,
  onEdit: undefined,
  size: 'M',
};

AssetCard.propTypes = {
  asset: PropTypes.shape({
    id: PropTypes.number,
    height: PropTypes.number,
    width: PropTypes.number,
    size: PropTypes.number,
    createdAt: PropTypes.string,
    ext: PropTypes.string,
    mime: PropTypes.string,
    name: PropTypes.string,
    url: PropTypes.string,
    alternativeText: PropTypes.string,
    caption: PropTypes.string,
    formats: PropTypes.shape({
      thumbnail: PropTypes.shape({
        url: PropTypes.string,
      }),
    }),
  }).isRequired,
  onSelect: PropTypes.func,
  onEdit: PropTypes.func,
  isSelected: PropTypes.bool,
  size: PropTypes.oneOf(['S', 'M']),
};
