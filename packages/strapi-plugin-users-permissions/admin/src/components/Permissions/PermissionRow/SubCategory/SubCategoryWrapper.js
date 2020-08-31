/* eslint-disable indent */
import styled from 'styled-components';

const SubCategoryWrapper = styled.div`
  padding-bottom: 0.8rem;
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

export default SubCategoryWrapper;
