import * as React from 'react';

import { Button, Popover } from '@strapi/design-system';
import { Filter } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { displayedFilters } from '../../../utils';
import { FilterList } from '../../FilterList/FilterList';
import { FilterPopover } from '../../FilterPopover/FilterPopover';

type NumberKeyedObject = Record<number, string>;

type StringFilter = {
  [key: string]: string;
};

type MimeFilter = {
  [key: string]:
    | string
    | NumberKeyedObject
    | Record<string, string | NumberKeyedObject>
    | undefined;
};

export type FilterStructure = {
  [key: string]: MimeFilter | StringFilter | undefined;
};

export type Filter = {
  [key in 'mime' | 'createdAt' | 'updatedAt']?:
    | {
        [key in '$contains' | '$notContains' | '$eq' | '$not']?:
          | string[]
          | string
          | { $contains: string[] };
      }
    | undefined;
};

interface FiltersProps {
  appliedFilters: FilterStructure[];
  onChangeFilters: (filters: Filter[]) => void;
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
        onToggle={() => setOpen((prev) => !prev)}
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
