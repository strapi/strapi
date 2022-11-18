import React from 'react';
import styled from 'styled-components';
import FileIcon from '@strapi/icons/File';
import FilePdfIcon from '@strapi/icons/FilePdf';
import { Box, Flex } from '@strapi/design-system';
import { AssetType, AssetDefinition } from '../../../constants';
import { VideoPreview } from '../../AssetCard/VideoPreview';
import { AudioPreview } from '../../AssetCard/AudioPreview';
import { createAssetUrl } from '../../../utils/createAssetUrl';

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

export const CarouselAsset = ({ asset }) => {
  if (asset.mime.includes(AssetType.Video)) {
    return (
      <VideoPreviewWrapper height="100%">
        <VideoPreview
          url={createAssetUrl(asset, true)}
          mime={asset.mime}
          alt={asset.alternativeText || asset.name}
        />
      </VideoPreviewWrapper>
    );
  }

  if (asset.mime.includes(AssetType.Audio)) {
    return (
      <AudioPreviewWrapper>
        <AudioPreview url={createAssetUrl(asset, true)} alt={asset.alternativeText || asset.name} />
      </AudioPreviewWrapper>
    );
  }

  if (asset.mime.includes(AssetType.Image)) {
    return (
      <Box
        as="img"
        maxHeight="100%"
        maxWidth="100%"
        src={createAssetUrl(asset, true)}
        alt={asset.alternativeText || asset.name}
      />
    );
  }

  return (
    <DocAsset width="100%" height="100%" justifyContent="center" hasRadius>
      {asset.ext.includes('pdf') ? (
        <FilePdfIcon aria-label={asset.alternativeText || asset.name} width="24px" height="32px" />
      ) : (
        <FileIcon aria-label={asset.alternativeText || asset.name} width="24px" height="32px" />
      )}
    </DocAsset>
  );
};

CarouselAsset.propTypes = {
  asset: AssetDefinition.isRequired,
};
