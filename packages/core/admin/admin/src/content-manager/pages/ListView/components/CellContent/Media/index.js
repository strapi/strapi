import PropTypes from 'prop-types';
import React from 'react';
import { Avatar, Tooltip } from '@strapi/design-system';
import { getFileExtension, prefixFileUrlWithBackendUrl } from '@strapi/helper-plugin';

import FileWrapper from './FileWrapper';

const Media = ({ url, mime, alternativeText, name, ext, formats }) => {
  const fileURL = prefixFileUrlWithBackendUrl(url);

  if (mime.includes('image')) {
    const thumbnail = formats?.thumbnail?.url || null;
    const mediaURL = prefixFileUrlWithBackendUrl(thumbnail) || fileURL;

    return <Avatar src={mediaURL} alt={alternativeText || name} preview />;
  }

  const fileExtension = getFileExtension(ext);
  const fileName = name.length > 100 ? `${name.substring(0, 100)}...` : name;

  return (
    <Tooltip description={fileName}>
      <FileWrapper>{fileExtension}</FileWrapper>
    </Tooltip>
  );
};

Media.defaultProps = {
  alternativeText: null,
  formats: null,
};

Media.propTypes = {
  alternativeText: PropTypes.string,
  ext: PropTypes.string.isRequired,
  formats: PropTypes.object,
  mime: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
};

export default Media;
