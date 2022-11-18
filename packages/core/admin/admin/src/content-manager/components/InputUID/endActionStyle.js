import styled, { keyframes } from 'styled-components';
import { Box, Flex, FieldAction } from '@strapi/design-system';

export const EndActionWrapper = styled(Box)`
  position: relative;
`;

export const FieldActionWrapper = styled(FieldAction)`
  svg {
    height: 1rem;
    width: 1rem;
    path {
      fill: ${({ theme }) => theme.colors.neutral400};
    }
  }

  svg:hover {
    path {
      fill: ${({ theme }) => theme.colors.primary600};
    }
  }
`;

export const TextValidation = styled(Flex)`
  position: absolute;
  right: ${({ theme }) => theme.spaces[6]};
  width: 100px;
  pointer-events: none;

  svg {
    margin-right: ${({ theme }) => theme.spaces[1]};
    height: ${12 / 16}rem;
    width: ${12 / 16}rem;
    path {
      fill: ${({ theme, notAvailable }) =>
        !notAvailable ? theme.colors.success600 : theme.colors.danger600};
    }
  }
`;

const rotation = keyframes`
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(359deg);
  }
`;

export const LoadingWrapper = styled(Flex)`
  animation: ${rotation} 2s infinite linear;
`;
