/**
 *
 * ContentManagerEditViewLink
 *
 */

import React from 'react';
import { Link } from 'react-router-dom';

function ContentManagerEditViewLink(props) {
  let url = props.getContentTypeBuilderBaseUrl() + props.getModelName();
  if (
    props.getModelName() === 'user' ||
    props.getModelName() === 'role' ||
    props.getModelName() === 'permission'
  ) {
    url = url + '&source=users-permissions';
  }

  return <Link to={url}>Edit the fields</Link>;
}

ContentManagerEditViewLink.propTypes = {};

export default ContentManagerEditViewLink;
