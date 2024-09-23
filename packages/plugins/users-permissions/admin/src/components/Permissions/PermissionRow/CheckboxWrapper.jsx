import { Box } from '@strapi/design-system';
import { styled, css } from 'styled-components';

const activeCheckboxWrapperStyles = css`
  background: ${(props) => props.theme.colors.primary100};

  #cog {
    opacity: 1;
  }
`;

const CheckboxWrapper = styled(Box)`
  display: flex;
  justify-content: space-between;
  align-items: center;

  #cog {
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
