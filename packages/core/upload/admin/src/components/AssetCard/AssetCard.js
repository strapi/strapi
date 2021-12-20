import React from 'react';
import PropTypes from 'prop-types';
import { prefixFileUrlWithBackendUrl, getFileExtension } from '@strapi/helper-plugin';
import { ImageAssetCard } from './ImageAssetCard';
import { VideoAssetCard } from './VideoAssetCard';
import { DocAssetCard } from './DocAssetCard';
import { AssetType, AssetDefinition } from '../../constants';
import { createAssetUrl } from '../../utils/createAssetUrl';
import toSingularTypes from '../../utils/toSingularTypes';

export const AssetCard = ({ allowedTypes, asset, isSelected, onSelect, onEdit, size, local }) => {
  const singularTypes = toSingularTypes(allowedTypes);

  let handleSelect = onSelect ? () => onSelect(asset) : undefined;
  const fileType = asset.mime.split('/')[0];

  if (asset.mime.includes(AssetType.Video)) {
    const canSelectAsset = singularTypes.includes(fileType);

    if (!canSelectAsset && !isSelected) {
      handleSelect = undefined;
    }

    return (
      <VideoAssetCard
        id={asset.id}
        key={asset.id}
        name={asset.name}
        extension={getFileExtension(asset.ext)}
        url={local ? asset.url : createAssetUrl(asset, true)}
        mime={asset.mime}
        onEdit={onEdit ? () => onEdit(asset) : undefined}
        onSelect={handleSelect}
        selected={isSelected}
        size={size}
      />
    );
  }

  if (asset.mime.includes(AssetType.Image)) {
    const canSelectAsset = singularTypes.includes(fileType);

    if (!canSelectAsset && !isSelected) {
      handleSelect = undefined;
    }

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
        onEdit={onEdit ? () => onEdit(asset) : undefined}
        onSelect={handleSelect}
        selected={isSelected}
        size={size}
      />
    );
  }

  const canSelectAsset = singularTypes.includes('file') && !['video', 'image'].includes(fileType);

  if (!canSelectAsset && !isSelected) {
    handleSelect = undefined;
  }

  return (
    <DocAssetCard
      id={asset.id}
      key={asset.id}
      name={asset.name}
      extension={getFileExtension(asset.ext)}
      onEdit={onEdit ? () => onEdit(asset) : undefined}
      onSelect={handleSelect}
      selected={isSelected}
      size={size}
    />
  );
};

AssetCard.defaultProps = {
  allowedTypes: ['images', 'files', 'videos'],
  isSelected: false,
  // Determine if the asset is loaded locally or from a remote resource
  local: false,
  onSelect: undefined,
  onEdit: undefined,
  size: 'M',
};

AssetCard.propTypes = {
  allowedTypes: PropTypes.array,
  asset: AssetDefinition.isRequired,
  local: PropTypes.bool,
  onSelect: PropTypes.func,
  onEdit: PropTypes.func,
  isSelected: PropTypes.bool,
  size: PropTypes.oneOf(['S', 'M']),
};
