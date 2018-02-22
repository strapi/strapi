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
  let iconType = fileType;

  if ( ['jpeg', 'jpg', 'png', 'gif'].includes(fileType) ) {
    iconType = 'image';
  }

  if ( ['avi', 'm4v', 'mpg', 'mp4', 'mov'].includes(fileType) ) {
    iconType = 'video';
  }

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
