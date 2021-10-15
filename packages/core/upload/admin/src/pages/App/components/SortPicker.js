import React from 'react';
import { useIntl } from 'react-intl';
import { SimpleMenu, MenuItem } from '@strapi/parts/SimpleMenu';
import { useQueryParams } from '@strapi/helper-plugin';
import { getTrad } from '../../../utils';

export const SortPicker = () => {
  const { formatMessage } = useIntl();
  const [, setQuery] = useQueryParams();

  const handleChange = value => {
    setQuery({ _sort: value });
  };

  const filters = [
    { key: 'sort.created_at_desc', value: `createdAt:DESC` },
    { key: 'sort.created_at_asc', value: `createdAt:ASC` },
    { key: 'sort.name_asc', value: 'name:ASC' },
    { key: 'sort.name_desc', value: 'name:DESC' },
    { key: 'sort.updated_at_desc', value: `updatedAt:DESC` },
    { key: 'sort.updated_at_asc', value: `updatedAt:ASC` },
  ];

  return (
    <SimpleMenu
      variant="tertiary"
      label={formatMessage({
        id: getTrad('sort.label'),
        defaultMessage: 'Sort by',
      })}
    >
      {filters.map(filter => (
        <MenuItem key={filter.key} onClick={() => handleChange(filter.value)}>
          {formatMessage({ id: getTrad(filter.key) })}
        </MenuItem>
      ))}
    </SimpleMenu>
  );
};
