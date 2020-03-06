import React from 'react';
import PropTypes from 'prop-types';

import FileIcon from '../FileIcon';
import Wrapper from './Wrapper';
import Image from './Image';

const CardPreview = ({ url, type }) => {
  const isFile = !type.includes('image') && !type.includes('video');

  return (
    <Wrapper isFile={isFile}>{isFile ? <FileIcon fileType={type} /> : <Image src={url} />}</Wrapper>
  );
};

CardPreview.defaultProps = {
  url: null,
  type: '',
};

CardPreview.propTypes = {
  url: PropTypes.string,
  type: PropTypes.string,
};

export default CardPreview;
