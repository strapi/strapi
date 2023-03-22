import React from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { SimpleMenu, MenuItem } from '@strapi/design-system';
import { getTrad } from '../../utils';
import { sortOptions } from '../../constants';

const SortPicker = ({ onChangeSort }) => {
  const { formatMessage } = useIntl();

  return (
    <SimpleMenu
      variant="tertiary"
      label={formatMessage({
        id: getTrad('sort.label'),
        defaultMessage: 'Sort by',
      })}
    >
      {sortOptions.map((filter) => (
        <MenuItem key={filter.key} onClick={() => onChangeSort(filter.value)}>
          {formatMessage({ id: getTrad(filter.key), defaultMessage: `${filter.value}` })}
        </MenuItem>
      ))}
    </SimpleMenu>
  );
};

SortPicker.propTypes = {
  onChangeSort: PropTypes.func.isRequired,
};

export default SortPicker;
