import React from 'react';
import PropTypes from 'prop-types';
import { FilterButton } from 'strapi-helper-plugin';

import formatFilters from './utils/formatFilters';
import formatFilter from './utils/formatFilter';

const FiltersList = ({ filters, onClick }) => {
  const formattedFilters = formatFilters(filters);

  return formattedFilters.map(filter => {
    const formattedValue = formatFilter(filter);

    return (
      <FilterButton
        onClick={() => onClick(filter)}
        key={JSON.stringify(formattedValue)}
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
