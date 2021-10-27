import React from 'react';
import IconDocumentation from '@strapi/icons/IconDocumentation';
import { Icon } from '@strapi/parts/Icon';
import { Box } from '@strapi/parts/Box';
import { AssetType, AssetDefinition } from '../../../constants';
import { VideoPreview } from '../../AssetCard/VideoPreview';
import { createAssetUrl } from '../../../utils/createAssetUrl';

export const CarouselAsset = ({ asset }) => {
  if (asset.mime.includes(AssetType.Video)) {
    return (
      <VideoPreview url={createAssetUrl(asset)} mime={asset.mime} uniqueKey={asset.updatedAt} />
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

  return <Icon as={IconDocumentation} />;
};

CarouselAsset.propTypes = {
  asset: AssetDefinition.isRequired,
};
