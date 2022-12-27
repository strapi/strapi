import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { getFileExtension, prefixFileUrlWithBackendUrl, pxToRem } from '@strapi/helper-plugin';
import { Avatar } from '@strapi/design-system/Avatar';
import { Flex } from '@strapi/design-system/Flex';
import { Box } from '@strapi/design-system/Box';
import { Typography } from '@strapi/design-system/Typography';
import { Icon } from '@strapi/design-system/Icon';
import Folder from '@strapi/icons/Folder';

import { AssetType } from '../../constants';
import { createAssetUrl } from '../../utils';
import { VideoPreview } from '../AssetCard/VideoPreview';

const GenericAssetWrapper = styled(Flex)`
  span {
    /* The smallest fontSize in the DS is not small enough in this case */
    font-size: ${pxToRem(10)};
  }
`;

// Temp: Avatar should support video preview
const VideoPreviewWrapper = styled(Box)`
  figure {
    width: 26px;
    height: 26px;
  }

  canvas,
  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
`;

export const PreviewCell = ({ type, element }) => {
  if (type === 'folder') {
    return (
      <Flex
        background="secondary100"
        height={pxToRem(26)}
        justifyContent="center"
        width={pxToRem(26)}
        borderRadius="50%"
      >
        <Icon color="secondary500" as={Folder} />
      </Flex>
    );
  }

  const { alternativeText, ext, formats, mime, url } = element;

  if (mime.includes(AssetType.Image)) {
    const mediaURL =
      prefixFileUrlWithBackendUrl(formats?.thumbnail?.url) ?? prefixFileUrlWithBackendUrl(url);

    return <Avatar src={mediaURL} alt={alternativeText} preview />;
  }

  if (mime.includes(AssetType.Video)) {
    return (
      <VideoPreviewWrapper>
        <VideoPreview
          url={createAssetUrl(element, true)}
          mime={mime}
          onLoadDuration={() => {}}
          alt={alternativeText}
        />
      </VideoPreviewWrapper>
    );
  }

  return (
    <GenericAssetWrapper
      background="secondary100"
      height={pxToRem(26)}
      justifyContent="center"
      width={pxToRem(26)}
      borderRadius="50%"
    >
      <Typography variant="sigma" textColor="secondary600">
        {getFileExtension(ext)}
      </Typography>
    </GenericAssetWrapper>
  );
};

PreviewCell.propTypes = {
  element: PropTypes.shape({
    alternativeText: PropTypes.string,
    ext: PropTypes.string,
    formats: PropTypes.shape({
      thumbnail: PropTypes.shape({
        url: PropTypes.string,
      }),
    }),
    mime: PropTypes.string,
    url: PropTypes.string,
  }).isRequired,
  type: PropTypes.string.isRequired,
};
