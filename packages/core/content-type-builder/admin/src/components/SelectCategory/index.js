/**
 *
 * SelectCategory
 *
 */

import React from 'react';
import { useIntl } from 'react-intl';
import PropTypes from 'prop-types';
import { Select, Option } from '@strapi/parts/Select';
import useDataManager from '../../hooks/useDataManager';

// FIXME replace with Creatable Combobox
const SelectCategory = ({ error, intlLabel, name, onChange, value }) => {
  const { formatMessage } = useIntl();
  const { allComponentsCategories } = useDataManager();

  const errorMessage = error ? formatMessage({ id: error, defaultMessage: error }) : '';
  const label = formatMessage(intlLabel);

  return (
    <Select
      error={errorMessage}
      label={label}
      id={name}
      name={name}
      onChange={value => {
        onChange({ target: { name, value, type: 'select-category' } });
      }}
      value={value || ''}
    >
      {allComponentsCategories.map(category => {
        return (
          <Option key={category} value={category}>
            {category}
          </Option>
        );
      })}
    </Select>
  );
};

SelectCategory.defaultProps = {
  error: null,
  value: null,
};

SelectCategory.propTypes = {
  error: PropTypes.string,
  intlLabel: PropTypes.shape({
    id: PropTypes.string.isRequired,
    defaultMessage: PropTypes.string.isRequired,
    values: PropTypes.object,
  }).isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.string,
};

export default SelectCategory;
