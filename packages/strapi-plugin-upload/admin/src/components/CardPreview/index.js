import React from 'react';
import PropTypes from 'prop-types';

import { getType } from '../../utils';

import BrokenFile from '../../icons/BrokenFile';
import FileIcon from '../FileIcon';
import Wrapper from './Wrapper';
import Image from './Image';

const CardPreview = ({ hasError, url, type }) => {
  const isFile = getType(type) === 'file';

  const renderFile = () => <FileIcon fileType={type} />;

  const renderImage = () => <Image src={url} />;

  return (
    <Wrapper isFile={isFile || hasError}>
      {!hasError && isFile && renderFile()}
      {!hasError && !isFile && renderImage()}
      {hasError && <BrokenFile />}
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
