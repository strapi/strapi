import React from 'react';
import PropTypes from 'prop-types';
import { prefixFileUrlWithBackendUrl, getFileExtension } from '@strapi/helper-plugin';
import { ImageAssetCard } from './ImageAssetCard';
import { VideoAssetCard } from './VideoAssetCard';
import { DocAssetCard } from './DocAssetCard';
import { AudioAssetCard } from './AudioAssetCard';
import { AssetType, AssetDefinition } from '../../constants';
import { createAssetUrl, toSingularTypes } from '../../utils';

export const AssetCard = ({
  allowedTypes,
  asset,
  isSelected,
  onSelect,
  onEdit,
  onRemove,
  size,
  local,
}) => {
  const singularTypes = toSingularTypes(allowedTypes);
  const fileType = asset.mime.split('/')[0];
  const handleSelect = onSelect ? () => onSelect(asset) : undefined;
  const canSelectAsset =
    singularTypes.includes(fileType) ||
    (singularTypes.includes('file') && !['video', 'image', 'audio'].includes(fileType));

  const commonAssetCardProps = {
    id: asset.id,
    extension: getFileExtension(asset.ext),
    key: asset.id,
    name: asset.name,
    url: local ? asset.url : createAssetUrl(asset, true),
    mime: asset.mime,
    onEdit: onEdit ? () => onEdit(asset) : undefined,
    onSelect: !canSelectAsset && !isSelected ? undefined : handleSelect,
    onRemove: onRemove ? () => onRemove(asset) : undefined,
    selected: isSelected,
    size,
  };

  if (asset.mime.includes(AssetType.Video)) {
    return <VideoAssetCard {...commonAssetCardProps} />;
  }

  if (asset.mime.includes(AssetType.Image)) {
    return (
      <ImageAssetCard
        {...commonAssetCardProps}
        alt={asset.alternativeText || asset.name}
        height={asset.height}
        thumbnail={prefixFileUrlWithBackendUrl(asset?.formats?.thumbnail?.url || asset.url)}
        width={asset.width}
      />
    );
  }

  if (asset.mime.includes(AssetType.Audio)) {
    return <AudioAssetCard {...commonAssetCardProps} />;
  }

  return <DocAssetCard {...commonAssetCardProps} />;
};

AssetCard.defaultProps = {
  allowedTypes: ['images', 'files', 'videos', 'audios'],
  isSelected: false,
  // Determine if the asset is loaded locally or from a remote resource
  local: false,
  onSelect: undefined,
  onEdit: undefined,
  onRemove: undefined,
  size: 'M',
};

AssetCard.propTypes = {
  allowedTypes: PropTypes.array,
  asset: AssetDefinition.isRequired,
  local: PropTypes.bool,
  onSelect: PropTypes.func,
  onEdit: PropTypes.func,
  onRemove: PropTypes.func,
  isSelected: PropTypes.bool,
  size: PropTypes.oneOf(['S', 'M']),
};
