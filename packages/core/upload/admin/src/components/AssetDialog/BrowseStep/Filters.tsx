import * as React from 'react';

import { Button, Popover } from '@strapi/design-system';
import { Filter } from '@strapi/icons';
import { useIntl } from 'react-intl';

import displayedFilters from '../../../utils/displayedFilters';
import FilterList from '../../FilterList';
import FilterPopover from '../../FilterPopover';

type NumberKeyedObject = {
  [key: number]: string;
};

type MimeFilter = {
  $contains?: string | NumberKeyedObject;
  $notContains?: string | NumberKeyedObject;
  $not?: {
    $contains?: string | NumberKeyedObject;
  };
};

type FilterKey = 'createdAt' | 'updatedAt' | 'mime';
type Operator = '$eq' | '$ne' | '$gt' | '$gte';

type FilterType = {
  [key in FilterKey]?: key extends 'mime'
    ? MimeFilter
    : {
        [key in Operator]?: string;
      };
};

interface FiltersProps {
  appliedFilters: FilterType[];
  onChangeFilters: (filters: FilterType[]) => void;
}

export const Filters = ({ appliedFilters, onChangeFilters }: FiltersProps) => {
  const [open, setOpen] = React.useState(false);
  const { formatMessage } = useIntl();

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <Button variant="tertiary" startIcon={<Filter />} size="S">
          {formatMessage({ id: 'app.utils.filters', defaultMessage: 'Filters' })}
        </Button>
      </Popover.Trigger>
      <FilterPopover
        onToggle={() => setOpen(!open)}
        displayedFilters={displayedFilters}
        filters={appliedFilters}
        onSubmit={onChangeFilters}
      />

      {appliedFilters && (
        <FilterList
          appliedFilters={appliedFilters}
          filtersSchema={displayedFilters}
          onRemoveFilter={onChangeFilters}
        />
      )}
    </Popover.Root>
  );
};
