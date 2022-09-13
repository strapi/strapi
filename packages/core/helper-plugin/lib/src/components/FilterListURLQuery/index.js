/**
 *
 * FilterListURLQuery
 *
 */

import React from 'react';
import PropTypes from 'prop-types';
import useQueryParams from '../../hooks/useQueryParams';
import AttributeTag from './AttributeTag';

const FilterListURLQuery = ({ filtersSchema }) => {
  const [{ query }, setQuery] = useQueryParams();

  const handleClick = (filter) => {
    const nextFilters = query.filters.$and.filter((prevFilter) => {
      const name = Object.keys(filter)[0];
      const filterType = Object.keys(filter[name])[0];
      const value = filter[name][filterType];

      return prevFilter[name]?.[filterType] !== value;
    });

    setQuery({ filters: { $and: nextFilters }, page: 1 });
  };

  return (
    query?.filters?.$and.map((filter, i) => {
      const attributeName = Object.keys(filter)[0];
      const attribute = filtersSchema.find(({ name }) => name === attributeName);

      if (!attribute) {
        return null;
      }

      if (attribute.fieldSchema.type === 'relation') {
        const relationTargetAttribute = attribute.fieldSchema.mainField.name;
        const filterObj = filter[attributeName][relationTargetAttribute];
        const operator = Object.keys(filterObj)[0];
        const value = filterObj[operator];

        return (
          <AttributeTag
            // eslint-disable-next-line react/no-array-index-key
            key={`${attributeName}-${i}`}
            attribute={attribute}
            filter={filter}
            onClick={handleClick}
            operator={operator}
            value={value}
          />
        );
      }

      const filterObj = filter[attributeName];
      const operator = Object.keys(filterObj)[0];
      const value = filterObj[operator];

      return (
        <AttributeTag
          // eslint-disable-next-line react/no-array-index-key
          key={`${attributeName}-${i}`}
          attribute={attribute}
          filter={filter}
          onClick={handleClick}
          operator={operator}
          value={value}
        />
      );
    }) || null
  );
};

FilterListURLQuery.defaultProps = {
  filtersSchema: [],
};

FilterListURLQuery.propTypes = {
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
};

export default FilterListURLQuery;
