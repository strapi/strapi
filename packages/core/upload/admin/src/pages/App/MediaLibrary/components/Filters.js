import React, { useState, useRef } from 'react';
import { Button } from '@strapi/design-system/Button';
import { useQueryParams, useTracking } from '@strapi/helper-plugin';
import FilterIcon from '@strapi/icons/Filter';
import { useIntl } from 'react-intl';
import FilterList from '../../../../components/FilterList';
import FilterPopover from '../../../../components/FilterPopover';
import displayedFilters from '../../../../utils/displayedFilters';

export const Filters = () => {
  const buttonRef = useRef(null);
  const [isVisible, setVisible] = useState(false);
  const { formatMessage } = useIntl();
  const { trackUsage } = useTracking();
  const [{ query }, setQuery] = useQueryParams();
  const filters = query?.filters?.$and || [];

  const toggleFilter = () => setVisible((prev) => !prev);

  const handleRemoveFilter = (nextFilters) => {
    setQuery({ filters: { $and: nextFilters }, page: 1 });
  };

  const handleSubmit = (filters) => {
    trackUsage('didFilterMediaLibraryElements', {
      location: 'content-manager',
      filter: Object.keys(filters[filters.length - 1])[0],
    });
    setQuery({ filters: { $and: filters }, page: 1 });
  };

  return (
    <>
      <Button
        variant="tertiary"
        ref={buttonRef}
        startIcon={<FilterIcon />}
        onClick={toggleFilter}
        size="S"
      >
        {formatMessage({ id: 'app.utils.filters', defaultMessage: 'Filters' })}
      </Button>
      {isVisible && (
        <FilterPopover
          displayedFilters={displayedFilters}
          filters={filters}
          onSubmit={handleSubmit}
          onToggle={toggleFilter}
          source={buttonRef}
        />
      )}
      <FilterList
        appliedFilters={filters}
        filtersSchema={displayedFilters}
        onRemoveFilter={handleRemoveFilter}
      />
    </>
  );
};
