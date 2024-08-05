/* eslint-disable jsx-a11y/media-has-caption */
import * as React from 'react';

import { Box, BoxProps, VisuallyHidden } from '@strapi/design-system';

// According to MDN
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/readyState#value
const HAVE_FUTURE_DATA = 3;

interface VideoPreviewProps extends BoxProps {
  alt: string;
  url?: string;
  mime: string | null;
  onLoadDuration?: (duration: number) => void;
}

export const VideoPreview = ({ url, mime, onLoadDuration, alt, ...props }: VideoPreviewProps) => {
  const handleTimeUpdate: React.ReactEventHandler<HTMLVideoElement> = (e) => {
    if ((e.target as HTMLVideoElement).currentTime > 0) {
      const video = e.target as HTMLVideoElement;
      const canvas = document.createElement('canvas');

      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
      }

      video.replaceWith(canvas);
      if (onLoadDuration) {
        onLoadDuration(video.duration);
      }
    }
  };

  const handleThumbnailVisibility: React.ReactEventHandler<HTMLVideoElement> = (e) => {
    const video = e.target as HTMLVideoElement;

    if (video.readyState < HAVE_FUTURE_DATA) return;

    video.play();
  };

  return (
    <Box tag="figure" {...props}>
      <video
        muted
        onLoadedData={handleThumbnailVisibility}
        src={url}
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
      >
        <source type={mime || undefined} />
      </video>
      <VisuallyHidden tag="figcaption">{alt}</VisuallyHidden>
    </Box>
  );
};
