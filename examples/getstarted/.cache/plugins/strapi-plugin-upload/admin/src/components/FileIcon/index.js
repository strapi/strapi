/**
 *
 *
 * FileIcon
 */

import React from 'react';
import PropTypes from 'prop-types';
import cn from 'classnames';
import { trim } from 'lodash';

import ext from './extensions.json';

import styles from './styles.scss';

function FileIcon({ fileType }) {
  const iconType = (() => {
    switch (true) {
      case ext.archive.includes(trim(fileType, '.')):
        return 'file-archive-o';
      case ext.code.includes(trim(fileType, '.')):
        return 'file-code-o';
      case ext.img.includes(trim(fileType, '.')):
        return 'file-image-o';
      case ext.pdf.includes(trim(fileType, '.')):
        return 'file-pdf-o';
      case ext.powerpoint.includes(trim(fileType, '.')):
        return 'file-powerpoint-o';
      case ext.video.includes(trim(fileType, '.')):
        return 'file-video-o';
      case ext.word.includes(trim(fileType, '.')):
        return 'file-word-o';
      default:
        return 'file';
    }
  })();

  return (
    <div
      className={(cn(
        styles.fileIconContainer,
        iconType === 'file-pdf-o' && styles.pdf,
        iconType === 'file-archive-o' && styles.zip,
        iconType === 'file-image-o' && styles.image,
        iconType === 'file-video-o' && styles.video,
        iconType === 'file-code-o' && styles.code,
      ))}
    >
      <i className={`fa fa-${iconType}`} />
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
