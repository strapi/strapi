import React from 'react';
import PropTypes from 'prop-types';
import { FilterButton } from 'strapi-helper-plugin';

import formatFilter from './utils/formatFilter';

const FiltersList = ({ filters, onClick }) => {
  return filters.map(item => {
    const formattedValue = formatFilter(item);
    const { name, filter, value } = formattedValue;

    return (
      <FilterButton
        onClick={() => onClick(item)}
        key={`${name}${filter}${value}`}
        label={formattedValue}
      />
    );
  });
};

FiltersList.defaultProps = {
  filters: [],
  onClick: () => {},
};

FiltersList.propTypes = {
  onClick: PropTypes.func,
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      filter: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    })
  ),
};

export default FiltersList;
