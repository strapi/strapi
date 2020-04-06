import React from 'react';
import PropTypes from 'prop-types';

import Text from '../Text';

const FileInfos = ({ extension, size }) => {
  return (
    <Text color="grey" fontSize="xs" ellipsis>
      {extension.toUpperCase()}
      &nbsp;&mdash;&nbsp;
      {size}
    </Text>
  );
};

FileInfos.defaultProps = {
  extension: null,
  size: null,
};

FileInfos.propTypes = {
  extension: PropTypes.string,
  size: PropTypes.string,
};

export default FileInfos;
