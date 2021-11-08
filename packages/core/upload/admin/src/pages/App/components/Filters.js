import React, { useState, useRef } from 'react';
import { Button } from '@strapi/design-system/Button';
import { useQueryParams } from '@strapi/helper-plugin';
import FilterIcon from '@strapi/icons/Filter';
import { useIntl } from 'react-intl';

import FilterList from '../../../components/FilterList';
import FilterPopover from '../../../components/FilterPopover';

const displayedFilters = [
  {
    name: 'createdAt',
    fieldSchema: {
      type: 'date',
    },
    metadatas: { label: 'createdAt' },
  },
  {
    name: 'updatedAt',
    fieldSchema: {
      type: 'date',
    },
    metadatas: { label: 'updatedAt' },
  },
  {
    name: 'mime',
    fieldSchema: {
      type: 'enumeration',
      options: [
        { label: 'image', value: 'image' },
        { label: 'video', value: 'video' },
        { label: 'file', value: 'file' },
      ],
    },
    metadatas: { label: 'type' },
  },
];

export const Filters = () => {
  const buttonRef = useRef(null);
  const [isVisible, setVisible] = useState(false);
  const { formatMessage } = useIntl();
  const [{ query }, setQuery] = useQueryParams();
  const filters = query?.filters?.$and || [];

  const toggleFilter = () => setVisible(prev => !prev);

  const handleBlur = e => {
    // TO FIX - select's modals prevent blur to work correctly
    const notNull = e.currentTarget !== null && e.relatedTarget !== null;
    const ulListBox = document.querySelector('[role="listbox"]');

    if (
      !e.currentTarget.contains(e.relatedTarget) &&
      e.relatedTarget !== buttonRef.current &&
      e.relatedTarget !== ulListBox &&
      notNull
    ) {
      setVisible(false);
    }
  };

  const handleRemoveFilter = nextFilters => {
    setQuery({ filters: { $and: nextFilters }, page: 1 });
  };

  const handleSubmit = filters => {
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
          onBlur={handleBlur}
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
