import React from 'react';
import PropTypes from 'prop-types';
import { get, toString } from 'lodash';
import moment from 'moment';
import { FilterButton } from 'strapi-helper-plugin';
import dateFormats from '../../utils/dateFormats';

function Filter({
  changeParams,
  filter,
  filters,
  index,
  name,
  schema,
  value,
  toggleFilterPickerState,
  isFilterPickerOpen,
}) {
  const type = get(schema, ['attributes', name, 'type'], 'string');
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
    filter,
    value: displayedValue,
  };

  return (
    <FilterButton
      onClick={() => {
        const updatedFilters = filters.slice().filter((_, i) => i !== index);

        if (isFilterPickerOpen) {
          toggleFilterPickerState();
        }
        changeParams({ target: { name: 'filters', value: updatedFilters } });
      }}
      label={label}
      type={type}
    />
  );
}

Filter.defaultProps = {
  name: '',
  value: '',
};

Filter.propTypes = {
  changeParams: PropTypes.func.isRequired,
  filter: PropTypes.string.isRequired,
  filters: PropTypes.array.isRequired,
  index: PropTypes.number.isRequired,
  isFilterPickerOpen: PropTypes.bool.isRequired,
  name: PropTypes.string,
  schema: PropTypes.object.isRequired,
  toggleFilterPickerState: PropTypes.func.isRequired,
  value: PropTypes.any,
};

export default Filter;
