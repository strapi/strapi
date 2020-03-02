import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { some } from 'lodash';
import { useLocation } from 'react-router-dom';
import moment from 'moment';
import { FormattedMessage } from 'react-intl';
import { FilterIcon, generateFiltersFromSearch } from 'strapi-helper-plugin';

import useOutsideClick from '../../hooks/useOutsideClick';

import DropdownButton from '../DropdownButton';
import DropdownSection from '../DropdownSection';

import Wrapper from './Wrapper';
import FiltersCard from '../FiltersCard';

const FiltersPicker = ({ onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const { search } = useLocation();
  const dropdownRef = useRef();
  const filters = generateFiltersFromSearch(search);

  useOutsideClick(dropdownRef, () => {
    if (isOpen) {
      setIsOpen(false);
    }
  });

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

    hangleToggle();
  };

  const hangleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <Wrapper>
      <DropdownButton onClick={hangleToggle} isActive={isOpen}>
        <FilterIcon />
        <FormattedMessage id="app.utils.filters" />
      </DropdownButton>
      <DropdownSection isOpen={isOpen} ref={dropdownRef}>
        <FiltersCard onChange={handleChange} />
      </DropdownSection>
    </Wrapper>
  );
};

FiltersPicker.defaultProps = {
  onChange: () => {},
};

FiltersPicker.propTypes = {
  onChange: PropTypes.func,
};

export default FiltersPicker;
