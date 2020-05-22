/**
 *
 * Image
 *
 */

import React from 'react';
import { prefixFileUrlWithBackendUrl } from 'strapi-helper-plugin';
import PropTypes from 'prop-types';

const Image = props => {
  const { alt, height, src, width } = props.contentState.getEntity(props.entityKey).getData();
  const url = prefixFileUrlWithBackendUrl(src);

  return <img alt={alt} src={url} height={height} width={width} style={{ maxWidth: '100%' }} />;
};

Image.propTypes = {
  contentState: PropTypes.object.isRequired,
  entityKey: PropTypes.string.isRequired,
};

export default Image;
