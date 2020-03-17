import React from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';

import { dateFormats, FilterButton } from 'strapi-helper-plugin';

const FiltersList = ({ filters, onClick }) => {
  return filters.map((filter, index) => {
    const dateToUtcTime = date => moment.parseZone(date).utc();
    const { name, value } = filter;

    let displayedValue = filter;

    if (dateToUtcTime(value)._isUTC === true) {
      displayedValue = {
        ...filter,
        value: dateToUtcTime(value).format(dateFormats.datetime),
      };
    }

    // Specific param values - Different wording used by backend for mime
    if (name === 'mime') {
      displayedValue = {
        filter: filter.filter === '_ncontains' ? filter.filter : '=',
        name: 'type',
        value: value === 'application' ? 'file' : value,
      };
    }

    return (
      <FilterButton
        onClick={() => onClick(index)}
        key={JSON.stringify(filter)}
        label={displayedValue}
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
