import React, { useState, useRef } from 'react';
import { Button } from '@strapi/parts/Button';
import { FilterPopoverURLQuery } from '@strapi/helper-plugin';
import FilterIcon from '@strapi/icons/FilterIcon';
import { useIntl } from 'react-intl';

const displayedFilters = [
  {
    name: 'created_at',
    fieldSchema: {
      type: 'date',
    },
    metadatas: { label: 'created_at' },
  },
  {
    name: 'updated_at',
    fieldSchema: {
      type: 'date',
    },
    metadatas: { label: 'updated_at' },
  },
  {
    name: 'type',
    fieldSchema: {
      type: 'enumeration',
      options: ['image', 'video', 'file'],
    },
    metadatas: { label: 'type' },
  },
];

export const Filters = () => {
  const buttonRef = useRef(null);
  const [isVisible, setVisible] = useState(false);
  const { formatMessage } = useIntl();

  const toggleFilter = () => setVisible(prev => !prev);

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
        <FilterPopoverURLQuery
          displayedFilters={displayedFilters}
          isVisible={isVisible}
          onToggle={toggleFilter}
          source={buttonRef}
        />
      )}
    </>
  );
};
