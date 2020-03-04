import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { some } from 'lodash';
import { useLocation } from 'react-router-dom';
import moment from 'moment';
import { FormattedMessage } from 'react-intl';
import { FilterIcon, generateFiltersFromSearch } from 'strapi-helper-plugin';
import { useClickAwayListener } from '@buffetjs/hooks';

import FiltersCard from './FiltersCard';
import Picker from '../Picker';

const FiltersPicker = ({ onChange }) => {
  const { search } = useLocation();
  const dropdownRef = useRef();
  const filters = generateFiltersFromSearch(search);

  useClickAwayListener(dropdownRef, () => setIsOpen(false));

  const handleChange = ({ target: { value } }) => {
    let formattedValue = value;

    // moment format if datetime value
    if (value.value._isAMomentObject === true) {
      formattedValue.value = moment(value.value).format();
    }

    // Send updated filters
    if (!some(filters, formattedValue)) {
      filters.push(formattedValue);

      onChange({ target: { name: 'filters', value: filters } });
    }
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
