import React from 'react';
import PropTypes from 'prop-types';

import FileIcon from '../FileIcon';
import Wrapper from './Wrapper';
import Image from './Image';

const CardPreview = ({ url, type }) => {
  return (
    <Wrapper isImg={!!url}>{!url ? <FileIcon fileType={type} /> : <Image src={url} />}</Wrapper>
  );
};

CardPreview.defaultProps = {
  url: null,
  type: null,
};

CardPreview.propTypes = {
  url: PropTypes.string,
  type: PropTypes.string,
};

export default CardPreview;
