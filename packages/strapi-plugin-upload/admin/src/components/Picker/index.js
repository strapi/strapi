import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';

import { useClickAwayListener } from '@buffetjs/hooks';

import DropdownButton from '../DropdownButton';
import DropdownSection from '../DropdownSection';
import Wrapper from './Wrapper';

const Picker = ({ renderButtonContent, renderSectionContent }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef();

  useClickAwayListener(dropdownRef, () => setIsOpen(false));

  const handleToggle = () => {
    setIsOpen(v => !v);
  };

  return (
    <Wrapper ref={dropdownRef}>
      <DropdownButton onClick={handleToggle} isActive={isOpen}>
        {renderButtonContent(isOpen)}
      </DropdownButton>
      <DropdownSection isOpen={isOpen}>{renderSectionContent(handleToggle)}</DropdownSection>
    </Wrapper>
  );
};

Picker.defaultProps = {
  onChange: () => {},
  value: null,
};

Picker.propTypes = {
  onChange: PropTypes.func,
  value: PropTypes.string,
};

export default Picker;
