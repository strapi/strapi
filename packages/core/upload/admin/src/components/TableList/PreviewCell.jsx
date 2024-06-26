import React from 'react';

import { Avatar, Box, Icon, Initials } from '@strapi/design-system';
import { getFileExtension, prefixFileUrlWithBackendUrl, pxToRem } from '@strapi/helper-plugin';
import { Folder } from '@strapi/icons';
import PropTypes from 'prop-types';
import styled from 'styled-components';

import { AssetType } from '../../constants';
import { createAssetUrl } from '../../utils';
import { VideoPreview } from '../AssetCard/VideoPreview';

const VideoPreviewWrapper = styled(Box)`
  figure {
    width: ${({ theme }) => theme.spaces[7]};
    height: ${({ theme }) => theme.spaces[7]};
  }

  canvas,
  video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 50%;
  }
`;

export const PreviewCell = ({ type, content }) => {
  if (type === 'folder') {
    return (
      <Initials background="secondary100" textColor="secondary600">
        <Icon color="secondary500" width={pxToRem(16)} height={pxToRem(16)} as={Folder} />
      </Initials>
    );
  }

  const { alternativeText, ext, formats, mime, name, url } = content;

  if (mime.includes(AssetType.Image)) {
    const mediaURL =
      prefixFileUrlWithBackendUrl(formats?.thumbnail?.url) ?? prefixFileUrlWithBackendUrl(url);

    return <Avatar src={mediaURL} alt={alternativeText} preview />;
  }

  if (mime.includes(AssetType.Video)) {
    return (
      <VideoPreviewWrapper>
        <VideoPreview
          url={createAssetUrl(content, true)}
          mime={mime}
          alt={alternativeText ?? name}
        />
      </VideoPreviewWrapper>
    );
  }

  return (
    <Initials background="secondary100" textColor="secondary600">
      {getFileExtension(ext)}
    </Initials>
  );
};

PreviewCell.propTypes = {
  content: PropTypes.shape({
    alternativeText: PropTypes.string,
    ext: PropTypes.string,
    formats: PropTypes.shape({
      thumbnail: PropTypes.shape({
        url: PropTypes.string,
      }),
    }),
    mime: PropTypes.string,
    name: PropTypes.string,
    url: PropTypes.string,
  }).isRequired,
  type: PropTypes.string.isRequired,
};
