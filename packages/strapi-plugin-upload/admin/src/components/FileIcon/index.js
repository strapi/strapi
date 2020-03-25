/**
 *
 *
 * FileIcon
 */

import React from 'react';
import PropTypes from 'prop-types';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

import extensions from './utils/extensions.json';

import Wrapper from './Wrapper';

const FileIcon = ({ ext }) => {
  const iconName = Object.keys(extensions).find(key => extensions[key].includes(ext)) || 'alt';

  return (
    <Wrapper type="file" colored={iconName === 'pdf'}>
      <FontAwesomeIcon icon={['far', `file-${iconName}`]} />
    </Wrapper>
  );
};

FileIcon.defaultProps = {
  ext: 'alt',
};

FileIcon.propTypes = {
  ext: PropTypes.string,
};

export default FileIcon;
