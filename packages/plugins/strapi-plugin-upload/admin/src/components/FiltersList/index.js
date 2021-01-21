import React from 'react';
import PropTypes from 'prop-types';
import { FilterButton } from 'strapi-helper-plugin';

import formatFilter from './utils/formatFilter';

const FiltersList = ({ filters, onClick }) => {
  return filters.map((item, index) => {
    const formattedValue = formatFilter(item);
    const { name, filter, value, isDisabled } = formattedValue;

    return (
      !isDisabled && (
        <FilterButton
          onClick={() => onClick(index)}
          key={`${name}${filter}${value}`}
          label={formattedValue}
        />
      )
    );
  });
};

FiltersList.defaultProps = {
  filters: [],
  onClick: () => {},
};

FiltersList.propTypes = {
  onClick: PropTypes.func,
  filters: PropTypes.arrayOf(PropTypes.object),
};

export default FiltersList;
