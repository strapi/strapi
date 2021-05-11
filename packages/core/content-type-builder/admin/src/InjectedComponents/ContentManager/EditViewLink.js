/**
 *
 * EditViewLink
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { LiLink, useGlobalContext, CheckPermissions } from '@strapi/helper-plugin';
import pluginPermissions from '../../permissions';

// Create link from content-type-builder to content-manager
function EditViewLink(props) {
  const { emitEvent } = useGlobalContext();
  // Retrieve URL from props
  const url = `/plugins/content-type-builder/content-types/${props.slug}`;

  if (props.slug === 'strapi::administrator') {
    return null;
  }

  return (
    <CheckPermissions permissions={pluginPermissions.main}>
      <LiLink
        message={{
          id: 'content-manager.containers.Edit.Link.Fields',
        }}
        icon="fa-cog"
        url={url}
        onClick={() => {
          emitEvent('willEditEditLayout');
        }}
      />
    </CheckPermissions>
  );
}

EditViewLink.propTypes = {
  slug: PropTypes.string.isRequired,
};

export default EditViewLink;
