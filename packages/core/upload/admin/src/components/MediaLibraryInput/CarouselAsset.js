import React from 'react';
import PropTypes from 'prop-types';
import { prefixFileUrlWithBackendUrl } from '@strapi/helper-plugin';
import IconDocumentation from '@strapi/icons/IconDocumentation';
import { Icon } from '@strapi/parts/Icon';
import { Box } from '@strapi/parts/Box';
import { AssetType } from '../../constants';
import { VideoPreview } from '../AssetCard/VideoPreview';

export const CarouselAsset = ({ asset }) => {
  if (asset.mime.includes(AssetType.Video)) {
    return <VideoPreview url={prefixFileUrlWithBackendUrl(asset.url)} mime={asset.mime} />;
  }

  if (asset.mime.includes(AssetType.Image)) {
    return (
      <Box
        as="img"
        maxHeight="100%"
        maxWidth="100%"
        src={prefixFileUrlWithBackendUrl(asset?.formats?.thumbnail?.url || asset.url)}
        alt={asset.alternativeText || asset.name}
      />
    );
  }

  return <Icon as={IconDocumentation} />;
};

CarouselAsset.propTypes = {
  asset: PropTypes.shape({
    id: PropTypes.number,
    height: PropTypes.number,
    width: PropTypes.number,
    size: PropTypes.number,
    createdAt: PropTypes.string,
    ext: PropTypes.string,
    mime: PropTypes.string,
    name: PropTypes.string,
    url: PropTypes.string,
    alternativeText: PropTypes.string,
    caption: PropTypes.string,
    formats: PropTypes.shape({
      thumbnail: PropTypes.shape({
        url: PropTypes.string,
      }),
    }),
  }).isRequired,
};
