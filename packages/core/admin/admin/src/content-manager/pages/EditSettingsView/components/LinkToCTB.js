/**
 *
 * EditViewButton
 *
 */

import React from 'react';
import { useTracking, CheckPermissions, LinkButton } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';
import get from 'lodash/get';
import { Pencil } from '@strapi/icons';
import getTrad from '../../../utils/getTrad';
import useLayoutDnd from '../../../hooks/useLayoutDnd';

const permissions = [{ action: 'plugin::content-type-builder.read', subject: null }];

// Create link from content-type-builder to content-manager
const LinkToCTB = () => {
  const { trackUsage } = useTracking();
  const { formatMessage } = useIntl();
  const { slug, modifiedData, isContentTypeView } = useLayoutDnd();
  const type = isContentTypeView ? 'content-types' : 'components';

  const baseUrl = `/plugins/content-type-builder/${
    type === 'content-types' ? type : 'component-categories'
  }`;
  const category = get(modifiedData, 'category', '');

  const suffixUrl = type === 'content-types' ? slug : `${category}/${slug}`;

  const handleClick = () => {
    trackUsage('willEditEditLayout');
  };

  if (slug === 'strapi::administrator') {
    return null;
  }

  return (
    <CheckPermissions permissions={permissions}>
      <LinkButton
        to={`${baseUrl}/${suffixUrl}`}
        onClick={handleClick}
        size="S"
        startIcon={<Pencil />}
        variant="secondary"
      >
        {formatMessage({
          id: getTrad(`edit-settings-view.link-to-ctb.${type}`),
          defaultMessage: 'Edit the content type',
        })}
      </LinkButton>
    </CheckPermissions>
  );
};

export default LinkToCTB;
