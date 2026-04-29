import { Flex, inputFocusStyle } from '@strapi/design-system';
import { styled } from 'styled-components';

const Wrapper = styled(Flex)`
  position: relative;
  align-items: stretch;
  flex-wrap: wrap;

  label {
    cursor: pointer;
    user-select: none;
    flex: 1 1 calc(50% - ${({ theme }) => theme.spaces[2]});
    min-width: 220px;

    ${inputFocusStyle() as any}
  }

  @media (max-width: 62rem) {
    label {
      flex-basis: 100%;
    }
  }

  input {
    position: absolute;
    opacity: 0;
  }

  .option {
    height: 100%;
    will-change: transform, opacity;
    background: ${({ theme }) => theme.colors.neutral0};
    border: 1px solid ${({ theme }) => theme.colors.neutral200};
    border-radius: ${({ theme }) => theme.borderRadius};

    .checkmark {
      position: relative;
      display: block;
      will-change: transform;
      background: ${({ theme }) => theme.colors.neutral0};
      width: ${({ theme }) => theme.spaces[5]};
      height: ${({ theme }) => theme.spaces[5]};
      border: solid 1px ${({ theme }) => theme.colors.neutral300};
      border-radius: 50%;

      &:before,
      &:after {
        content: '';
        display: block;
        border-radius: 50%;
        width: ${({ theme }) => theme.spaces[3]};
        height: ${({ theme }) => theme.spaces[3]};
        position: absolute;
        top: 3px;
        left: 3px;
      }

      &:after {
        transform: scale(0);
        transition: inherit;
        will-change: transform;
      }
    }
  }

  .container input:checked ~ div {
    background: ${({ theme }) => theme.colors.primary100};
    color: ${({ theme }) => theme.colors.primary600};
    .checkmark {
      border: solid 1px ${({ theme }) => theme.colors.primary600};
      &::after {
        background: ${({ theme }) => theme.colors.primary600};
        transform: scale(1);
      }
    }
  }
`;

export { Wrapper };
