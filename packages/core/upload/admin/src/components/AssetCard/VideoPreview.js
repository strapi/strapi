/* eslint-disable jsx-a11y/media-has-caption */
import React from 'react';

import { Box, VisuallyHidden } from '@strapi/design-system';
import PropTypes from 'prop-types';

// According to MDN
// https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/readyState#value
const HAVE_FUTURE_DATA = 3;

export const VideoPreview = ({ url, mime, onLoadDuration, alt, ...props }) => {
  const handleTimeUpdate = (e) => {
    if (e.target.currentTime > 0) {
      const video = e.target;
      const canvas = document.createElement('canvas');

      canvas.height = video.videoHeight;
      canvas.width = video.videoWidth;
      canvas.getContext('2d').drawImage(video, 0, 0, video.videoWidth, video.videoHeight);

      video.replaceWith(canvas);
      onLoadDuration(video.duration);
    }
  };

  const handleThumbnailVisibility = (e) => {
    const video = e.target;

    if (video.readyState < HAVE_FUTURE_DATA) return;

    video.play();
  };

  return (
    <Box as="figure" {...props} key={url}>
      <video
        muted
        onLoadedData={handleThumbnailVisibility}
        src={url}
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
      >
        <source type={mime} />
      </video>
      <VisuallyHidden as="figcaption">{alt}</VisuallyHidden>
    </Box>
  );
};

VideoPreview.defaultProps = {
  onLoadDuration() {},
  size: 'M',
};

VideoPreview.propTypes = {
  alt: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
  mime: PropTypes.string.isRequired,
  onLoadDuration: PropTypes.func,
  size: PropTypes.oneOf(['S', 'M']),
};
