/**
 *
 * EditViewLink
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import NavLink from 'components/NavLink';

// Create link from content-type-builder to content-manager
function EditViewLink(props) {
  // Retrieve URL from props
  let url = `${props.getContentTypeBuilderBaseUrl()}${props.getModelName()}`;

  // Add users-permissions to URL for permission, role and user content types
  if (props.getSource() === 'users-permissions') {
    url = `${url}&source=${props.getSource()}`;
  }

  return <NavLink {...props} url={url} />;
}

EditViewLink.propTypes = {
  getContentTypeBuilderBaseUrl: PropTypes.func.isRequired,
  getModelName: PropTypes.func.isRequired,
  getSource: PropTypes.func.isRequired,
};

export default EditViewLink;
