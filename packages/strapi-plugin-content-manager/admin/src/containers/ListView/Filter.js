import React, { memo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { get, toString } from 'lodash';
import moment from 'moment';
import { FilterButton } from 'strapi-helper-plugin';
import { dateFormats, formatFiltersToQuery } from '../../utils';

function Filter({
  contentType,
  filterName,
  filters,
  index,
  name,
  value,
  toggleFilterPickerState,
  isFilterPickerOpen,
  setQuery,
}) {
  const type = get(contentType, ['attributes', name, 'type'], 'string');
  let displayedValue = toString(value);

  if (type.includes('date') || type.includes('timestamp')) {
    const date = moment(value, moment.ISO_8601);

    let format;

    if (type === 'date' || type === 'timestamp') {
      format = dateFormats.date;
    } else {
      format = dateFormats.datetime;
    }

    displayedValue = moment
      .parseZone(date)
      .utc()
      .format(format);
  }

  const label = {
    name,
    filter: filterName,
    value: displayedValue,
  };

  const handleClick = useCallback(() => {
    const updatedFilters = filters.slice().filter((_, i) => i !== index);

    if (isFilterPickerOpen) {
      toggleFilterPickerState();
    }

    setQuery(formatFiltersToQuery(updatedFilters));
  }, [filters, index, isFilterPickerOpen, setQuery, toggleFilterPickerState]);

  return <FilterButton onClick={handleClick} label={label} type={type} />;
}

Filter.defaultProps = {
  name: '',
  value: '',
};

Filter.propTypes = {
  contentType: PropTypes.shape({ attributes: PropTypes.object.isRequired }).isRequired,
  filterName: PropTypes.string.isRequired,
  filters: PropTypes.array.isRequired,
  index: PropTypes.number.isRequired,
  isFilterPickerOpen: PropTypes.bool.isRequired,
  name: PropTypes.string,
  setQuery: PropTypes.func.isRequired,
  toggleFilterPickerState: PropTypes.func.isRequired,
  value: PropTypes.any,
};

export default memo(Filter);
