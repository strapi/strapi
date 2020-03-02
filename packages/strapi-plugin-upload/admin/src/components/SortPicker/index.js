import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import { FormattedMessage } from 'react-intl';

import { Carret } from '@buffetjs/icons';
import getTrad from '../../utils/getTrad';
import useOutsideClick from '../../hooks/useOutsideClick';

import DropdownButton from '../DropdownButton';
import DropdownSection from '../DropdownSection';
import SortList from '../SortList';
import Wrapper from './Wrapper';

const SortPicker = ({ onChange, value }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef();

  useOutsideClick(dropdownRef, () => {
    if (isOpen) {
      setIsOpen(false);
    }
  });

  const orders = {
    created_at_asc: 'created_at:ASC',
    created_at_desc: 'created_at:DESC',
    name_asc: 'name:ASC',
    name_desc: 'name:DESC',
    updated_at_asc: 'updated_at:ASC',
    updated_at_desc: 'updated_at:DESC',
  };

  const handleChange = value => {
    onChange({ target: { name: '_sort', value } });

    hangleToggle();
  };

  const hangleToggle = () => {
    setIsOpen(v => !v);
  };

  return (
    <Wrapper>
      <DropdownButton onClick={hangleToggle} isActive={isOpen}>
        <FormattedMessage id={getTrad('sort.label')} />
        <Carret fill={isOpen ? '#007EFF' : '#292b2c'} />
      </DropdownButton>
      <DropdownSection isOpen={isOpen} ref={dropdownRef}>
        <SortList
          isShown={isOpen}
          list={orders}
          selectedItem={value}
          onClick={handleChange}
        />
      </DropdownSection>
    </Wrapper>
  );
};

SortPicker.defaultProps = {
  onChange: () => {},
  value: null,
};

SortPicker.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.string,
};

export default SortPicker;
