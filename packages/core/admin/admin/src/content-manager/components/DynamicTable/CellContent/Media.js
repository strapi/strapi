import React from 'react';
import PropTypes from 'prop-types';
import { Avatar } from '@strapi/parts/Avatar';
import { Text } from '@strapi/parts/Text';
import { getFileExtension, prefixFileUrlWithBackendUrl } from '@strapi/helper-plugin';

const Media = ({ url, mime, alternativeText, name, ext, formats }) => {
  const fileURL = prefixFileUrlWithBackendUrl(url);

  if (mime.includes('image')) {
    const thumbnail = formats?.thumbnail?.url || null;
    const mediaURL = prefixFileUrlWithBackendUrl(thumbnail) || fileURL;

    return <Avatar src={mediaURL} alt={alternativeText || name} preview />;
  }

  const fileExtension = getFileExtension(ext);

  return <Text textColor="neutral800">{fileExtension}</Text>;
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
