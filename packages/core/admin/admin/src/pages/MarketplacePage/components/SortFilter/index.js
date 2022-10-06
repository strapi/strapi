import React from 'react';
import { SimpleMenu, MenuItem } from '@strapi/design-system/SimpleMenu';
import { useIntl } from 'react-intl';
import { NavLink } from 'react-router-dom';
import { getTrad } from '../../../../content-manager/utils';

const SortFilter = () => {
  const { formatMessage } = useIntl();

  return (
    <SimpleMenu
      variant="tertiary"
      label={formatMessage({
        id: getTrad('sort.label'),
        defaultMessage: 'Sort by',
      })}
    >
      <MenuItem as={NavLink} to="/marketplace?sort=name:asc">
        Alphabetical Order
      </MenuItem>
      <MenuItem as={NavLink} to="/marketplace?sort=submissionDate:desc">
        Newest
      </MenuItem>
    </SimpleMenu>
  );
};

export default SortFilter;
