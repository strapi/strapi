import * as React from 'react';

import { Button, Popover } from '@strapi/design-system';
import { Filter } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import displayedFilters from '../../../utils/displayedFilters';
import FilterList from '../../FilterList';
import FilterPopover from '../../FilterPopover';

export const Filters = ({ appliedFilters, onChangeFilters }) => {
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
        onToggle={setOpen}
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

Filters.propTypes = {
  appliedFilters: PropTypes.array.isRequired,
  onChangeFilters: PropTypes.func.isRequired,
};
