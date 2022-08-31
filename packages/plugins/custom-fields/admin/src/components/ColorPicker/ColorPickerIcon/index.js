import React from 'react';
import styled from 'styled-components';
import { Icon } from '@strapi/design-system/Icon';
import { Box } from '@strapi/design-system/Box';
import Paint from '@strapi/icons/Paint';

const IconBox = styled(Box)`
  background-color: ${({ theme }) => theme.colors.primary100};
  border: 1px solid ${({ theme }) => theme.colors.primary200};
  width: ${({ theme }) => theme.spaces[7]};
  height: ${({ theme }) => theme.spaces[6]};
  border-radius: 3px;
  display: flex;
  justify-content: center;
  align-items: center;
`;

const ColorPickerIcon = () => {
  return (
    <IconBox aria-hidden>
      <Icon as={Paint} color="primary600" />
    </IconBox>
  );
};

export default ColorPickerIcon;
