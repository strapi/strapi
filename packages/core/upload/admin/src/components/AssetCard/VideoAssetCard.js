import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import { CardAsset, CardTimer } from '@strapi/design-system/Card';
import { Box } from '@strapi/design-system/Box';

import { VideoPreview } from './VideoPreview';
import { AssetCardBase } from './AssetCardBase';

import { formatDuration } from '../../utils';

const VideoPreviewWrapper = styled(Box)`
  canvas,
  video {
    display: block;
    max-width: 100%;
    max-height: ${({ size }) => (size === 'M' ? 164 / 16 : 88 / 16)}rem;
  }
`;

export const VideoAssetCard = ({ name, url, mime, size, ...props }) => {
  const [duration, setDuration] = useState();

  const formattedDuration = duration && formatDuration(duration);

  return (
    <AssetCardBase {...props} variant="Video">
      <CardAsset size={size}>
        <VideoPreviewWrapper size={size}>
          <VideoPreview url={url} mime={mime} onLoadDuration={setDuration} alt={name} />
        </VideoPreviewWrapper>
      </CardAsset>
      <CardTimer>{formattedDuration || '...'}</CardTimer>
    </AssetCardBase>
  );
};

VideoAssetCard.defaultProps = {
  onSelect: undefined,
  onEdit: undefined,
  onRemove: undefined,
  selected: false,
  size: 'M',
};

VideoAssetCard.propTypes = {
  extension: PropTypes.string.isRequired,
  mime: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  onSelect: PropTypes.func,
  onEdit: PropTypes.func,
  onRemove: PropTypes.func,
  url: PropTypes.string.isRequired,
  selected: PropTypes.bool,
  size: PropTypes.oneOf(['S', 'M']),
};
