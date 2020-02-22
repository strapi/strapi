import React from 'react';
import PropTypes from 'prop-types';

import FiltersListItem from './FiltersListItem';

const FiltersList = ({ filters, onDelete }) => {
  return (
    <>
      {filters.map((filter, index) => {
        return (
          <FiltersListItem>
            <span>{filter}</span>
            <button type="button" onClick={() => onDelete(index)}>
              X
            </button>
          </FiltersListItem>
        );
      })}
    </>
  );
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
