import React from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { FilterIcon, generateFiltersFromSearch } from 'strapi-helper-plugin';

import generateNewFilters from './utils/generateNewFilters';

import FiltersCard from './FiltersCard';
import Picker from '../Picker';

const FiltersPicker = ({ onChange }) => {
  const { search } = useLocation();
  const filters = generateFiltersFromSearch(search);

  const handleChange = ({ target: { value } }) => {
    onChange({ target: { name: 'filters', value: generateNewFilters(filters, value) } });
  };

  return (
    <Picker
      renderButtonContent={() => (
        <>
          <FilterIcon />
          <FormattedMessage id="app.utils.filters" />
        </>
      )}
      renderSectionContent={onToggle => (
        <FiltersCard
          onChange={e => {
            handleChange(e);
            onToggle();
          }}
        />
      )}
    />
  );
};

FiltersPicker.defaultProps = {
  onChange: () => {},
};

FiltersPicker.propTypes = {
  onChange: PropTypes.func,
};

export default FiltersPicker;
