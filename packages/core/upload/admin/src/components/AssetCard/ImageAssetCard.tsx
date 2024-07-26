import { CardAsset } from '@strapi/design-system';

// TODO: Replace it with the import from the utils package when the index  migration is done
import { appendSearchParamsToUrl } from '../../utils/appendSearchParamsToUrl';

import { AssetCardBase, AssetCardBaseProps } from './AssetCardBase';

interface ImageAssetCardProps extends Omit<AssetCardBaseProps, 'variant'> {
  alt: string;
  extension: string;
  height?: number;
  width?: number;
  thumbnail: string;
  isUrlSigned: boolean;
  size?: 'S' | 'M';
  updatedAt?: string;
};

export const ImageAssetCard: React.FC<ImageAssetCardProps> = ({ height, width, thumbnail, size, alt, isUrlSigned, ...props }) => {
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
    <AssetCardBase {...props} subtitle={subtitle} variant="Image">
      <CardAsset src={thumbnailUrl} size={size} alt={alt} />
    </AssetCardBase>
  );
};
