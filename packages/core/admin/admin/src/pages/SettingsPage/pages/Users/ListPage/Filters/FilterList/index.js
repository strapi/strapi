import React from 'react';
import PropTypes from 'prop-types';
import { useQueryParams } from '@strapi/helper-plugin';
import AttributeTag from './AttributeTag';

const FilterList = ({ availableFilters }) => {
  const [{ query }, setQuery] = useQueryParams();

  const handleClick = filter => {
    const nextFilters = query.filters.$and.filter(f => {
      const name = Object.keys(filter)[0];
      const filterType = Object.keys(filter[name])[0];
      const value = filter[name][filterType];

      return f[name]?.[filterType] !== value;
    });

    setQuery({ filters: { $and: nextFilters }, page: 1 });
  };

  return (
    query.filters?.$and.map((filter, i) => {
      const attributeName = Object.keys(filter)[0];
      const attribute = availableFilters.find(({ name }) => name === attributeName);

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

FilterList.defaultProps = {
  availableFilters: [],
};

FilterList.propTypes = {
  availableFilters: PropTypes.arrayOf(
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

export default FilterList;
