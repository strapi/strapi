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
