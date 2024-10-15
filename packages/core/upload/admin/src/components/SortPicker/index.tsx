import { SingleSelect, SingleSelectOption } from '@strapi/design-system';
import { useIntl } from 'react-intl';

// TODO: replace this import with the import from constants file when it will be migrated to TS
import { sortOptions } from '../../newConstants';
import { getTrad } from '../../utils';
import type { Query } from '../../../../shared/contracts/files';

interface SortPickerProps {
  onChangeSort: (value: Query['sort'] | string) => void;
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

export default SortPicker;
