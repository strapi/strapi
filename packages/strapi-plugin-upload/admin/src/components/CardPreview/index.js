import React from 'react';
import PropTypes from 'prop-types';

import { getExtension, getType } from '../../utils';

import BrokenFile from '../../icons/BrokenFile';
import FileIcon from '../FileIcon';
import Wrapper from './Wrapper';
import Image from './Image';

const CardPreview = ({ hasError, url, type, withFileCaching }) => {
  const isFile = getType(type) === 'file';

  if (hasError) {
    return (
      <Wrapper isFile>
        <BrokenFile />
      </Wrapper>
    );
  }

  return (
    <Wrapper isFile={isFile}>
      {isFile ? (
        <FileIcon ext={getExtension(type)} />
      ) : (
        // Adding performance.now forces the browser no to cache the img
        // https://stackoverflow.com/questions/126772/how-to-force-a-web-browser-not-to-cache-images
        <Image src={`${url}${withFileCaching ? `?${performance.now()}` : ''}`} />
      )}
    </Wrapper>
  );
};

CardPreview.defaultProps = {
  hasError: false,
  url: null,
  type: '',
  withFileCaching: true,
};

CardPreview.propTypes = {
  hasError: PropTypes.bool,
  url: PropTypes.string,
  type: PropTypes.string,
  withFileCaching: PropTypes.bool,
};

export default CardPreview;
