import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { isObject } from 'lodash';
import { FormattedMessage } from 'react-intl';
import { FilterIcon } from 'strapi-helper-plugin';

import useOutsideClick from '../../hooks/useOutsideClick';

import DropdownButton from '../DropdownButton';
import DropdownSection from '../DropdownSection';

import Wrapper from './Wrapper';
import FiltersCard from '../FiltersCard';

const FiltersPicker = ({ filters, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef();

  useOutsideClick(dropdownRef, () => {
    if (isOpen) {
      setIsOpen(false);
    }
  });

  const handleChange = ({ target: { value } }) => {
    if (value.value) {
      let formattedValue = value;

      if (value.value._isAMomentObject === true) {
        formattedValue.value = moment(value.value).format();
      } else if (isObject(value)) {
        formattedValue.value = Object.values(value.value).join('');
      }

      onChange({ target: { value: formattedValue } });
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
        <FiltersCard onChange={handleChange} filters={filters} />
      </DropdownSection>
    </Wrapper>
  );
};

FiltersPicker.defaultProps = {
  filters: {},
  onChange: () => {},
};

FiltersPicker.propTypes = {
  filters: PropTypes.object,
  onChange: PropTypes.func,
};

export default FiltersPicker;
