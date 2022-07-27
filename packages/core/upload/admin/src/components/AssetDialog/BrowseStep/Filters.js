import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { Button } from '@strapi/design-system/Button';
import FilterIcon from '@strapi/icons/Filter';
import { useIntl } from 'react-intl';
import FilterList from '../../FilterList';
import FilterPopover from '../../FilterPopover';
import displayedFilters from '../../../utils/displayedFilters';

export const Filters = ({ appliedFilters, onChangeFilters }) => {
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
        <FilterPopover
          displayedFilters={displayedFilters}
          filters={appliedFilters}
          onSubmit={onChangeFilters}
          onToggle={toggleFilter}
          source={buttonRef}
        />
      )}

      {appliedFilters && (
        <FilterList
          appliedFilters={appliedFilters}
          filtersSchema={displayedFilters}
          onRemoveFilter={onChangeFilters}
        />
      )}
    </>
  );
};

Filters.propTypes = {
  appliedFilters: PropTypes.array.isRequired,
  onChangeFilters: PropTypes.func.isRequired,
};
