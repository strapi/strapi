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
  renderButtonContent: () => {},
  renderSectionContent: () => {},
};

Picker.propTypes = {
  renderButtonContent: PropTypes.func,
  renderSectionContent: PropTypes.func,
};

export default Picker;
