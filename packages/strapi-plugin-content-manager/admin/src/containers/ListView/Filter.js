import React from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { get, toString, upperFirst } from 'lodash';
import moment from 'moment';
import pluginId from '../../pluginId';
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

  if (type.includes('date')) {
    const date = moment(value.slice(0, -1), moment.ISO_8601);
    const format =
      date.valueOf() === date.startOf('day').valueOf()
        ? 'MMMM Do YYYY'
        : 'MMMM Do YYYY, h:mm:ss a';

    displayedValue = date.format(format);
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
