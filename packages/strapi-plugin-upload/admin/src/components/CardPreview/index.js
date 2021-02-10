import PropTypes from 'prop-types';
import React, { memo, useRef } from 'react';
import styled from 'styled-components';
import BrokenFile from '../../icons/BrokenFile';
import { getType } from '../../utils';
import FileIcon from '../FileIcon';
import VideoPreview from '../VideoPreview';
import Image from './Image';
import Wrapper from './Wrapper';

const CardPreview = ({
  extension,
  hasError,
  hasIcon,
  url,
  previewUrl,
  type,
  withFileCaching,
  filename,
}) => {
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
        <FileWrap>
          <FileIcon ext={extension} />
          {filename && <p>{filename}</p>}
        </FileWrap>
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

const FileWrap = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: column;
  max-width: 80%;
  text-align: center;
`;

CardPreview.defaultProps = {
  extension: null,
  hasError: false,
  hasIcon: false,
  previewUrl: null,
  url: null,
  type: '',
  withFileCaching: true,
  filename: '',
};

CardPreview.propTypes = {
  extension: PropTypes.string,
  hasError: PropTypes.bool,
  hasIcon: PropTypes.bool,
  previewUrl: PropTypes.string,
  url: PropTypes.string,
  type: PropTypes.string,
  withFileCaching: PropTypes.bool,
  filename: PropTypes.string,
};

export default memo(CardPreview);
