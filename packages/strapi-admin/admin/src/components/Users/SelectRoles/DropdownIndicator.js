import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import styled from 'styled-components';
import PropTypes from 'prop-types';

const Wrapper = styled.div`
  height: 100%;
  width: 32px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  background: #fafafb;
  > svg {
    align-self: center;
    font-size: 11px;
    color: #b3b5b9;
  }
`;

const DropdownIndicator = ({ selectProps: { menuIsOpen } }) => {
  const icon = menuIsOpen ? 'caret-up' : 'caret-down';

  return (
    <Wrapper>
      <FontAwesomeIcon icon={icon} />
    </Wrapper>
  );
};

DropdownIndicator.propTypes = {
  selectProps: PropTypes.shape({
    menuIsOpen: PropTypes.bool.isRequired,
  }).isRequired,
};

export default DropdownIndicator;
