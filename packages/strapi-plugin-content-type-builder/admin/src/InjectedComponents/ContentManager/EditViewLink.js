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
  const base = `${props.getContentTypeBuilderBaseUrl()}${props.getModelName()}`;
  const url = props.getSource() === 'users-permissions' ? `${base}&source=${props.getSource()}` : base;

  return <NavLink {...props} url={url} />;
}

EditViewLink.propTypes = {
  getContentTypeBuilderBaseUrl: PropTypes.func.isRequired,
  getModelName: PropTypes.func.isRequired,
  getSource: PropTypes.func.isRequired,
};

export default EditViewLink;
