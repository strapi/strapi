import React from 'react';
import PropTypes from 'prop-types';

import { Remove } from '@buffetjs/icons';

import FiltersListItem from './FiltersListItem';

const FiltersList = ({ filters, onDelete }) => {
  return filters.map((filter, index) => {
    return (
      <FiltersListItem key={filter}>
        <span>{filter}</span>
        <button type="button" onClick={() => onDelete(index)}>
          <Remove width="11px" height="11px" fill="#007eff" />
        </button>
      </FiltersListItem>
    );
  });
};

FiltersList.defaultProps = {
  onDelete: () => {},
  filters: ['created_at is 0-01-22 00:00:00'],
};

FiltersList.propTypes = {
  onDelete: PropTypes.func,
  filters: PropTypes.array,
};

export default FiltersList;
