import { Box, BoxComponent, Flex, FlexComponent } from '@strapi/design-system';
import { styled } from 'styled-components';

const Wrapper = styled<BoxComponent>(Box)`
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

const IconWrapper = styled<BoxComponent<'button'>>(Box)<{ $isSelected: boolean }>`
  background: ${({ theme, $isSelected }) => theme.colors[$isSelected ? 'primary100' : 'neutral0']};
  border: 1px solid
    ${({ theme, $isSelected }) => theme.colors[$isSelected ? 'primary700' : 'neutral200']};
  border-radius: ${({ theme }) => theme.borderRadius};
  z-index: 1;
  flex: 0 0 2.4rem;
  svg {
    width: 2.4rem;
    height: 2.4rem;
    max-width: unset;
    path {
      fill: ${({ theme, $isSelected }) => theme.colors[$isSelected ? 'primary700' : 'neutral500']};
    }
  }
  &:disabled {
    cursor: not-allowed;
  }
`;

const InfosWrapper = styled<FlexComponent>(Flex)`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
`;

export { IconWrapper, InfosWrapper, Wrapper };
