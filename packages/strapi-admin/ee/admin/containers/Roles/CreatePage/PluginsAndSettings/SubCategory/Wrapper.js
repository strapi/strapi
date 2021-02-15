/* eslint-disable indent */
import styled from 'styled-components';

const Wrapper = styled.div`
  padding-bottom: 2.6rem;
  input[type='checkbox'] {
    &:after {
      color: ${({ theme }) => theme.main.colors.mediumBlue};
    }
  }
  ${({ disabled, theme }) =>
    disabled &&
    `
    label {
      cursor: default !important;
      color: ${theme.main.colors.grey};
    }
    input[type='checkbox'] {
        &:after {
          color: ${theme.main.colors.grey};
        }
      }
    `}
`;

export default Wrapper;
