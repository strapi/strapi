import React from 'react';
import styled from 'styled-components';

import DropdownIcon from '@strapi/icons/FilterDropdownIcon';
import IconBox from './IconBox';

export const CaretBox = styled(IconBox)`
  display: flex;
  background: none;
  border: none;

  svg {
    width: ${6 / 16}rem;
  }
`;

const DropdownIndicator = () => {
  return (
    <CaretBox as="button" type="button" paddingRight={3}>
      <DropdownIcon />
    </CaretBox>
  );
};

export default DropdownIndicator;
