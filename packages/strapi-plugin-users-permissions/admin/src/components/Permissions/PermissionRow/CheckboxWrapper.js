/* eslint-disable indent */
import styled from 'styled-components';
import PolicyWrapper from './SubCategory/PolicyWrapper';

const CheckboxWrapper = styled.div`
  display: flex;
  justify-content: space-between;
  min-width: 50%;
  padding: 0.9rem;
  height: 3.6rem;
  position: relative;
  ${PolicyWrapper} {
    opacity: 0;
    > svg {
      align-self: center;
      font-size: 1.4rem;
      color: ${({ theme }) => theme.main.colors.greyDark};
    }
    cursor: pointer;
  }
  &:hover {
    ${PolicyWrapper} {
      opacity: 1;
    }
    background-color: ${({ theme }) => theme.main.colors.mediumGrey};
  }
  ${({ isActive, theme }) =>
    isActive &&
    `
    ${PolicyWrapper} {
        opacity: 1;
      }
    background-color: ${theme.main.colors.mediumGrey};
  `}
`;

export default CheckboxWrapper;
