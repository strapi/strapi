/**
 *
 * EditViewLink
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { LiLink } from 'strapi-helper-plugin';

// Create link from content-type-builder to content-manager
function EditViewLink(props) {
  // Retrieve URL from props
  const url = `${props.getContentTypeBuilderBaseUrl()}${props.getModelName()}`;

  if (props.currentEnvironment === 'development') {
    return <LiLink {...props} url={url} />;
  }

  return null;
}

EditViewLink.propTypes = {
  currentEnvironment: PropTypes.string.isRequired,
  getContentTypeBuilderBaseUrl: PropTypes.func.isRequired,
  getModelName: PropTypes.func.isRequired,
};

export default EditViewLink;
