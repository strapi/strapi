import { Box } from '@strapi/design-system';
import { styled } from 'styled-components';

export const OptionBoxWrapper = styled(Box)`
  width: 100%;
  height: 100%;
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  text-align: left;
  &:hover {
    cursor: pointer;
    background: ${({ theme }) => theme.colors.primary100};
    border: 1px solid ${({ theme }) => theme.colors.primary200};
  }
`;
