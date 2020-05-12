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
        return 'file-archive';
      case ext.code.includes(trim(fileType, '.')):
        return 'file-code';
      case ext.img.includes(trim(fileType, '.')):
        return 'file-image';
      case ext.pdf.includes(trim(fileType, '.')):
        return 'file-pdf';
      case ext.powerpoint.includes(trim(fileType, '.')):
        return 'file-powerpoint';
      case ext.video.includes(trim(fileType, '.')):
        return 'file-video';
      case ext.word.includes(trim(fileType, '.')):
        return 'file-word';
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
