import React from 'react';
import { IconButton } from '@strapi/design-system';
import Minus from '@strapi/icons/Minus';
import styled from 'styled-components';
import pxToRem from '../../utils/pxToRem';

const StyledIconButton = styled(IconButton)(
  ({ theme }) => `
  border-radius: ${pxToRem(30)};
  width: ${pxToRem(20)};
  height: ${pxToRem(20)};
  padding: ${pxToRem(3)};
  align-items: center;
  justify-content: center;
  svg {
    width: ${pxToRem(8)};
    rect {
      fill: ${theme.colors.primary600}
    }
  }
`
);

const RemoveRoundedButton = (props) => <StyledIconButton icon={<Minus />} {...props} />;

export default RemoveRoundedButton;
