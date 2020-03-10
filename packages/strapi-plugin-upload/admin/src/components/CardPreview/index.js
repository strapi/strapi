import React from 'react';
import PropTypes from 'prop-types';

import FileIcon from '../FileIcon';
import Wrapper from './Wrapper';
import Image from './Image';
import BrokenFile from '../../icons/BrokenFile';

const CardPreview = ({ hasError, url, type }) => {
  const isFile = !type.includes('image') && !type.includes('video');

  const renderBrokenFile = () => <BrokenFile />;

  const renderFile = () => <FileIcon fileType={type} />;

  const renderImage = () => <Image src={url} />;

  return (
    <Wrapper isFile={isFile || hasError}>
      {!hasError && isFile && renderFile()}
      {!hasError && !isFile && renderImage()}
      {hasError && renderBrokenFile()}
    </Wrapper>
  );
};

CardPreview.defaultProps = {
  hasError: false,
  url: null,
  type: '',
};

CardPreview.propTypes = {
  hasError: PropTypes.bool,
  url: PropTypes.string,
  type: PropTypes.string,
};

export default CardPreview;
