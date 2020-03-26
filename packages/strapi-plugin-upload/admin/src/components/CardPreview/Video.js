import React from 'react';
import PropTypes from 'prop-types';

import VideoPreview from '../VideoPreview';
import Image from './Image';

const Video = ({ previewUrl, src }) => {
  if (previewUrl) {
    return <Image src={previewUrl} />;
  }

  return <VideoPreview src={src} />;
};

Video.defaultProps = {
  previewUrl: null,
  src: null,
};

Video.propTypes = {
  previewUrl: PropTypes.string,
  src: PropTypes.string,
};

export default Video;
