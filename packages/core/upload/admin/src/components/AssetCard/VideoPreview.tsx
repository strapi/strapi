import * as React from 'react';

import { Box, VisuallyHidden } from '@strapi/design-system';

// According to MDN
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/readyState#value
const HAVE_FUTURE_DATA = 3;

interface VideoPreviewProps {
  alt: string;
  url: string;
  mime: string;
  onLoadDuration?: (duration?: number) => void;
  size?: 'S' | 'M';
}

export const VideoPreview = ({
  url,
  mime,
  onLoadDuration = () => {},
  alt,
  ...props
}: VideoPreviewProps) => {
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    if (e.currentTarget.currentTime > 0) {
      const video = e.currentTarget;
      const canvas = document.createElement('canvas');

      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      canvas.getContext('2d')?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

      video.replaceWith(canvas);
      onLoadDuration && onLoadDuration(video.duration);
    }
  };

  const handleThumbnailVisibility = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;

    if (video.readyState < HAVE_FUTURE_DATA) return;

    video.play();
  };

  return (
    <Box tag="figure" key={url} {...props}>
      <video
        muted
        onLoadedData={handleThumbnailVisibility}
        src={url}
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
      >
        <source type={mime} />
      </video>
      <VisuallyHidden tag="figcaption">{alt}</VisuallyHidden>
    </Box>
  );
};
