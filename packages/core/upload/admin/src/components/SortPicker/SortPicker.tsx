// TODO: find a better naming convention for the file that was an index file before
import { SingleSelect, SingleSelectOption } from '@strapi/design-system';
import { useIntl } from 'react-intl';

import { sortOptions } from '../../constants';
import { getTrad } from '../../utils';

import type { Query } from '../../../../shared/contracts/files';

interface SortPickerProps {
  onChangeSort: (value: Query['sort'] | string) => void;
  value?: string;
}

export const SortPicker = ({ onChangeSort, value }: SortPickerProps) => {
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
