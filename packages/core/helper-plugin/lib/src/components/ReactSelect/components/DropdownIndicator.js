import React from 'react';
import styled from 'styled-components';
import { CarretDown } from '@strapi/icons';
import IconBox from './IconBox';

export const CarretBox = styled(IconBox)`
  display: flex;
  background: none;
  border: none;

  svg {
    width: ${9 / 16}rem;
  }
`;

/**
 * These props come from `react-select`.
 */
// eslint-disable-next-line react/prop-types
const DropdownIndicator = ({ innerRef, innerProps }) => {
  return (
    <CarretBox ref={innerRef} paddingRight={3} {...innerProps}>
      <CarretDown />
    </CarretBox>
  );
};

export default DropdownIndicator;
