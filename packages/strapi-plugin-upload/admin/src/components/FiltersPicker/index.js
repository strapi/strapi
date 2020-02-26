import React, { useState } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { FormattedMessage } from 'react-intl';
import { FilterIcon } from 'strapi-helper-plugin';

import DropdownButton from '../DropdownButton';
import DropdownSection from '../DropdownSection';

import Wrapper from './Wrapper';
import FiltersCard from '../FiltersCard';

const FiltersPicker = ({ filters, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = ({ target: { value } }) => {
    if (value.value) {
      let formattedValue = value;

      if (value.value._isAMomentObject === true) {
        formattedValue.value = moment(
          value.value,
          'YYYY-MM-DD HH:mm:ss'
        ).format();
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
      <DropdownSection isOpen={isOpen}>
        <FiltersCard onChange={handleChange} filters={filters} />
      </DropdownSection>
    </Wrapper>
  );
};

FiltersPicker.defaultProps = {
  filters: [],
  onChange: () => {},
};

FiltersPicker.propTypes = {
  filters: PropTypes.arrayOf(
    PropTypes.shape({
      name: PropTypes.string.isRequired,
      filter: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    })
  ),
  onChange: PropTypes.func,
};

export default FiltersPicker;
