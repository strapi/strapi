import PropTypes from 'prop-types';
import React from 'react';
import { useIntl } from 'react-intl';

import { Button } from '@strapi/design-system';
import { EmptyPermissions, Plus } from '@strapi/icons';

import { EmptyAssets } from '../../../../components/EmptyAssets';
import { getTrad } from '../../../../utils';

const getContentIntlMessage = ({ isFiltering, canCreate, canRead }) => {
  if (isFiltering) {
    return {
      id: 'list.assets-empty.title-withSearch',
      defaultMessage: 'There are no elements with the applied filters',
    };
  }

  if (canRead) {
    if (canCreate) {
      return {
        id: 'list.assets.empty-upload',
        defaultMessage: 'Upload your first assets...',
      };
    }

    return {
      id: 'list.assets.empty',
      defaultMessage: 'Media Library is empty',
    };
  }

  return {
    id: 'header.actions.no-permissions',
    defaultMessage: 'No permissions to view',
  };
};

export const EmptyOrNoPermissions = ({ canCreate, isFiltering, canRead, onActionClick }) => {
  const { formatMessage } = useIntl();
  const content = getContentIntlMessage({ isFiltering, canCreate, canRead });

  return (
    <EmptyAssets
      icon={!canRead ? EmptyPermissions : null}
      action={
        canCreate &&
        !isFiltering && (
          <Button variant="secondary" startIcon={<Plus />} onClick={onActionClick}>
            {formatMessage({
              id: getTrad('header.actions.add-assets'),
              defaultMessage: 'Add new assets',
            })}
          </Button>
        )
      }
      content={formatMessage({
        ...content,
        id: getTrad(content.id),
      })}
    />
  );
};

EmptyOrNoPermissions.propTypes = {
  canCreate: PropTypes.bool.isRequired,
  canRead: PropTypes.bool.isRequired,
  isFiltering: PropTypes.bool.isRequired,
  onActionClick: PropTypes.func.isRequired,
};
