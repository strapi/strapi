import * as React from 'react';

import { Box, CardAsset, CardTimer } from '@strapi/design-system';
import { styled } from 'styled-components';

// TODO: Replace it with the import from utils when all the utils are migrated to typescript
import { formatDuration } from '../../utils/formatDuration';

import { AssetCardBase } from './AssetCardBase';
import { VideoPreview } from './VideoPreview';

import type { AssetCardBaseProps } from './AssetCardBase';

const VideoPreviewWrapper = styled(Box)`
  canvas,
  video {
    display: block;
    pointer-events: none;
    max-width: 100%;
    max-height: ${({ size }) => (size === 'M' ? 16.4 : 8.8)}rem;
  }
`;

export interface VideoAssetCardProps extends AssetCardBaseProps {
  mime: string;
  url?: string;
  size?: 'S' | 'M';
}

export const VideoAssetCard = ({ name, url, mime, size = 'M', ...props }: VideoAssetCardProps) => {
  const [duration, setDuration] = React.useState<number>();

  const formattedDuration = duration && formatDuration(duration);

  return (
    <AssetCardBase name={name} {...props} variant="Video">
      <CardAsset size={size}>
        <VideoPreviewWrapper size={size}>
          <VideoPreview url={url} mime={mime} onLoadDuration={setDuration} alt={name} />
        </VideoPreviewWrapper>
      </CardAsset>
      <CardTimer>{formattedDuration || '...'}</CardTimer>
    </AssetCardBase>
  );
};
