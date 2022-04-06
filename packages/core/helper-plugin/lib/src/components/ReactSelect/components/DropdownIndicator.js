import React from 'react';
import styled from 'styled-components';
import CarretDown from '@strapi/icons/CarretDown';
import IconBox from './IconBox';

export const CarretBox = styled(IconBox)`
  display: flex;
  background: none;
  border: none;

  svg {
    width: ${6 / 16}rem;
  }
`;

const DropdownIndicator = () => {
  return (
    <CarretBox as="button" type="button" paddingRight={3}>
      <CarretDown />
    </CarretBox>
  );
};

export default DropdownIndicator;
