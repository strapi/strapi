/**
 *
 * EditViewButton
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useGlobalContext, CheckPermissions } from 'strapi-helper-plugin';
import { get } from 'lodash';
import { Button } from '@buffetjs/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import getTrad from '../../utils/getTrad';
import pluginPermissions from '../../permissions';

// Create link from content-type-builder to content-manager
function EditViewButton(props) {
  const { currentEnvironment, emitEvent, formatMessage } = useGlobalContext();
  // Retrieve URL from props
  const { modifiedData, componentSlug, type } = get(
    props,
    ['viewProps', '0'],

    {
      componentSlug: '',
    }
  );

  const baseUrl = `/plugins/content-type-builder/${
    type === 'content-types' ? type : 'component-categories'
  }`;
  const category = get(modifiedData, 'category', '');

  const suffixUrl =
    type === 'content-types' ? props.getModelName() : `${category}/${componentSlug}`;

  const handleClick = () => {
    emitEvent('willEditEditLayout');
    props.push(`${baseUrl}/${suffixUrl}`);
  };

  if (currentEnvironment !== 'development') {
    return null;
  }

  if (props.getModelName() === 'strapi::administrator') {
    return null;
  }

  return (
    <CheckPermissions permissions={pluginPermissions.main}>
      <Button
        {...props}
        onClick={handleClick}
        icon={<FontAwesomeIcon icon="cog" style={{ fontSize: 13 }} />}
        label={formatMessage({
          id: getTrad(`injected-components.content-manager.edit-settings-view.link.${type}`),
        })}
        style={{
          paddingLeft: 15,
          paddingRight: 15,
          outline: 0,
          fontWeight: 600,
        }}
      />
    </CheckPermissions>
  );
}

EditViewButton.propTypes = {
  currentEnvironment: PropTypes.string.isRequired,
  getModelName: PropTypes.func.isRequired,
  push: PropTypes.func.isRequired,
};

export default EditViewButton;
