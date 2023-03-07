import styled from 'styled-components';
import { Box, Flex } from '@strapi/design-system';

const Wrapper = styled(Box)`
  position: relative;
  width: 100%;
  &::before {
    content: '';
    position: absolute;
    top: calc(50% - 0px);
    height: 2px;
    width: 100%;
    background-color: ${({ theme }) => theme.colors.primary600};
    z-index: 0;
  }
`;

const IconWrapper = styled(Box)`
  background: ${({ theme, isSelected }) => theme.colors[isSelected ? 'primary100' : 'neutral0']};
  border: 1px solid
    ${({ theme, isSelected }) => theme.colors[isSelected ? 'primary700' : 'neutral200']};
  border-radius: ${({ theme }) => theme.borderRadius};
  z-index: 1;
  svg {
    width: 1.5rem;
    height: 100%;
    path {
      fill: ${({ theme, isSelected }) => theme.colors[isSelected ? 'primary700' : 'neutral500']};
    }
  }
  &:disabled {
    cursor: not-allowed;
  }
`;

const InfosWrapper = styled(Flex)`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
`;

export { IconWrapper, InfosWrapper, Wrapper };
