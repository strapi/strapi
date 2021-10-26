/**
 *
 * FilterList
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import FilterTag from './FilterTag';

const FilterList = ({ appliedFilters, filtersSchema, onRemoveFilter }) => {
  const handleClick = filter => {
    const nextFilters = appliedFilters.filter(prevFilter => {
      const name = Object.keys(filter)[0];
      const filterType = Object.keys(filter[name])[0];
      const value = filter[name][filterType];

      return prevFilter[name]?.[filterType] !== value;
    });

    onRemoveFilter(nextFilters);
  };

  return appliedFilters.map((filter, i) => {
    const attributeName = Object.keys(filter)[0];
    const attribute = filtersSchema.find(({ name }) => name === attributeName);

    const filterObj = filter[attributeName];
    const operator = Object.keys(filterObj)[0];
    let value = filterObj[operator];
    let displayedOperator = operator;

    if (attribute.name === 'mime') {
      displayedOperator = operator === '$contains' ? '$eq' : '$ne';

      // Type is file
      // The filter for the file is the following: { mime: {$not: {$contains: ['image', 'video']}}}
      if (operator === '$not') {
        value = 'file';
        displayedOperator = '$eq';
      }

      // Here the type is file and the filter is not file
      // { mime: {$contains: ['image', 'video'] }}
      if (['image', 'video'].includes(value[0]) && ['image', 'video'].includes(value[1])) {
        value = 'file';
        displayedOperator = '$ne';
      }
    }

    return (
      <FilterTag
        // eslint-disable-next-line react/no-array-index-key
        key={`${attributeName}-${i}`}
        attribute={attribute}
        filter={filter}
        onClick={handleClick}
        operator={displayedOperator}
        value={value}
      />
    );
  });
};

FilterList.defaultProps = {
  filtersSchema: [],
};

FilterList.propTypes = {
  appliedFilters: PropTypes.array.isRequired,
  filtersSchema: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      metadatas: PropTypes.shape({ label: PropTypes.string }),
      fieldSchema: PropTypes.shape({
        type: PropTypes.string,
        mainField: PropTypes.shape({
          name: PropTypes.string,
          type: PropTypes.string,
        }),
      }),
    })
  ),
  onRemoveFilter: PropTypes.func.isRequired,
};

export default FilterList;
