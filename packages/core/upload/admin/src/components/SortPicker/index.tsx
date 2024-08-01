import React from 'react';

import { SingleSelect, SingleSelectOption } from '@strapi/design-system';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

// TODO: replace with the import from the constants file when the file is migrated to TypeScript
import { sortOptions } from '../../newConstants';
// TODO: replace with the import from the utils file when the file is migrated to TypeScript
import { getTrad } from '../../utils/getTrad';

interface SortPickerProps {
  onChangeSort: (value: string) => void;
  value?: string;
}

const SortPicker = ({ onChangeSort, value }: SortPickerProps) => {
  const { formatMessage } = useIntl();
  
  return (
    <SingleSelect
      size="S"
      value={value}
      onChange={(value) => onChangeSort(value.toString())}
      aria-label={formatMessage({
        id: getTrad('sort.label'),
        defaultMessage: 'Sort by',
      })}
      placeholder={formatMessage({
        id: getTrad('sort.label'),
        defaultMessage: 'Sort by',
      })}
    >
      {sortOptions.map((filter) => (
        <SingleSelectOption key={filter.key} value={filter.value}>
          {formatMessage({ id: getTrad(filter.key), defaultMessage: `${filter.value}` })}
        </SingleSelectOption>
      ))}
    </SingleSelect>
  );
};

SortPicker.defaultProps = {
  value: undefined,
};

SortPicker.propTypes = {
  onChangeSort: PropTypes.func.isRequired,
  value: PropTypes.string,
};

export default SortPicker;
