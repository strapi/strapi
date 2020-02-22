import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';
import { FilterIcon } from 'strapi-helper-plugin';

import DropdownButton from '../DropdownButton';
import DropdownSection from '../DropdownSection';

import Wrapper from './Wrapper';
import FiltersCard from '../FiltersCard';

// TODO - MOVE IN THE HELPER PLUGIN TO BE USED IN THE CTM TOO
const FiltersPicker = ({ onChange }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleChange = value => {
    onChange({ target: { value } });

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
        <FiltersCard handleChange={handleChange} />
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
