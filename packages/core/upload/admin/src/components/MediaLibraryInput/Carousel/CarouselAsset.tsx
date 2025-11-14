import { Box, Flex } from '@strapi/design-system';
import { styled } from 'styled-components';

import { AssetType } from '../../../enums';
import { createAssetUrl } from '../../../utils';
import { getFileIconComponent } from '../../../utils/icons';
import { AudioPreview } from '../../AssetCard/AudioPreview';
import { VideoPreview } from '../../AssetCard/VideoPreview';

import type { File as FileAsset } from '../../../../../shared/contracts/files';

const DocAsset = styled(Flex)`
  background: linear-gradient(180deg, #ffffff 0%, #f6f6f9 121.48%);
`;

const VideoPreviewWrapper = styled(Box)`
  canvas,
  video {
    max-width: 100%;
    height: 124px;
  }
`;

const AudioPreviewWrapper = styled(Box)`
  canvas,
  audio {
    max-width: 100%;
  }
`;

export const CarouselAsset = ({ asset }: { asset: FileAsset }) => {
  if (asset.mime?.includes(AssetType.Video)) {
    return (
      <VideoPreviewWrapper height="100%">
        <VideoPreview
          url={createAssetUrl(asset, true)!}
          mime={asset.mime}
          alt={asset.alternativeText || asset.name}
        />
      </VideoPreviewWrapper>
    );
  }

  if (asset.mime?.includes(AssetType.Audio)) {
    return (
      <AudioPreviewWrapper>
        <AudioPreview
          url={createAssetUrl(asset, true)!}
          alt={asset.alternativeText || asset.name}
        />
      </AudioPreviewWrapper>
    );
  }

  if (asset.mime?.includes(AssetType.Image)) {
    const assetUrl = createAssetUrl(asset, true);
    if (!assetUrl) return null;

    // Adding a param to the url to bust the cache and force the refresh of the image when replaced
    // Only add updatedAt parameter if the URL is not signed to prevent signature invalidation
    const cacheBustedUrl = asset.isUrlSigned
      ? assetUrl
      : `${assetUrl}${assetUrl.includes('?') ? '&' : '?'}updatedAt=${asset.updatedAt}`;

    return (
      <Box
        tag="img"
        maxHeight="100%"
        maxWidth="100%"
        src={cacheBustedUrl}
        alt={asset.alternativeText || asset.name}
      />
    );
  }

  const IconComponent = getFileIconComponent(asset.ext);

  return (
    <DocAsset width="100%" height="100%" justifyContent="center" hasRadius>
      <IconComponent aria-label={asset.alternativeText || asset.name} width="24px" height="32px" />
    </DocAsset>
  );
};
