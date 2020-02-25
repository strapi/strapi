import React from 'react';
import PropTypes from 'prop-types';

import { FilterButton } from 'strapi-helper-plugin';

const FiltersList = ({ filters, onDelete }) => {
  return filters.map((filter, index) => {
    return (
      <FilterButton
        onClick={onDelete(index)}
        key={JSON.stringify(filter)}
        label={filter}
      />
    );
  });
};

FiltersList.defaultProps = {
  onDelete: () => {},
  filters: [],
};

FiltersList.propTypes = {
  onDelete: PropTypes.func,
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      filter: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    })
  ),
};

export default FiltersList;
