import React, { useRef, useState } from 'react';

import { Button } from '@strapi/design-system';
import { Filter } from '@strapi/icons';
import PropTypes from 'prop-types';
import { useIntl } from 'react-intl';

import displayedFilters from '../../../utils/displayedFilters';
import FilterList from '../../FilterList';
import FilterPopover from '../../FilterPopover';

export const Filters = ({ appliedFilters, onChangeFilters }) => {
  const buttonRef = useRef(null);
  const [isVisible, setVisible] = useState(false);
  const { formatMessage } = useIntl();

  const toggleFilter = () => setVisible((prev) => !prev);

  return (
    <>
      <Button
        variant="tertiary"
        ref={buttonRef}
        startIcon={<Filter />}
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
