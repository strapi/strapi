import React from 'react';
import PropTypes from 'prop-types';

import FileIcon from '../FileIcon';
import Wrapper from './Wrapper';
import Image from './Image';

const CardPreview = ({ url, type }) => {
  const renderFile = () => {
    if (!url) {
      return <FileIcon fileType={type} />;
    }

    return <Image src={url} />;
  };

  return <Wrapper isImg={!!url}>{renderFile()}</Wrapper>;
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
