/**
 *
 * EditViewButton
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useGlobalContext } from 'strapi-helper-plugin';
import { Button } from '@buffetjs/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';

// Create link from content-type-builder to content-manager
function EditViewButton(props) {
  const { formatMessage } = useGlobalContext();
  // Retrieve URL from props
  const url = `${props.getContentTypeBuilderBaseUrl()}${props.getModelName()}`;

  const handleClick = () => {
    props.push(url);
  };

  if (props.getModelName() === 'strapi::administrator') {
    return null;
  }

  return (
    <Button
      {...props}
      onClick={handleClick}
      icon={<FontAwesomeIcon icon="cog" style={{ fontSize: 13 }} />}
      label={formatMessage({
        id: 'content-manager.containers.Edit.Link.Model',
      })}
      style={{
        paddingLeft: 15,
        paddingRight: 15,
        outline: 0,
        fontWeight: 600,
      }}
    ></Button>
  );
}

EditViewButton.propTypes = {
  currentEnvironment: PropTypes.string.isRequired,
  getContentTypeBuilderBaseUrl: PropTypes.func.isRequired,
  getModelName: PropTypes.func.isRequired,
  push: PropTypes.func.isRequired,
};

export default EditViewButton;
