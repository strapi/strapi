import React, { memo, useRef } from 'react';
import PropTypes from 'prop-types';

import { getType } from '../../utils';

import BrokenFile from '../../icons/BrokenFile';
import FileIcon from '../FileIcon';
import VideoPreview from '../VideoPreview';
import Wrapper from './Wrapper';
import Image from './Image';

const CardPreview = ({ extension, hasError, hasIcon, url, previewUrl, type, withFileCaching }) => {
  const isFile = getType(type) === 'file';
  const isVideo = getType(type) === 'video';
  const cacheRef = useRef(performance.now());

  if (hasError) {
    return (
      <Wrapper isFile>
        <BrokenFile />
      </Wrapper>
    );
  }

  if (isFile) {
    return (
      <Wrapper isFile>
        <FileIcon ext={extension} />
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      {isVideo ? (
        <VideoPreview src={url} previewUrl={previewUrl} hasIcon={hasIcon} />
      ) : (
        // Adding performance.now forces the browser no to cache the img
        // https://stackoverflow.com/questions/126772/how-to-force-a-web-browser-not-to-cache-images
        <Image src={`${url}${withFileCaching ? `?${cacheRef.current}` : ''}`} />
      )}
    </Wrapper>
  );
};

CardPreview.defaultProps = {
  extension: null,
  hasError: false,
  hasIcon: false,
  previewUrl: null,
  url: null,
  type: '',
  withFileCaching: true,
};

CardPreview.propTypes = {
  extension: PropTypes.string,
  hasError: PropTypes.bool,
  hasIcon: PropTypes.bool,
  previewUrl: PropTypes.string,
  url: PropTypes.string,
  type: PropTypes.string,
  withFileCaching: PropTypes.bool,
};

export default memo(CardPreview);
