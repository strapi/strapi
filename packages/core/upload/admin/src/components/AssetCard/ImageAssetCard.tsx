import { CardAsset } from '@strapi/design-system';

import { appendSearchParamsToUrl } from '../../utils';

import { AssetCardBase, AssetCardBaseProps } from './AssetCardBase';

interface ImageAssetCardProps extends Omit<AssetCardBaseProps, 'variant' | 'children'> {
  height?: number;
  width?: number;
  size?: 'S' | 'M';
  thumbnail: string;
  alt: string;
  updatedAt?: string;
  isUrlSigned: boolean;
}

export const ImageAssetCard = ({
  height,
  width,
  thumbnail,
  size = 'M',
  alt,
  isUrlSigned,
  selected = false,
  ...props
}: ImageAssetCardProps) => {
  // appending the updatedAt param to the thumbnail URL prevents it from being cached by the browser (cache busting)
  // applied only if the url is not signed to prevent the signature from being invalidated
  const thumbnailUrl = isUrlSigned
    ? thumbnail
    : appendSearchParamsToUrl({
        url: thumbnail,
        params: { updatedAt: props.updatedAt },
      });
  const subtitle = height && width ? ` - ${width}✕${height}` : undefined;

  return (
    <AssetCardBase {...props} selected={selected} subtitle={subtitle} variant="Image">
      <CardAsset src={thumbnailUrl} size={size} alt={alt} />
    </AssetCardBase>
  );
};
