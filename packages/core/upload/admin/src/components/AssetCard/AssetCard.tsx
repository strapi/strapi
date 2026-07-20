import { ASSET_TYPES } from '../../enums';
import { createAssetUrl, getFileExtension, prefixFileUrlWithBackendUrl } from '../../utils';

import { AudioAssetCard } from './AudioAssetCard';
import { DocAssetCard } from './DocAssetCard';
import { ImageAssetCard } from './ImageAssetCard';
import { VideoAssetCard } from './VideoAssetCard';

import type { File } from '../../../../shared/contracts/files';

type FileSelectable = File & { isSelectable?: boolean };

export type AllowedTypes = 'files' | 'images' | 'videos' | 'audios';

interface AssetCardProps {
  asset: FileSelectable;
  local?: boolean;
  onSelect?: (asset: FileSelectable) => void;
  onEdit?: (asset: FileSelectable) => void;
  onRemove?: (asset: FileSelectable) => void;
  isSelected?: boolean;
  size?: 'S' | 'M';
  allowedTypes?: AllowedTypes[];
  alt?: string;
  className?: string;
}

export const AssetCard = ({
  asset,
  isSelected = false,
  onSelect,
  onEdit,
  onRemove,
  size = 'M',
  local = false,
  className,
}: AssetCardProps) => {
  const handleSelect = onSelect ? () => onSelect(asset) : undefined;

  const commonAssetCardProps = {
    id: asset.id,
    isSelectable: asset.isSelectable,
    extension: getFileExtension(asset.ext)!,
    name: asset.name,
    url: local ? asset.url! : createAssetUrl(asset, true)!,
    mime: asset.mime!,
    onEdit: onEdit ? () => onEdit(asset) : undefined,
    onSelect: handleSelect,
    onRemove: onRemove ? () => onRemove(asset) : undefined,
    selected: isSelected,
    size,
    className,
  };

  if (asset.mime?.includes(ASSET_TYPES.Video)) {
    return <VideoAssetCard {...commonAssetCardProps} />;
  }

  if (asset.mime?.includes(ASSET_TYPES.Image)) {
    return (
      <ImageAssetCard
        alt={asset.alternativeText || asset.name}
        height={asset.height!}
        thumbnail={prefixFileUrlWithBackendUrl(asset?.formats?.thumbnail?.url || asset.url)!}
        width={asset.width!}
        updatedAt={asset.updatedAt}
        isUrlSigned={asset?.isUrlSigned || false}
        // Only signed remote URLs need crossOrigin: they are loaded without a
        // cache-buster, so thumbnail and preview share a cache entry and must
        // both opt into CORS to avoid a cache collision. Public/unsigned remote
        // URLs are cache-busted, so they must not require a bucket CORS rule to
        // render. See #26581.
        crossOrigin={!local && asset?.isUrlSigned ? 'anonymous' : undefined}
        {...commonAssetCardProps}
      />
    );
  }

  if (asset.mime?.includes(ASSET_TYPES.Audio)) {
    return <AudioAssetCard {...commonAssetCardProps} />;
  }

  return <DocAssetCard {...commonAssetCardProps} />;
};
