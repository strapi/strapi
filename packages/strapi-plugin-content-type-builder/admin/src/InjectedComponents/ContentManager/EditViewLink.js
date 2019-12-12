/**
 *
 * EditViewLink
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { LiLink, useGlobalContext } from 'strapi-helper-plugin';

// Create link from content-type-builder to content-manager
function EditViewLink(props) {
  const { emitEvent } = useGlobalContext();
  // Retrieve URL from props
  const url = `/plugins/content-type-builder/content-types/${props.getModelName()}`;

  if (props.getModelName() === 'strapi::administrator') {
    return null;
  }

  return (
    <LiLink
      {...props}
      url={url}
      onClick={() => {
        emitEvent('willEditEditLayout');
      }}
    />
  );
}

EditViewLink.propTypes = {
  currentEnvironment: PropTypes.string.isRequired,
  getModelName: PropTypes.func.isRequired,
};

export default EditViewLink;
