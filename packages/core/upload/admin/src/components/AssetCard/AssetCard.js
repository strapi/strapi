import React from 'react';
import PropTypes from 'prop-types';
import { prefixFileUrlWithBackendUrl, getFileExtension } from '@strapi/helper-plugin';
import { ImageAssetCard } from './ImageAssetCard';
import { VideoAssetCard } from './VideoAssetCard';
import { DocAssetCard } from './DocAssetCard';
import { AssetType, AssetDefinition } from '../../constants';
import { createAssetUrl } from '../../utils/createAssetUrl';
import toSingularTypes from '../../utils/toSingularTypes';

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

  let handleSelect = onSelect ? () => onSelect(asset) : undefined;
  const fileType = asset.mime.split('/')[0];
  const commonAssetCardProps = {
    id: asset.id,
    key: asset.id,
    name: asset.name,
    url: local ? asset.url : createAssetUrl(asset, true),
    mime: asset.mime,
    onEdit: onEdit ? () => onEdit(asset) : undefined,
    onSelect: handleSelect,
    onRemove: onRemove ? () => onRemove(asset) : undefined,
    selected: isSelected,
    size,
  };

  if (asset.mime.includes(AssetType.Video)) {
    const canSelectAsset = singularTypes.includes(fileType);

    if (!canSelectAsset && !isSelected) {
      handleSelect = undefined;
    }

    return <VideoAssetCard {...commonAssetCardProps} extension={getFileExtension(asset.ext)} />;
  }

  if (asset.mime.includes(AssetType.Image)) {
    const canSelectAsset = singularTypes.includes(fileType);

    if (!canSelectAsset && !isSelected) {
      handleSelect = undefined;
    }

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

  const canSelectAsset = singularTypes.includes('file') && !['video', 'image'].includes(fileType);

  if (!canSelectAsset && !isSelected) {
    handleSelect = undefined;
  }

  return <DocAssetCard {...commonAssetCardProps} extension={getFileExtension(asset.ext)} />;
};

AssetCard.defaultProps = {
  allowedTypes: ['images', 'files', 'videos'],
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
