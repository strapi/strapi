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
  metadatas,
  name,
  value,
  toggleFilterPickerState,
  isFilterPickerOpen,
  setQuery,
}) {
  const attributeType = get(contentType, ['attributes', name, 'type'], 'string');
  let type = attributeType;

  if (attributeType === 'relation') {
    type = get(contentType, ['metadatas', name, 'list', 'mainField', 'schema', 'type'], 'string');
  }
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
  const displayedName = name.split('.')[0];

  const label = {
    name: displayedName,
    filter: filterName,
    value: displayedValue,
  };

  const handleClick = useCallback(() => {
    const updatedFilters = filters.slice().filter((_, i) => i !== index);

    if (isFilterPickerOpen) {
      toggleFilterPickerState();
    }

    setQuery({ page: 1, ...formatFiltersToQuery(updatedFilters, metadatas) });
  }, [filters, index, isFilterPickerOpen, metadatas, setQuery, toggleFilterPickerState]);

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
  metadatas: PropTypes.object.isRequired,
  name: PropTypes.string,
  setQuery: PropTypes.func.isRequired,
  toggleFilterPickerState: PropTypes.func.isRequired,
  value: PropTypes.any,
};

export default memo(Filter);
