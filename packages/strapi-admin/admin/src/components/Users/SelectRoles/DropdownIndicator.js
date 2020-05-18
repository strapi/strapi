import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Flex } from '@buffetjs/core';
import styled from 'styled-components';
import PropTypes from 'prop-types';

const Wrapper = styled(Flex)`
  height: 100%;
  width: 32px;
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

Wrapper.defaultProps = {
  flexDirection: 'column',
  justifyContent: 'center',
};

export default DropdownIndicator;
