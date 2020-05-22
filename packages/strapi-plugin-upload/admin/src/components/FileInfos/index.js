import React from 'react';
import PropTypes from 'prop-types';
import { upperCase } from 'lodash';

import Text from '../Text';

const FileInfos = ({ extension, height, size, width }) => {
  return (
    <Text color="grey" fontSize="xs" ellipsis>
      {upperCase(extension)}
      &nbsp;&mdash;&nbsp;
      {width && height && `${width}×${height}\u00A0\u2014\u00A0`}
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
