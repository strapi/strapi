import styled from 'styled-components';
import { Box } from '@strapi/design-system/Box';

const BoxWrapper = styled(Box)`
  width: 100%;
  height: 100%;
  border: 1px solid ${({ theme }) => theme.colors.neutral200};
  text-align: left;
  &:hover {
    background: ${({ theme }) => theme.colors.primary100};
    border: 1px solid ${({ theme }) => theme.colors.primary200};
  }
`;

export default BoxWrapper;
