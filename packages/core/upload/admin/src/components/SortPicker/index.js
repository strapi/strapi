import React from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { SimpleMenu, MenuItem } from '@strapi/design-system/SimpleMenu';
import { getTrad } from '../../utils';

const SortPicker = ({ onChangeSort }) => {
  const { formatMessage } = useIntl();

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
        <MenuItem key={filter.key} onClick={() => onChangeSort(filter.value)}>
          {formatMessage({ id: getTrad(filter.key) })}
        </MenuItem>
      ))}
    </SimpleMenu>
  );
};

SortPicker.propTypes = {
  onChangeSort: PropTypes.func.isRequired,
};

export default SortPicker;
