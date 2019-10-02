/**
 *
 *
 * FileIcon
 */

import React from 'react';
import PropTypes from 'prop-types';
import { trim } from 'lodash';

import ext from './extensions.json';
import Wrapper from './Wrapper';

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
    <Wrapper type={iconType}>
      <i className={`fa fa-${iconType}`} />
    </Wrapper>
  );
}

FileIcon.defaultProps = {
  fileType: 'zip',
};

FileIcon.propTypes = {
  fileType: PropTypes.string,
};

export default FileIcon;
