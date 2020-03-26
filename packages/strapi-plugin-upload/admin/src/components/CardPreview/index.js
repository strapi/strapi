import React from 'react';
import PropTypes from 'prop-types';

import { getExtension, getType } from '../../utils';

import BrokenFile from '../../icons/BrokenFile';
import FileIcon from '../FileIcon';
import Wrapper from './Wrapper';
import Image from './Image';
import Video from './Video';

const CardPreview = ({ hasError, url, previewUrl, type, withFileCaching }) => {
  const isFile = getType(type) === 'file';
  const isVideo = getType(type) === 'video';

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
        <FileIcon ext={getExtension(type)} />
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      {isVideo ? (
        <Video src={url} previewUrl={previewUrl} />
      ) : (
        <Image src={`${url}${withFileCaching ? `?${performance.now()}` : ''}`} />
      )}
    </Wrapper>
  );
};

CardPreview.defaultProps = {
  hasError: false,
  previewUrl: null,
  url: null,
  type: '',
  withFileCaching: true,
};

CardPreview.propTypes = {
  hasError: PropTypes.bool,
  previewUrl: PropTypes.string,
  url: PropTypes.string,
  type: PropTypes.string,
  withFileCaching: PropTypes.bool,
};

export default CardPreview;
