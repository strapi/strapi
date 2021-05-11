/**
 *
 * EditViewButton
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useGlobalContext, CheckPermissions } from '@strapi/helper-plugin';
import { useHistory } from 'react-router-dom';
import get from 'lodash/get';
import { Button } from '@buffetjs/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import getTrad from '../../utils/getTrad';
import pluginPermissions from '../../permissions';

// Create link from content-type-builder to content-manager
function EditViewButton({ modifiedData, slug, type }) {
  const { emitEvent, formatMessage } = useGlobalContext();
  const { push } = useHistory();

  const baseUrl = `/plugins/content-type-builder/${
    type === 'content-types' ? type : 'component-categories'
  }`;
  const category = get(modifiedData, 'category', '');

  const suffixUrl = type === 'content-types' ? slug : `${category}/${slug}`;

  const handleClick = () => {
    emitEvent('willEditEditLayout');
    push(`${baseUrl}/${suffixUrl}`);
  };

  if (slug === 'strapi::administrator') {
    return null;
  }

  return (
    <CheckPermissions permissions={pluginPermissions.main}>
      <Button
        type="button"
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
  modifiedData: PropTypes.object.isRequired,
  slug: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
};

export default EditViewButton;
