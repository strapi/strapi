import React from 'react';
import { Box, Tag } from '@strapi/parts';
import { Close } from '@strapi/icons';
import { useQueryParams } from '@strapi/helper-plugin';

const FilterList = () => {
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
      const name = Object.keys(filter)[0];
      const filterType = Object.keys(filter[name])[0];
      const value = filter[name][filterType];

      return (
        // eslint-disable-next-line react/no-array-index-key
        <Box key={`${name}-${i}`} padding={1} onClick={() => handleClick(filter)}>
          <Tag icon={<Close />}>
            {name} {filterType} {value}
          </Tag>
        </Box>
      );
    }) || null
  );
};

export default FilterList;
