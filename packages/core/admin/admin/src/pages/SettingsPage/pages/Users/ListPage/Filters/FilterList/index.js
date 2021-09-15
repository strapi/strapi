import React from 'react';
import PropTypes from 'prop-types';
import get from 'lodash/get';
import { Box, Tag } from '@strapi/parts';
import { Close } from '@strapi/icons';
import { useQueryParams } from '@strapi/helper-plugin';
import { useIntl } from 'react-intl';

const FilterList = ({ availableFilters }) => {
  const [{ query }, setQuery] = useQueryParams();
  const { formatMessage } = useIntl();

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
      const fieldName = Object.keys(filter)[0];
      const field = availableFilters.find(({ name }) => name === fieldName);

      let filterType = Object.keys(filter[fieldName])[0];
      let value = filter[fieldName][filterType];

      if (field.fieldSchema.type === 'relation') {
        const relationFieldName = field.fieldSchema.mainField.name;

        filterType = Object.keys(get(filter, [field.name, field.fieldSchema.mainField.name]))[0];

        value = get(filter, [field.name, relationFieldName, filterType]);
      }

      return (
        // eslint-disable-next-line react/no-array-index-key
        <Box key={`${fieldName}-${i}`} padding={1} onClick={() => handleClick(filter)}>
          <Tag icon={<Close />}>
            {fieldName}&nbsp;
            {formatMessage({
              id: `components.FilterOptions.FILTER_TYPES.${filterType}`,
              defaultMessage: filterType,
            })}
            &nbsp;
            {value}
          </Tag>
        </Box>
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
