/**
 *
 * EditViewButton
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useTracking, CheckPermissions } from '@strapi/helper-plugin';
import { useHistory } from 'react-router-dom';
import { useIntl } from 'react-intl';
import get from 'lodash/get';
import { Button } from '@buffetjs/core';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import getTrad from '../../../utils/getTrad';

const permissions = [{ action: 'plugin::content-type-builder.read', subject: null }];

// Create link from content-type-builder to content-manager
const LinkToCTB = ({ modifiedData, slug, type }) => {
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const { push } = useHistory();

  const baseUrl = `/plugins/content-type-builder/${
    type === 'content-types' ? type : 'component-categories'
  }`;
  const category = get(modifiedData, 'category', '');

  const suffixUrl = type === 'content-types' ? slug : `${category}/${slug}`;

  const handleClick = () => {
    trackUsage('willEditEditLayout');
    push(`${baseUrl}/${suffixUrl}`);
  };

  if (slug === 'strapi::administrator') {
    return null;
  }

  return (
    <CheckPermissions permissions={permissions}>
      <Button
        type="button"
        onClick={handleClick}
        icon={<FontAwesomeIcon icon="cog" style={{ fontSize: 13 }} />}
        label={formatMessage({
          id: getTrad(`edit-settings-view.link-to-ctb.${type}`),
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
};

LinkToCTB.propTypes = {
  modifiedData: PropTypes.object.isRequired,
  slug: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
};

export default LinkToCTB;
