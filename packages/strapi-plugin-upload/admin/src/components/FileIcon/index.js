/**
 *
 *
 * FileIcon
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';

import styles from './styles.scss';

function FileIcon({ fileType }) {
  const iconType = (() => {
    switch (fileType) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'image';
      case 'mov':
      case 'avi':
      case 'mpg':
      case 'm4v':
      case 'mp4':
        return 'video';
      default:
        return fileType;
    }
  })();

  return (
    <div
      className={(cn(
        styles.fileIconContainer,
        iconType === 'pdf' && styles.pdf,
        iconType === 'zip' && styles.zip,
        iconType === 'image' && styles.image,
        iconType === 'video' && styles.video,
      ))}
    >
      <i className={`fa fa-file-${iconType}-o`} />
    </div>
  );
}

FileIcon.defaultProps = {
  fileType: 'zip',
};

FileIcon.propTypes = {
  fileType: PropTypes.string,
};

export default FileIcon;
