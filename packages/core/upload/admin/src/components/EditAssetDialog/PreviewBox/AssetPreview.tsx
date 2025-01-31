/* eslint-disable jsx-a11y/media-has-caption */
import * as React from 'react';

import MuxPlayer from '@mux/mux-player-react';
import { Box, Flex, Typography } from '@strapi/design-system';
import { File, FilePdf } from '@strapi/icons';
import { useIntl } from 'react-intl';
import { styled, useTheme } from 'styled-components';

import { AssetType } from '../../../constants';

const CardAsset = styled(Flex)`
  min-height: 26.4rem;
  border-radius: ${({ theme }) => theme.borderRadius} ${({ theme }) => theme.borderRadius} 0 0;
  background: linear-gradient(
    180deg,
    ${({ theme }) => theme.colors.neutral0} 0%,
    ${({ theme }) => theme.colors.neutral100} 121.48%
  );
`;

interface AssetPreviewProps {
  mime: string;
  name: string;
  url: string;
  onLoad?: () => void;
}

export const AssetPreview = React.forwardRef<
  HTMLImageElement | HTMLVideoElement | HTMLAudioElement,
  AssetPreviewProps
>(({ mime, url, name, ...props }, ref) => {
  const theme = useTheme();

  const { formatMessage } = useIntl();

  if (mime.includes(AssetType.Image)) {
    return (
      <img ref={ref as React.ForwardedRef<HTMLImageElement>} src={url} alt={name} {...props} />
    );
  }

  if (mime.includes(AssetType.Video)) {
    return <MuxPlayer src={url} accentColor={theme.colors.primary500} />;
  }

  if (mime.includes(AssetType.Audio)) {
    return (
      <Box margin="5">
        <audio controls src={url} ref={ref as React.ForwardedRef<HTMLAudioElement>} {...props}>
          {name}
        </audio>
      </Box>
    );
  }

  if (mime.includes('pdf')) {
    return (
      <CardAsset width="100%" justifyContent="center" {...props}>
        <Flex gap={2} direction="column" alignItems="center">
          <FilePdf aria-label={name} fill="neutral500" width={24} height={24} />
          <Typography textColor="neutral500" variant="pi">
            {formatMessage({
              id: 'noPreview',
              defaultMessage: 'No preview available',
            })}
          </Typography>
        </Flex>
      </CardAsset>
    );
  }

  return (
    <CardAsset width="100%" justifyContent="center" {...props}>
      <Flex gap={2} direction="column" alignItems="center">
        <File aria-label={name} fill="neutral500" width={24} height={24} />

        <Typography textColor="neutral500" variant="pi">
          {formatMessage({
            id: 'noPreview',
            defaultMessage: 'No preview available',
          })}
        </Typography>
      </Flex>
    </CardAsset>
  );
});

AssetPreview.displayName = 'AssetPreview';
