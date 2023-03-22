import styled, { css } from 'styled-components';
import { Box } from '@strapi/design-system';

const activeCheckboxWrapperStyles = css`
  background: ${(props) => props.theme.colors.primary100};
  svg {
    opacity: 1;
  }
`;

const CheckboxWrapper = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;

  svg {
    opacity: 0;
    path {
      fill: ${(props) => props.theme.colors.primary600};
    }
  }

  /* Show active style both on hover and when the action is selected */
  ${(props) => props.isActive && activeCheckboxWrapperStyles}
  &:hover {
    ${activeCheckboxWrapperStyles}
  }
`;

export default CheckboxWrapper;
