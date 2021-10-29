import React from 'react';
import styled from 'styled-components';
import BookIcon from '@strapi/icons/Book';
import { Icon } from '@strapi/design-system/Icon';
import { Box } from '@strapi/design-system/Box';
import { AssetType, AssetDefinition } from '../../../constants';
import { VideoPreview } from '../../AssetCard/VideoPreview';
import { createAssetUrl } from '../../../utils/createAssetUrl';

const VideoPreviewWrapper = styled(Box)`
  canvas,
  video {
    max-width: 100%;
    height: 124px;
  }
`;

export const CarouselAsset = ({ asset }) => {
  if (asset.mime.includes(AssetType.Video)) {
    return (
      <VideoPreviewWrapper height="100%">
        <VideoPreview
          url={createAssetUrl(asset)}
          mime={asset.mime}
          alt={asset.alternativeText || asset.name}
        />
      </VideoPreviewWrapper>
    );
  }

  if (asset.mime.includes(AssetType.Image)) {
    return (
      <Box
        as="img"
        maxHeight="100%"
        maxWidth="100%"
        src={createAssetUrl(asset)}
        alt={asset.alternativeText || asset.name}
      />
    );
  }

  return <Icon as={BookIcon} aria-label={asset.alternativeText || asset.name} />;
};

CarouselAsset.propTypes = {
  asset: AssetDefinition.isRequired,
};
