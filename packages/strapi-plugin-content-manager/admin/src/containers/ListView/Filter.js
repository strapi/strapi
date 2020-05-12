import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { get, toString, upperFirst } from 'lodash';
import moment from 'moment';
import pluginId from '../../pluginId';
import DATE_FORMATS from '../../utils/DATE_FORMATS';
import { FilterWrapper, Remove, Separator } from './components';

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
      format = DATE_FORMATS.date;
    } else {
      format = DATE_FORMATS.datetime;
    }

    displayedValue = moment
      .parseZone(date)
      .utc()
      .format(format);
  }

  return (
    <FilterWrapper>
      <span>{upperFirst(name)}&nbsp;</span>
      <FormattedMessage
        id={`${pluginId}.components.FilterOptions.FILTER_TYPES.${filter}`}
      />
      <span>&nbsp;{displayedValue}</span>
      <Separator />
      <Remove
        onClick={() => {
          const updatedFilters = filters.slice().filter((_, i) => i !== index);

          if (isFilterPickerOpen) {
            toggleFilterPickerState();
          }
          changeParams({ target: { name: 'filters', value: updatedFilters } });
        }}
      />
    </FilterWrapper>
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
