import React from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { getFileExtension, prefixFileUrlWithBackendUrl, pxToRem } from '@strapi/helper-plugin';
import { Avatar, Initials } from '@strapi/design-system/Avatar';
import { Box } from '@strapi/design-system/Box';
import { Icon } from '@strapi/design-system/Icon';
import Folder from '@strapi/icons/Folder';

import { AssetType } from '../../constants';
import { createAssetUrl } from '../../utils';
import { VideoPreview } from '../AssetCard/VideoPreview';

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
      <Initials background="secondary100" textColor="secondary600">
        <Icon color="secondary500" width={pxToRem(15)} height={pxToRem(15)} as={Folder} />
      </Initials>
    );
  }

  const { alternativeText, ext, formats, mime, name, url } = element;

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
  element: PropTypes.shape({
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
