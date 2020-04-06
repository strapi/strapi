import React from 'react';
import PropTypes from 'prop-types';

import Text from '../Text';

const FileInfos = ({ height, extension, size, width }) => {
  return (
    <Text color="grey" fontSize="xs" ellipsis>
      {extension.toUpperCase()}
      {width && height && `\u00A0\u2014\u00A0${width}×${height}`}
      &nbsp;&mdash;&nbsp;
      {size}
    </Text>
  );
};

FileInfos.defaultProps = {
  height: null,
  extension: null,
  width: null,
  size: null,
};

FileInfos.propTypes = {
  height: PropTypes.number,
  extension: PropTypes.string,
  size: PropTypes.string,
  width: PropTypes.number,
};

export default FileInfos;
