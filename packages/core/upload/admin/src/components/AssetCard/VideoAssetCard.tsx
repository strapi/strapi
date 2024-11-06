import * as React from 'react';

import { Box, CardAsset, CardTimer } from '@strapi/design-system';
import { styled } from 'styled-components';

import { formatDuration } from '../../utils';

import { AssetCardBase, AssetCardBaseProps } from './AssetCardBase';
import { VideoPreview } from './VideoPreview';

const VideoPreviewWrapper = styled(Box)`
  canvas,
  video {
    display: block;
    pointer-events: none;
    max-width: 100%;
    max-height: ${({ size }) => (size === 'M' ? 16.4 : 8.8)}rem;
  }
`;

interface VideoAssetCardProps extends Omit<AssetCardBaseProps, 'variant' | 'children'> {
  mime: string;
  url: string;
  size?: 'S' | 'M';
}

export const VideoAssetCard = ({
  name,
  url,
  mime,
  size = 'M',
  selected = false,
  ...props
}: VideoAssetCardProps) => {
  const [duration, setDuration] = React.useState<number>();

  const formattedDuration = duration && formatDuration(duration);

  return (
    <AssetCardBase selected={selected} name={name} {...props} variant="Video">
      <CardAsset size={size}>
        <VideoPreviewWrapper size={size}>
          <VideoPreview url={url} mime={mime} onLoadDuration={setDuration} alt={name} />
        </VideoPreviewWrapper>
      </CardAsset>
      <CardTimer>{formattedDuration || '...'}</CardTimer>
    </AssetCardBase>
  );
};
