// TODO: replace this import with the one from constants when the file is migrated to typescript
import { AssetType } from '../../newConstants';
import { createAssetUrl, getFileExtension, prefixFileUrlWithBackendUrl } from '../../utils';

import { AudioAssetCard } from './AudioAssetCard';
import { DocAssetCard } from './DocAssetCard';
import { ImageAssetCard } from './ImageAssetCard';
import { VideoAssetCard } from './VideoAssetCard';
import type { AssetEnriched } from '../../../../shared/contracts/files';

export const AssetCard = ({
  asset,
  onSelect,
  onEdit,
  onRemove,
  size = 'M',
  local = false,
  isSelected = false,
}: {
  asset: AssetEnriched;
  isSelected?: boolean;
  onSelect?: (asset: AssetEnriched) => void;
  onEdit?: (asset: AssetEnriched) => void;
  onRemove?: (asset: AssetEnriched) => void;
  size?: 'S' | 'M';
  local?: boolean;
  allowedTypes?: string[];
  alt?: string;
}) => {
  const handleSelect = onSelect ? () => onSelect(asset) : undefined;

  const commonAssetCardProps = {
    id: asset.id,
    isSelectable: asset.isSelectable,
    extension: getFileExtension(asset.ext) || '', // Ensure extension is always a string
    name: asset.name,
    url: local ? asset.url : createAssetUrl(asset, true),
    mime: asset.mime,
    onEdit: onEdit ? () => onEdit(asset) : undefined,
    onSelect: handleSelect,
    onRemove: onRemove ? () => onRemove(asset) : undefined,
    selected: isSelected,
    size,
  };

  if (asset?.mime?.includes(AssetType.Video)) {
    return <VideoAssetCard {...commonAssetCardProps} />;
  }

  if (asset?.mime?.includes(AssetType.Image)) {
    return (
      <ImageAssetCard
        {...commonAssetCardProps}
        alt={asset.alternativeText || asset.name}
        height={asset.height}
        thumbnail={prefixFileUrlWithBackendUrl(asset?.formats?.thumbnail?.url || asset.url)}
        width={asset.width}
        updatedAt={asset.updatedAt}
        isUrlSigned={asset?.isUrlSigned || false}
      />
    );
  }

  if (asset?.mime?.includes(AssetType.Audio)) {
    return <AudioAssetCard {...commonAssetCardProps} />;
  }

  return <DocAssetCard {...commonAssetCardProps} />;
};
