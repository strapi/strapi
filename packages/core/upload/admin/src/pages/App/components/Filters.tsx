import * as React from 'react';

import { useTracking, useQueryParams } from '@strapi/admin/strapi-admin';
import { Button, Popover } from '@strapi/design-system';
import { Filter } from '@strapi/icons';
import { useIntl } from 'react-intl';

import FilterList from '../../../components/FilterList';
import type { FilterListProps } from '../../../components/FilterList';
import FilterPopover from '../../../components/FilterPopover';
import type { FilterPopoverProps } from '../../../components/FilterPopover';
import { displayedFilters } from '../../../utils';
import type { Query } from '../../../../../shared/contracts/files';

export const Filters = () => {
  const [open, setOpen] = React.useState(false);
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const [{ query }, setQuery] = useQueryParams<Query>();
  const filters = query?.filters?.$and || [];

  const handleRemoveFilter: FilterListProps['onRemoveFilter'] = (nextFilters) => {
    setQuery({ filters: { $and: nextFilters }, page: 1 } as Query);
  };

  const handleSubmit: FilterPopoverProps['onSubmit'] = (filters) => {
    trackUsage('didFilterMediaLibraryElements', {
      location: 'content-manager',
      filter: Object.keys(filters[filters.length - 1])[0],
    });
    setQuery({ filters: { $and: filters }, page: 1 } as Query);
  };

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <Button variant="tertiary" startIcon={<Filter />} size="S">
          {formatMessage({ id: 'app.utils.filters', defaultMessage: 'Filters' })}
        </Button>
      </Popover.Trigger>
      <FilterPopover
        displayedFilters={displayedFilters}
        filters={filters}
        onToggle={setOpen as FilterPopoverProps['onToggle']}
        onSubmit={handleSubmit}
      />
      <FilterList
        appliedFilters={filters as FilterListProps['appliedFilters']}
        filtersSchema={displayedFilters}
        onRemoveFilter={handleRemoveFilter}
      />
    </Popover.Root>
  );
};
